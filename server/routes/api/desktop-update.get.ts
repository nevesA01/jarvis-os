import { defineHandler } from "nitro";
import { getRequestURL } from "nitro/h3";

const currentVersion = process.env.JARVIS_DESKTOP_VERSION?.trim() || "1.0.2";
const installerUrl = process.env.JARVIS_DESKTOP_INSTALLER_URL?.trim() || "https://jarvis.kryontech.com.br/downloads/Jarvis-OS-Setup-latest.exe";

export default defineHandler((event) => {
  const requestUrl = getRequestURL(event);
  return {
    product: "Jarvis OS",
    version: currentVersion,
    installerUrl,
    releaseNotesUrl: `${requestUrl.origin}/downloads/desktop`,
  };
});
