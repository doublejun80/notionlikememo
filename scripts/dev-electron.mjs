import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync
} from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

import {
  isServerReachable,
  resolveDevServerUrl,
  waitForServer
} from "./electron-dev-utils.mjs";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const electronMainPath = resolve(projectRoot, "electron/main.cjs");
const electronExecutablePath = resolveElectronExecutablePath();
const devServerUrl = resolveDevServerUrl(process.env);
const sessionToken = process.env.NODIARY_SESSION_TOKEN || randomUUID();
const childEnv = {
  ...process.env,
  NODIARY_SESSION_TOKEN: sessionToken
};

let nextProcess;
let electronProcess;

function getNextDevArgs(url) {
  const parsedUrl = new URL(url);
  const port = parsedUrl.port || "3000";

  return [
    "run",
    "dev",
    "--",
    "--hostname",
    parsedUrl.hostname,
    "--port",
    port
  ];
}

function resolveElectronExecutablePath() {
  if (process.platform !== "darwin") {
    return electronPath;
  }

  return prepareMacDevAppBundle();
}

function prepareMacDevAppBundle() {
  const sourceApp = dirname(dirname(dirname(electronPath)));
  const devBundleRoot = resolve(projectRoot, ".nodiary-electron");
  const devApp = join(devBundleRoot, "Nodiary.app");
  const devExecutable = join(devApp, "Contents", "MacOS", "Nodiary");
  const iconSource = join(projectRoot, "build", "icon.icns");
  const iconTarget = join(devApp, "Contents", "Resources", "nodiary.icns");

  if (shouldRefreshMacDevAppBundle(sourceApp, devApp, iconSource, iconTarget)) {
    rmSync(devApp, { recursive: true, force: true });
    mkdirSync(devBundleRoot, { recursive: true });
    copyMacDevAppBundle(sourceApp, devApp);

    if (existsSync(iconSource)) {
      copyFileSync(iconSource, iconTarget);
    }

    renameMacDevBundleExecutables(devApp);
    updateMacDevBundlePlist(devApp);
  }

  return devExecutable;
}

function copyMacDevAppBundle(sourceApp, devApp) {
  const result = spawnSync("ditto", [sourceApp, devApp], { stdio: "pipe" });

  if (result.status !== 0) {
    throw new Error(`Failed to copy Nodiary dev app bundle: ${String(result.stderr)}`);
  }
}

function shouldRefreshMacDevAppBundle(sourceApp, devApp, iconSource, iconTarget) {
  if (!existsSync(devApp)) {
    return true;
  }

  const sourcePlist = join(sourceApp, "Contents", "Info.plist");
  const targetPlist = join(devApp, "Contents", "Info.plist");

  if (!existsSync(targetPlist)) {
    return true;
  }

  if (!existsSync(join(devApp, "Contents", "MacOS", "Nodiary"))) {
    return true;
  }

  if (!existsSync(join(devApp, "Contents", "Frameworks", "Nodiary Helper.app"))) {
    return true;
  }

  if (hasAbsoluteFrameworkSymlink(devApp)) {
    return true;
  }

  if (existsSync(iconSource) && !existsSync(iconTarget)) {
    return true;
  }

  const targetUpdatedAt = statSync(targetPlist).mtimeMs;

  if (existsSync(sourcePlist) && statSync(sourcePlist).mtimeMs > targetUpdatedAt) {
    return true;
  }

  return existsSync(iconSource) && statSync(iconSource).mtimeMs > targetUpdatedAt;
}

function hasAbsoluteFrameworkSymlink(devApp) {
  const resourcesLink = join(
    devApp,
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Resources"
  );

  try {
    return readlinkSync(resourcesLink).startsWith("/");
  } catch {
    return false;
  }
}

function renameMacDevBundleExecutables(devApp) {
  renamePathIfExists(
    join(devApp, "Contents", "MacOS", "Electron"),
    join(devApp, "Contents", "MacOS", "Nodiary")
  );

  const frameworksPath = join(devApp, "Contents", "Frameworks");
  const helperNames = ["", " (GPU)", " (Plugin)", " (Renderer)"];

  for (const suffix of helperNames) {
    const electronHelperName = `Electron Helper${suffix}`;
    const nodiaryHelperName = `Nodiary Helper${suffix}`;
    const electronHelperApp = join(frameworksPath, `${electronHelperName}.app`);
    const nodiaryHelperApp = join(frameworksPath, `${nodiaryHelperName}.app`);

    renamePathIfExists(electronHelperApp, nodiaryHelperApp);
    renamePathIfExists(
      join(nodiaryHelperApp, "Contents", "MacOS", electronHelperName),
      join(nodiaryHelperApp, "Contents", "MacOS", nodiaryHelperName)
    );
  }
}

function renamePathIfExists(sourcePath, targetPath) {
  if (!existsSync(sourcePath) || sourcePath === targetPath) {
    return;
  }

  rmSync(targetPath, { recursive: true, force: true });
  renameSync(sourcePath, targetPath);
}

function updateMacDevBundlePlist(devApp) {
  const plistPath = join(devApp, "Contents", "Info.plist");
  const replacements = [
    ["CFBundleDisplayName", "Nodiary"],
    ["CFBundleExecutable", "Nodiary"],
    ["CFBundleName", "Nodiary"],
    ["CFBundleIdentifier", "com.nodiary.desktop.dev"],
    ["CFBundleIconFile", "nodiary.icns"]
  ];

  for (const [key, value] of replacements) {
    setPlistString(plistPath, key, value);
  }

  updateMacDevHelperPlists(devApp);
}

function updateMacDevHelperPlists(devApp) {
  const frameworksPath = join(devApp, "Contents", "Frameworks");
  const helperConfigs = [
    ["Nodiary Helper", "com.nodiary.desktop.dev.helper"],
    ["Nodiary Helper (GPU)", "com.nodiary.desktop.dev.helper.gpu"],
    ["Nodiary Helper (Plugin)", "com.nodiary.desktop.dev.helper.plugin"],
    ["Nodiary Helper (Renderer)", "com.nodiary.desktop.dev.helper.renderer"]
  ];

  for (const [helperName, bundleId] of helperConfigs) {
    const plistPath = join(frameworksPath, `${helperName}.app`, "Contents", "Info.plist");

    if (!existsSync(plistPath)) {
      continue;
    }

    setPlistString(plistPath, "CFBundleDisplayName", helperName);
    setPlistString(plistPath, "CFBundleExecutable", helperName);
    setPlistString(plistPath, "CFBundleIdentifier", bundleId);
  }
}

function setPlistString(plistPath, key, value) {
  const replaceResult = spawnSync(
    "plutil",
    ["-replace", key, "-string", value, plistPath],
    { stdio: "pipe" }
  );

  if (replaceResult.status === 0) {
    return;
  }

  const insertResult = spawnSync(
    "plutil",
    ["-insert", key, "-string", value, plistPath],
    { stdio: "pipe" }
  );

  if (insertResult.status !== 0) {
    throw new Error(
      `Failed to update ${key} in Nodiary dev app bundle: ${String(insertResult.stderr)}`
    );
  }
}

function stopChild(child) {
  if (child && !child.killed) {
    child.kill();
  }
}

function shutdown(exitCode = 0) {
  stopChild(electronProcess);
  stopChild(nextProcess);
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (await isServerReachable(devServerUrl)) {
  console.log(`[electron:dev] Reusing Next.js dev server at ${devServerUrl}`);
} else {
  console.log(`[electron:dev] Starting Next.js dev server at ${devServerUrl}`);

  nextProcess = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    getNextDevArgs(devServerUrl),
    {
      cwd: projectRoot,
      env: childEnv,
      stdio: "inherit"
    }
  );

  nextProcess.on("exit", (code) => {
    if (!electronProcess || electronProcess.exitCode === null) {
      console.error(`[electron:dev] Next.js dev server exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });

  await waitForServer(devServerUrl);
}

electronProcess = spawn(electronExecutablePath, [electronMainPath], {
  cwd: projectRoot,
  env: {
    ...childEnv,
    NODIARY_DEV_SERVER_URL: devServerUrl,
    MYPLAN_DEV_SERVER_URL: devServerUrl
  },
  stdio: "inherit"
});

electronProcess.on("exit", (code) => {
  stopChild(nextProcess);
  process.exit(code ?? 0);
});
