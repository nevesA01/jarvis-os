const { cp, mkdir, readFile, rm, writeFile } = require("node:fs/promises");
const path = require("node:path");

module.exports = async ({ appOutDir }) => {
  const source = path.resolve(__dirname, "..", "dist", "desktop-renderer");
  const sourceIndex = path.join(source, "index.html");
  await readFile(sourceIndex).catch((error) => {
    throw new Error(`Built renderer is missing at ${sourceIndex}: ${error.message}`);
  });

  const rendererPath = path.join(appOutDir, "resources", "renderer");
  await rm(rendererPath, { recursive: true, force: true });
  await mkdir(path.dirname(rendererPath), { recursive: true });
  await cp(source, rendererPath, { recursive: true });
  const html = await readFile(path.join(rendererPath, "index.html"), "utf8");
  const jsPath = html.match(/<script[^>]+src="([^\"]+\.js)"/)?.[1];
  const cssPath = html.match(/<link[^>]+href="([^\"]+\.css)"/)?.[1];
  if (!jsPath?.startsWith("/assets/") || !cssPath?.startsWith("/assets/")) {
    throw new Error(`Renderer assets are missing from ${rendererPath}/index.html`);
  }
  await Promise.all([
    readFile(path.join(rendererPath, jsPath.slice(1))),
    readFile(path.join(rendererPath, cssPath.slice(1))),
  ]);

  const packageJson = require(path.resolve(__dirname, "..", "package.json"));
  const buildInfoPath = path.resolve(__dirname, "..", "release", "desktop-build.json");
  await mkdir(path.dirname(buildInfoPath), { recursive: true });
  const buildInfo = JSON.stringify({
    commit: process.env.GITHUB_SHA || "local",
    version: packageJson.version,
    rendererHook: true,
    rendererPath,
  }, null, 2);
  await writeFile(buildInfoPath, buildInfo);
  await writeFile(path.join(path.dirname(rendererPath), "desktop-build.json"), buildInfo);
  await writeFile(path.join(path.dirname(appOutDir), "desktop-build.json"), buildInfo);

  process.stdout.write(`Renderer packaged at ${rendererPath}\n`);
};
