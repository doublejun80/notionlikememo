const { app, BrowserWindow, nativeImage, nativeTheme, shell } = require("electron");
const { spawnSync } = require("node:child_process");
const { createServer } = require("node:http");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let mainWindow;
let nextServer;
const sessionToken = process.env.NODIARY_SESSION_TOKEN || randomUUID();

app.setName("Nodiary");

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
  configurePackagedDatabase();

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

function configurePackagedDatabase() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const databasePath = path.join(app.getPath("userData"), "nodiary.db");

  process.env.DATABASE_URL = `file:${databasePath}`;
  process.env.NODIARY_SESSION_TOKEN = sessionToken;

  ensurePackagedDatabaseSchema();
}

function ensurePackagedDatabaseSchema() {
  if (!app.isPackaged) {
    return;
  }

  const prismaCliPath = resolvePackagedPath("node_modules", "prisma", "build", "index.js");
  const schemaPath = resolvePackagedPath("prisma", "schema.prisma");

  if (!fs.existsSync(prismaCliPath) || !fs.existsSync(schemaPath)) {
    console.warn("Nodiary packaged database bootstrap skipped: Prisma files missing.");
    return;
  }

  const result = spawnSync(
    process.execPath,
    [prismaCliPath, "db", "push", "--skip-generate", "--schema", schemaPath],
    {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
      },
      stdio: "pipe",
      windowsHide: true
    }
  );

  if (result.status !== 0) {
    console.warn(
      `Nodiary packaged database bootstrap failed: ${String(result.stderr || result.error || "")}`
    );
  }
}

function resolvePackagedPath(...segments) {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, ...segments),
    path.join(process.resourcesPath, "app.asar.unpacked", ...segments),
    path.join(process.resourcesPath, "app", ...segments)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function resolveRuntimeIconPath() {
  const candidates = [
    path.join(__dirname, "..", "build", "icon.png"),
    path.join(__dirname, "..", "build", "icon.icns"),
    resolvePackagedPath("build", "icon.png"),
    resolvePackagedPath("build", "icon.icns")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function configureAppIcon() {
  const iconPath = resolveRuntimeIconPath();

  if (!iconPath) {
    return;
  }

  const icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    return;
  }

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }
}

function createMainWindow(appUrl) {
  const appOrigin = new URL(appUrl).origin;

  nativeTheme.themeSource = "light";

  mainWindow = new BrowserWindow({
    title: "Nodiary",
    width: 1440,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#f4f2ee",
    icon: resolveRuntimeIconPath(),
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {
      x: 16,
      y: 18
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
      additionalArguments: [`--nodiary-session-token=${sessionToken}`]
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isSameOrigin(url, appOrigin)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(url);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isSameOrigin(url, appOrigin)) {
      openExternalUrl(url);
    }

    return { action: "deny" };
  });

  mainWindow.loadURL(appUrl);
}

function isSameOrigin(url, expectedOrigin) {
  try {
    return new URL(url).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function openExternalUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return;
  }

  setImmediate(() => {
    shell.openExternal(parsedUrl.toString());
  });
}

app.whenReady().then(async () => {
  process.env.NODIARY_SESSION_TOKEN = sessionToken;
  const appUrl = await resolveAppUrl();

  configureAppIcon();
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
