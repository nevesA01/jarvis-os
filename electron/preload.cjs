const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  isDesktop: true,
});
