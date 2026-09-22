import { defineWebSocketHandler } from "nitro/h3";
import type { Peer } from "crossws";
import { hasPairedDevice, isValidPairingCode, registerPairedDevice } from "../api/pairing.post";

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
  let deviceId: string | null = null;
  let paired = false;

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
        pairing_required: true,
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
        const requestedDeviceId = typeof payload.device_id === "string" ? payload.device_id.trim() : "";
        if (!requestedDeviceId || requestedDeviceId.length > 120 || /[\u0000-\u001f]/.test(requestedDeviceId)) {
          sendJson(peer, { type: "error", code: "invalid_device_id" });
          return;
        }
        deviceId = requestedDeviceId;
        paired = hasPairedDevice(deviceId);
        sendJson(peer, {
          type: "agent_ack",
          device_id: deviceId,
          paired,
          pairing_required: !paired,
        });
        return;
      }

      if (payload.type === "pairing_request") {
        const code = typeof payload.code === "string" ? payload.code.trim() : "";
        if (!deviceId) {
          sendJson(peer, { type: "error", code: "agent_hello_required" });
          return;
        }
        if (!isValidPairingCode(code)) {
          sendJson(peer, { type: "error", code: "invalid_or_expired_pairing_code" });
          return;
        }
        registerPairedDevice(deviceId);
        paired = true;
        sendJson(peer, { type: "pairing_ack", device_id: deviceId, paired: true });
        return;
      }

      if (!paired) {
        sendJson(peer, { type: "error", code: "pairing_required" });
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
