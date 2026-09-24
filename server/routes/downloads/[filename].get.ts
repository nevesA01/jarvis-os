import { defineHandler } from "nitro";
import { createError, sendStream, setResponseHeader } from "nitro/h3";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const downloadDirectory = () => process.env.JARVIS_DESKTOP_DOWNLOAD_DIR?.trim() || "/app/downloads";
const installerFilename = "Jarvis-OS-Setup-latest.exe";

export default defineHandler(async (event) => {
  const filename = event.context.params?.filename;
  if (filename !== installerFilename) {
    throw createError({ statusCode: 404, statusMessage: "Arquivo não encontrado" });
  }

  const filePath = path.resolve(downloadDirectory(), installerFilename);
  let fileSize: number;
  try {
    fileSize = (await stat(filePath)).size;
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Instalador ainda não foi publicado" });
  }

  setResponseHeader(event, "Content-Type", "application/vnd.microsoft.portable-executable");
  setResponseHeader(event, "Content-Disposition", `attachment; filename="${installerFilename}"`);
  setResponseHeader(event, "Content-Length", String(fileSize));
  setResponseHeader(event, "Cache-Control", "public, max-age=300");
  return sendStream(event, createReadStream(filePath));
});
