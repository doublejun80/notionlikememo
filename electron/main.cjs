const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const devServerUrl = process.env.MYPLAN_DEV_SERVER_URL || "http://127.0.0.1:3000";
const devServerOrigin = new URL(devServerUrl).origin;

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "MyPlan",
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#f7f4ee",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin === devServerOrigin) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(devServerUrl);
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
