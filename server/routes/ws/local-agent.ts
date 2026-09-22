import { defineWebSocketHandler } from "nitro/h3";
import type { Peer } from "crossws";

const endpointPath = "/ws/local-agent";
const maxMessageBytes = 256 * 1024;
const heartbeatIntervalMs = 20_000;
const tokenPattern = /^Bearer\s+([^\s]+)$/i;

const getConfiguredToken = () => process.env.JARVIS_WSS_ACCESS_TOKEN?.trim() || "";

const getHeader = (event: Parameters<Parameters<typeof defineWebSocketHandler>[0]>[0], name: string) => {
  const headers = event.req.headers;
  return headers.get(name) || headers.get(name.toLowerCase()) || "";
};

const isAuthorized = (event: Parameters<Parameters<typeof defineWebSocketHandler>[0]>[0]) => {
  const configuredToken = getConfiguredToken();
  if (!configuredToken) return false;

  const authorization = getHeader(event, "authorization");
  const match = authorization.match(tokenPattern);
  return match?.[1] === configuredToken;
};

const safeJsonObject = (text: string): Record<string, unknown> | null => {
  if (new TextEncoder().encode(text).byteLength > maxMessageBytes) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
};

const sendJson = (peer: Peer, payload: Record<string, unknown>) => {
  peer.send(JSON.stringify(payload));
};

export default defineWebSocketHandler((event) => {
  if (event.path !== endpointPath || !isAuthorized(event)) {
    return {
      upgrade: (_request, response) => {
        response.status = 401;
        response.statusText = "Unauthorized";
        return false;
      },
    };
  }

  let heartbeat: ReturnType<typeof setInterval> | undefined;

  return {
    open(peer) {
      heartbeat = setInterval(() => {
        try {
          peer.send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = undefined;
        }
      }, heartbeatIntervalMs);

      sendJson(peer, {
        type: "agent_connected",
        endpoint: endpointPath,
        heartbeat_interval_ms: heartbeatIntervalMs,
      });
    },
    message(peer, message) {
      const payload = safeJsonObject(message.text());
      if (!payload) {
        sendJson(peer, { type: "error", code: "invalid_message" });
        return;
      }

      if (payload.type === "ping") {
        sendJson(peer, { type: "pong", timestamp: new Date().toISOString() });
        return;
      }

      if (payload.type === "agent_hello") {
        sendJson(peer, {
          type: "agent_ack",
          device_id: typeof payload.device_id === "string" ? payload.device_id : null,
        });
        return;
      }

      sendJson(peer, { type: "ack", message_type: typeof payload.type === "string" ? payload.type : "unknown" });
    },
    close() {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = undefined;
    },
    error() {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = undefined;
    },
  };
});
