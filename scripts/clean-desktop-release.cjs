const { rm } = require("node:fs/promises");
const path = require("node:path");

const cleanRelease = async () => {
  await rm(path.resolve(__dirname, "..", "release"), { recursive: true, force: true });
  process.stdout.write("Removed previous desktop release artifacts.\n");
};

cleanRelease().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
