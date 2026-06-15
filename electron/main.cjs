const { app, BrowserWindow, shell } = require("electron");
const { createServer } = require("node:http");
const path = require("node:path");

let mainWindow;
let nextServer;

async function resolveAppUrl() {
  const configuredUrl =
    process.env.NODIARY_DEV_SERVER_URL || process.env.MYPLAN_DEV_SERVER_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!app.isPackaged) {
    return "http://127.0.0.1:3000";
  }

  return startPackagedNextServer();
}

async function startPackagedNextServer() {
  const next = require("next");
  const appPath = app.getAppPath();
  const nextApp = next({
    dev: false,
    dir: appPath
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  nextServer = createServer((request, response) => {
    handle(request, response);
  });

  await new Promise((resolve, reject) => {
    nextServer.once("error", reject);
    nextServer.listen(0, "127.0.0.1", resolve);
  });

  const address = nextServer.address();
  const port = typeof address === "object" && address ? address.port : 3000;

  return `http://127.0.0.1:${port}`;
}

function createMainWindow(appUrl) {
  const appOrigin = new URL(appUrl).origin;

  mainWindow = new BrowserWindow({
    title: "Nodiary",
    width: 1440,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#fbfaf7",
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
    if (new URL(url).origin === appOrigin) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  const appUrl = await resolveAppUrl();

  createMainWindow(appUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(appUrl);
    }
  });
});

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.close();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});
