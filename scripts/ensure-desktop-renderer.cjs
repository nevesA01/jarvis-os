const { cp, mkdir, readFile, rm } = require("node:fs/promises");
const path = require("node:path");

module.exports = async ({ appOutDir }) => {
  const source = path.resolve(__dirname, "..", ".output", "public");
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

  process.stdout.write(`Renderer packaged at ${rendererPath}\n`);
};
