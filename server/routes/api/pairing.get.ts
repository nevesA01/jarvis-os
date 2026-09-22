import { defineHandler } from "nitro";
import { createError, getRequestHeaders } from "nitro/h3";

const accessToken = () => process.env.JARVIS_WSS_ACCESS_TOKEN?.trim() || "";

const isAuthorized = (event: Parameters<Parameters<typeof defineHandler>[0]>[0]) => {
  const configuredToken = accessToken();
  const authorization = getRequestHeaders(event).authorization || "";
  return Boolean(configuredToken && authorization === `Bearer ${configuredToken}`);
};

export default defineHandler((event) => {
  if (!isAuthorized(event)) {
    throw createError({ statusCode: 401, statusMessage: "Não autorizado" });
  }

  return {
    ok: true,
    pairing: {
      endpoint: "/ws/local-agent",
      protocol: "agent_hello + pairing_request",
      expiresInSeconds: 300,
      codeLength: 6,
    },
  };
});
