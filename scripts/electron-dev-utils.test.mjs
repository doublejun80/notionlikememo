import { describe, expect, it } from "vitest";

import { resolveDevServerUrl } from "./electron-dev-utils.mjs";

describe("resolveDevServerUrl", () => {
  it("uses NODIARY_DEV_SERVER_URL when it is set", () => {
    expect(
      resolveDevServerUrl({
        NODIARY_DEV_SERVER_URL: "http://127.0.0.1:4100"
      })
    ).toBe("http://127.0.0.1:4100");
  });

  it("uses MYPLAN_DEV_SERVER_URL when it is set", () => {
    expect(
      resolveDevServerUrl({
        MYPLAN_DEV_SERVER_URL: "http://127.0.0.1:4000"
      })
    ).toBe("http://127.0.0.1:4000");
  });

  it("falls back to the local Next.js dev server", () => {
    expect(resolveDevServerUrl({})).toBe("http://127.0.0.1:3000");
  });
});
