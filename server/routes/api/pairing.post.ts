import { defineHandler } from "nitro";
import { createError, getRequestHeaders, readBody } from "nitro/h3";
import crypto from "node:crypto";

const pairingTtlMs = 5 * 60 * 1000;
const codePattern = /^\d{6}$/;
const accessToken = () => process.env.JARVIS_WSS_ACCESS_TOKEN?.trim() || "";

type PairingRequest = {
  action?: "create" | "revoke";
  deviceId?: string;
};

type PairingCode = {
  code: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
};

const state: {
  active: PairingCode | null;
  pairedDevices: Map<string, { pairedAt: number; lastSeenAt: number }>;
} = {
  active: null,
  pairedDevices: new Map(),
};

const isAuthorized = (event: Parameters<Parameters<typeof defineHandler>[0]>[0]) => {
  const configuredToken = accessToken();
  const authorization = getRequestHeaders(event).authorization || "";
  return Boolean(configuredToken && authorization === `Bearer ${configuredToken}`);
};

const createCode = () => {
  let code = "";
  do {
    code = String(crypto.randomInt(100000, 1000000));
  } while (state.active?.code === code);
  return code;
};

const activeCode = () => {
  if (!state.active || state.active.expiresAt <= Date.now() || state.active.used) {
    state.active = null;
  }
  return state.active;
};

export default defineHandler(async (event) => {
  if (!isAuthorized(event)) {
    throw createError({ statusCode: 401, statusMessage: "Não autorizado" });
  }

  const body = await readBody<PairingRequest>(event).catch(() => ({}));
  if (body.action === "revoke") {
    if (body.deviceId) state.pairedDevices.delete(body.deviceId);
    else state.pairedDevices.clear();
    return { ok: true, revokedDeviceId: body.deviceId || null };
  }

  const now = Date.now();
  const code = createCode();
  state.active = {
    code,
    createdAt: now,
    expiresAt: now + pairingTtlMs,
    used: false,
  };

  return {
    ok: true,
    pairing: {
      code,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + pairingTtlMs).toISOString(),
      expiresInSeconds: pairingTtlMs / 1000,
      oneTime: true,
    },
  };
});

export const pairingState = state;
export const isValidPairingCode = (code: string) => {
  const current = activeCode();
  if (!codePattern.test(code) || !current || current.code !== code) return false;
  current.used = true;
  return true;
};

export const registerPairedDevice = (deviceId: string) => {
  const now = Date.now();
  state.pairedDevices.set(deviceId, { pairedAt: now, lastSeenAt: now });
};

export const hasPairedDevice = (deviceId: string) => {
  const device = state.pairedDevices.get(deviceId);
  if (!device) return false;
  device.lastSeenAt = Date.now();
  return true;
};
