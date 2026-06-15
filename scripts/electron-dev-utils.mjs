export const DEFAULT_DEV_SERVER_URL = "http://127.0.0.1:3000";

export function resolveDevServerUrl(env = process.env) {
  const configuredUrl =
    env.NODIARY_DEV_SERVER_URL?.trim() || env.MYPLAN_DEV_SERVER_URL?.trim();

  return configuredUrl || DEFAULT_DEV_SERVER_URL;
}

export async function isServerReachable(url, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(url, { method: "GET" });

    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForServer(
  url,
  { timeoutMs = 60_000, intervalMs = 500, fetchImpl = fetch } = {}
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(url, fetchImpl)) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  throw new Error(`Timed out waiting for Next.js dev server at ${url}`);
}
