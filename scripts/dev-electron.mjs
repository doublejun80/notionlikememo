import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import {
  isServerReachable,
  resolveDevServerUrl,
  waitForServer
} from "./electron-dev-utils.mjs";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const electronMainPath = resolve(projectRoot, "electron/main.cjs");
const devServerUrl = resolveDevServerUrl(process.env);

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
      env: process.env,
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

electronProcess = spawn(electronPath, [electronMainPath], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODIARY_DEV_SERVER_URL: devServerUrl,
    MYPLAN_DEV_SERVER_URL: devServerUrl
  },
  stdio: "inherit"
});

electronProcess.on("exit", (code) => {
  stopChild(nextProcess);
  process.exit(code ?? 0);
});
