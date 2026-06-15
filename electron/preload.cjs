const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("myplanDesktop", {
  platform: process.platform
});
