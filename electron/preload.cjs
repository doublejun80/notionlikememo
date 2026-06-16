const { contextBridge } = require("electron");

const sessionToken =
  process.argv
    .find((argument) => argument.startsWith("--nodiary-session-token="))
    ?.slice("--nodiary-session-token=".length) ?? "";

const desktopBridge = {
  platform: process.platform,
  sessionToken
};

contextBridge.exposeInMainWorld("nodiaryDesktop", desktopBridge);
contextBridge.exposeInMainWorld("myplanDesktop", desktopBridge);
