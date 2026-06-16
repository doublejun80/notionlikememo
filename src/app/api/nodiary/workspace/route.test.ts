import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultNodiaryState } from "@/features/nodiary/nodiary-model";

import { GET, PUT } from "./route";
import { loadNodiaryState, saveNodiaryState } from "@/server/nodiary/nodiary-repository";

vi.mock("@/server/nodiary/nodiary-repository", () => ({
  loadNodiaryState: vi.fn(),
  saveNodiaryState: vi.fn()
}));

describe("/api/nodiary/workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads the workspace through the repository boundary", async () => {
    vi.mocked(loadNodiaryState).mockResolvedValue(defaultNodiaryState());

    const response = await GET(new Request("http://localhost/api/nodiary/workspace"));

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("state.activePage.title", "오늘의 계획");
  });

  it("requires the Electron session token when local API protection is enabled", async () => {
    vi.stubEnv("NODIARY_SESSION_TOKEN", "session-secret");

    const rejected = await GET(new Request("http://localhost/api/nodiary/workspace"));

    expect(rejected.status).toBe(401);

    vi.mocked(loadNodiaryState).mockResolvedValue(defaultNodiaryState());
    const accepted = await GET(
      new Request("http://localhost/api/nodiary/workspace", {
        headers: {
          "x-nodiary-session": "session-secret"
        }
      })
    );

    expect(accepted.status).toBe(200);
  });

  it("rejects malformed persisted state before repository save", async () => {
    const response = await PUT(
      new Request("http://localhost/api/nodiary/workspace", {
        method: "PUT",
        body: JSON.stringify({
          state: {
            workspace: { name: "", subtitle: "" },
            activePage: {
              id: "../bad",
              title: "x".repeat(500),
              blocks: [{ id: "bad", type: "script", text: "<script />" }]
            }
          }
        })
      })
    );

    expect(response.status).toBe(422);
    expect(saveNodiaryState).not.toHaveBeenCalled();
  });

  it("saves valid state through the repository boundary", async () => {
    const state = defaultNodiaryState();
    const response = await PUT(
      new Request("http://localhost/api/nodiary/workspace", {
        method: "PUT",
        body: JSON.stringify({ state })
      })
    );

    expect(response.status).toBe(200);
    expect(saveNodiaryState).toHaveBeenCalledWith(state);
  });
});
