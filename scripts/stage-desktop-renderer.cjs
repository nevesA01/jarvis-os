const { cp, rm } = require("node:fs/promises");
const path = require("node:path");

const source = path.resolve(".output", "public");
const destination = path.resolve("dist");

rm(destination, { recursive: true, force: true })
  .then(() => cp(source, destination, { recursive: true }))
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
