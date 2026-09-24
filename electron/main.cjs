const { app, BrowserWindow, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { spawn, execFile } = require("node:child_process");
const { readFile, writeFile, readdir } = require("node:fs/promises");

const HOST = "127.0.0.1";
const PORT = 3211;
const APP_ORIGIN = `http://${HOST}:${PORT}`;
const REMOTE_API = "https://jarvis.kryontech.com.br";
const ASSETS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "renderer")
  : path.join(app.getAppPath(), ".output", "public");
const MAX_BODY_BYTES = 2 * 1024 * 1024;
let authToken = null;
let pairingCode = "";
let pairingExpiresAt = 0;
const usedRequestIds = new Set();

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
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

const requireString = (value, name) => {
  if (typeof value !== "string" || !value.trim() || value.includes("\0")) throw new Error(`invalid_${name}`);
  return value;
};

const newPairingCode = () => {
  pairingCode = String(crypto.randomInt(100000, 1000000));
  pairingExpiresAt = Date.now() + 5 * 60 * 1000;
};

const isAuthorized = (request) => Boolean(authToken && request.headers.authorization === `Bearer ${authToken}`);

const execute = async (payload) => {
  const requestId = requireString(payload.requestId, "request_id");
  if (usedRequestIds.has(requestId)) throw new Error("request_already_used");
  usedRequestIds.add(requestId);
  if (usedRequestIds.size > 500) usedRequestIds.delete(usedRequestIds.values().next().value);

  switch (payload.action) {
    case "read_file": {
      const filePath = requireString(payload.path, "path");
      const content = await readFile(filePath, "utf8");
      return { path: filePath, content };
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
    case "get_system_info":
      return {
        hostname: os.hostname(),
        platform: process.platform,
        release: os.release(),
        arch: os.arch(),
        uptimeSeconds: Math.round(os.uptime()),
        memory: { totalBytes: os.totalmem(), freeBytes: os.freemem() },
      };
    case "open_application": {
      const requestedApplication = requireString(payload.application, "application");
      if (["whatsapp", "whatsapp desktop"].includes(requestedApplication.trim().toLowerCase())) {
        const script = "$app = Get-StartApps | Where-Object { $_.Name -like '*WhatsApp*' } | Select-Object -First 1; if ($null -eq $app) { throw 'WhatsApp não está registrado nos aplicativos do Windows' }; Start-Process -FilePath ('shell:AppsFolder\\' + $app.AppID) -ErrorAction Stop; Write-Output ($app.Name + '|' + $app.AppID)";
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 15000 }, (error, stdout, stderr) => error ? reject(new Error(stderr.trim() || error.message)) : resolve({ stdout, stderr }));
        });
        const [name, appId] = stdout.trim().split("|");
        return { application: name || "WhatsApp", appId: appId || "", started: true, verified: true, launcher: "Windows Start Apps" };
      }
      const args = Array.isArray(payload.args) ? payload.args.map((arg) => requireString(arg, "argument")) : [];
      const child = spawn(requestedApplication, args, { detached: true, stdio: "ignore", shell: false, windowsHide: false });
      await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("spawn", resolve);
      });
      child.unref();
      return { application: requestedApplication, started: true, verified: true };
    }
    case "open_url": {
      const parsed = new URL(requireString(payload.url, "url"));
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid_url_protocol");
      await shell.openExternal(parsed.toString());
      return { url: parsed.toString(), started: true, launcher: "default_browser" };
    }
    case "close_application": {
      const application = requireString(payload.application, "application").replace(/[^a-zA-Z0-9_.-]/g, "");
      return await new Promise((resolve) => {
        execFile("taskkill", ["/IM", application, "/T", "/F"], { windowsHide: true, timeout: 30000 }, (error, stdout, stderr) => resolve({ application, ok: !error, stdout, stderr }));
      });
    }
    case "download_file": {
      const url = requireString(payload.url, "url");
      const destination = requireString(payload.destination, "destination");
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid_url_protocol");
      return await new Promise((resolve, reject) => {
        execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri $args[0] -OutFile $args[1]", url, destination], { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => error ? reject(new Error(stderr || error.message)) : resolve({ url, destination, ok: true, stdout }));
      });
    }
    case "run_command": {
      const command = requireString(payload.command, "command");
      const cwd = payload.workingDirectory ? requireString(payload.workingDirectory, "working_directory") : process.cwd();
      return await new Promise((resolve) => {
        execFile("cmd.exe", ["/d", "/s", "/c", command], { cwd, windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => resolve({ command, workingDirectory: cwd, exitCode: error?.code ?? 0, stdout, stderr, ok: !error }));
      });
    }
    default:
      throw new Error("unsupported_action");
  }
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const serveFrontend = async (request, response, pathname) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const filePath = path.resolve(ASSETS_DIR, `.${decodedPath}`);
  if (filePath !== ASSETS_DIR && !filePath.startsWith(`${ASSETS_DIR}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  let resolvedPath = filePath;
  let contents;
  try {
    contents = await readFile(resolvedPath);
  } catch {
    if (path.extname(decodedPath)) {
      response.writeHead(404).end();
      return;
    }
    resolvedPath = path.join(ASSETS_DIR, "index.html");
    try {
      contents = await readFile(resolvedPath);
    } catch {
      response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" }).end("O Jarvis ainda não foi compilado.");
      return;
    }
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(resolvedPath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": path.basename(resolvedPath) === "index.html" ? "no-cache" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") response.end();
  else response.end(contents);
};

const startDesktopServer = () => new Promise((resolve, reject) => {
  const server = http.createServer(async (request, response) => {
    if (request.headers.host !== `${HOST}:${PORT}`) {
      response.writeHead(403).end();
      return;
    }
    if (request.method === "POST" && request.headers.origin !== APP_ORIGIN) {
      response.writeHead(403).end();
      return;
    }
    const url = new URL(request.url || "/", APP_ORIGIN);
    try {
      if (request.method === "GET" && url.pathname === "/status") {
        if (!authToken && Date.now() > pairingExpiresAt) newPairingCode();
        sendJson(response, 200, { paired: Boolean(authToken), agentName: os.hostname(), pairingCode: authToken ? undefined : pairingCode });
        return;
      }
      if (request.method === "POST" && url.pathname === "/pair") {
        const body = await readJson(request);
        if (Date.now() > pairingExpiresAt) {
          newPairingCode();
          sendJson(response, 410, { error: "Código de pareamento expirado" });
          return;
        }
        if (String(body.pairingCode || "") !== pairingCode) {
          sendJson(response, 401, { error: "Código de pareamento inválido" });
          return;
        }
        authToken = crypto.randomBytes(32).toString("hex");
        pairingCode = "";
        sendJson(response, 200, { token: authToken, agentName: os.hostname() });
        return;
      }
      if (request.method === "POST" && url.pathname === "/disconnect") {
        if (!isAuthorized(request)) {
          sendJson(response, 401, { error: "Não autorizado" });
          return;
        }
        authToken = null;
        usedRequestIds.clear();
        newPairingCode();
        sendJson(response, 200, { ok: true });
        return;
      }
      if (request.method === "POST" && url.pathname === "/execute") {
        if (!isAuthorized(request)) {
          sendJson(response, 401, { error: "Agente não pareado" });
          return;
        }
        sendJson(response, 200, { ok: true, result: await execute(await readJson(request)) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/ai/chat") {
        const body = await readJson(request);
        const upstream = await fetch(`${REMOTE_API}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
        response.writeHead(upstream.status, {
          "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        response.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }
      if (request.method === "GET" || request.method === "HEAD") {
        await serveFrontend(request, response, url.pathname);
        return;
      }
      response.writeHead(404).end();
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : "Falha desconhecida" });
    }
  });
  server.once("error", reject);
  server.listen(PORT, HOST, () => resolve(server));
});

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 920,
    minHeight: 680,
    backgroundColor: "#07111f",
    title: "Jarvis OS",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  await mainWindow.loadURL(APP_ORIGIN);
  return mainWindow;
};

const setupAutoUpdates = (mainWindow) => {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on("update-available", async (update) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Atualização do Jarvis disponível",
      message: `A versão ${update.version} está disponível. Deseja baixar e instalar agora?`,
      buttons: ["Baixar atualização", "Lembrar depois"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (response === 0) autoUpdater.downloadUpdate().catch(() => {});
  });
  autoUpdater.on("update-downloaded", async (update) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Atualização pronta",
      message: `A versão ${update.version} foi baixada. Reinicie o Jarvis para concluir a instalação.`,
      buttons: ["Reiniciar agora", "Mais tarde"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on("error", (error) => {
    console.error("Falha ao verificar ou baixar atualização do Jarvis:", error);
  });
  autoUpdater.checkForUpdates();
};

app.whenReady().then(async () => {
  newPairingCode();
  let server;
  try {
    server = await startDesktopServer();
  } catch (error) {
    dialog.showErrorBox("Jarvis não iniciou", `A porta local ${PORT} já está em uso ou não pode ser aberta. Feche o aplicativo que a ocupa e tente novamente.\n\n${error.message}`);
    app.quit();
    return;
  }
  app.on("before-quit", () => server.close());
  const mainWindow = await createWindow();
  setupAutoUpdates(mainWindow);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
