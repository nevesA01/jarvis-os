const assert = require("node:assert/strict");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const { readFile, stat, rm, readdir } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const execFileAsync = promisify(execFile);
const packageJson = require("../package.json");
const installerPath = path.resolve("release", `Jarvis-OS-Setup-${packageJson.version}.exe`);
const updateInfoPath = path.resolve("release", "latest.yml");
const blockmapPath = `${installerPath}.blockmap`;
const appUrl = "http://127.0.0.1:3211";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const request = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return { status: response.status, body: await response.text() };
};

const stopApp = async (child) => {
  if (!child?.pid || child.exitCode !== null) return;
  await execFileAsync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }).catch(() => {});
};

const run = async () => {
  assert.equal(process.platform, "win32", "The installer smoke test must run on Windows");
  await Promise.all([stat(installerPath), stat(blockmapPath)]);

  const updateInfo = await readFile(updateInfoPath, "utf8");
  assert.match(updateInfo, new RegExp(`^version:\\s*["']?${packageJson.version}`, "m"));
  assert.ok(updateInfo.includes(path.basename(installerPath)), "The update manifest must reference the installer");
  assert.match(updateInfo, /^sha512:\s*\S+/m, "The update manifest must include an installer hash");

  const installPath = path.join(os.tmpdir(), `jarvis-os-smoke-${process.pid}`);
  await rm(installPath, { recursive: true, force: true });
  const installedExecutable = path.join(installPath, "Jarvis OS.exe");
  const resourcesPath = path.join(installPath, "resources");
  let child;
  try {
    await execFileAsync(installerPath, ["/S", `/D=${installPath}\\`], { timeout: 180000, windowsHide: true });
    await stat(installedExecutable);

    const rendererPath = path.join(resourcesPath, "renderer");
    const html = await readFile(path.join(rendererPath, "index.html"), "utf8");
    const jsPath = html.match(/<script[^>]+src="([^\"]+\.js)"/)?.[1];
    const cssPath = html.match(/<link[^>]+href="([^\"]+\.css)"/)?.[1];
    assert.ok(jsPath?.startsWith("/assets/"), "The installed renderer must include its JavaScript bundle");
    assert.ok(cssPath?.startsWith("/assets/"), "The installed renderer must include its stylesheet");
    await stat(path.join(rendererPath, jsPath.slice(1)));
    await stat(path.join(rendererPath, cssPath.slice(1)));

    const appUpdateConfig = await readFile(path.join(resourcesPath, "app-update.yml"), "utf8");
    assert.match(appUpdateConfig, /provider:\s*generic/);
    assert.match(appUpdateConfig, /url:\s*https:\/\/github\.com\/nevesA01\/jarvis-os-updates\/releases\/latest\/download/);

    child = spawn(installedExecutable, ["--disable-gpu"], { stdio: "ignore", windowsHide: false });
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });

    let page;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Installed Jarvis exited before serving the UI (code ${child.exitCode})`);
      try {
        page = await request(appUrl);
        if (page.status === 200) break;
      } catch {
        await wait(1000);
      }
    }

    assert.equal(page?.status, 200, "The installed app must serve its UI on localhost");
    assert.ok(page.body.includes(jsPath), "The served UI must reference its JavaScript bundle");
    assert.ok(page.body.includes(cssPath), "The served UI must reference its stylesheet");

    const [js, css, status] = await Promise.all([
      request(`${appUrl}${jsPath}`),
      request(`${appUrl}${cssPath}`),
      request(`${appUrl}/status`),
    ]);
    assert.equal(js.status, 200, "The installed JavaScript bundle must load");
    assert.ok(js.body.length > 0, "The installed JavaScript bundle must not be empty");
    assert.equal(css.status, 200, "The installed stylesheet must load");
    assert.ok(css.body.length > 0, "The installed stylesheet must not be empty");
    assert.equal(status.status, 200, "The local agent status endpoint must respond");
    assert.equal(JSON.parse(status.body).paired, false, "A fresh install must start unpaired");

    process.stdout.write("Installer smoke test passed: installed app, UI assets, local agent, and update metadata verified.\n");
  } finally {
    await stopApp(child);
    const entries = await readdir(installPath).catch(() => []);
    const uninstaller = entries.find((entry) => /^uninstall.*\.exe$/i.test(entry));
    if (uninstaller) {
      await execFileAsync(path.join(installPath, uninstaller), ["/S"], { timeout: 180000, windowsHide: true }).catch(() => {});
    }
    await wait(1000);
    await rm(installPath, { recursive: true, force: true }).catch(() => {});
  }
};

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
