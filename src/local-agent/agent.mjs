import http from "node:http";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 3210;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const agentName = os.hostname();
let pairingCode = String(crypto.randomInt(100000, 1000000));
let authToken = null;
const usedRequestIds = new Set();

const send = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  let size = 0;
  let body = "";
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_too_large");
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
};

const isAuthorized = (request) => {
  const value = request.headers.authorization || "";
  return Boolean(authToken && value === `Bearer ${authToken}`);
};

const requireString = (value, name) => {
  if (typeof value !== "string" || !value.trim() || value.includes("\0")) {
    throw new Error(`invalid_${name}`);
  }
  return value;
};

const execute = async (payload) => {
  const requestId = requireString(payload.requestId, "request_id");
  if (usedRequestIds.has(requestId)) throw new Error("request_already_used");
  usedRequestIds.add(requestId);
  if (usedRequestIds.size > 500) usedRequestIds.delete(usedRequestIds.values().next().value);

  switch (payload.action) {
    case "read_file": {
      const filePath = requireString(payload.path, "path");
      return { path: filePath, content: await readFile(filePath, "utf8") };
    }
    case "write_file": {
      const filePath = requireString(payload.path, "path");
      if (typeof payload.content !== "string") throw new Error("invalid_content");
      await writeFile(filePath, payload.content, "utf8");
      return { path: filePath, bytes: Buffer.byteLength(payload.content, "utf8") };
    }
    case "list_directory": {
      const directory = requireString(payload.path, "path");
      const entries = await readdir(directory, { withFileTypes: true });
      return { path: directory, entries: entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" })) };
    }
    case "open_application": {
      const application = requireString(payload.application, "application");
      const args = Array.isArray(payload.args) ? payload.args.map((arg) => requireString(arg, "argument")) : [];
      const child = spawn(application, args, { detached: true, stdio: "ignore", shell: false, windowsHide: false });
      child.unref();
      return { application, started: true };
    }
    case "run_command": {
      const command = requireString(payload.command, "command");
      const cwd = payload.workingDirectory ? requireString(payload.workingDirectory, "working_directory") : process.cwd();
      return await new Promise((resolve, reject) => {
        execFile("cmd.exe", ["/d", "/s", "/c", command], { cwd, windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
          resolve({ command, workingDirectory: cwd, exitCode: error?.code ?? 0, stdout, stderr, ok: !error });
        });
      });
    }
    default:
      throw new Error("unsupported_action");
  }
};

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return send(response, 204, {});
  try {
    if (request.method === "GET" && request.url === "/status") {
      return send(response, 200, { paired: Boolean(authToken), agentName, capabilities: ["read_file", "write_file", "list_directory", "open_application", "run_command"] });
    }
    if (request.method === "POST" && request.url === "/pair") {
      const body = await readJson(request);
      if (String(body.pairingCode || "") !== pairingCode) return send(response, 401, { error: "Código de pareamento inválido" });
      authToken = crypto.randomBytes(32).toString("hex");
      return send(response, 200, { token: authToken, agentName });
    }
    if (request.method === "POST" && request.url === "/disconnect") {
      if (!isAuthorized(request)) return send(response, 401, { error: "Não autorizado" });
      authToken = null;
      pairingCode = String(crypto.randomInt(100000, 1000000));
      usedRequestIds.clear();
      return send(response, 200, { ok: true });
    }
    if (request.method === "POST" && request.url === "/execute") {
      if (!isAuthorized(request)) return send(response, 401, { error: "Agente não pareado" });
      const result = await execute(await readJson(request));
      return send(response, 200, { ok: true, result });
    }
    return send(response, 404, { error: "Rota não encontrada" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    return send(response, 400, { ok: false, error: message });
  }
});

server.on("error", (error) => {
  console.error("Falha ao iniciar o agente local:", error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`Jarvis Windows Agent ativo em http://${HOST}:${PORT}`);
  console.log(`Nome do computador: ${agentName}`);
  console.log(`Código de pareamento: ${pairingCode}`);
  console.log("Mantenha esta janela aberta enquanto usar o agente.");
});

process.stdin.resume();
