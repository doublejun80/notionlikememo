import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { requestOpenAiOperatorPlan } from "@/server/ai/openai-operator";

vi.mock("@/server/ai/openai-operator", () => ({
  requestOpenAiOperatorPlan: vi.fn()
}));

describe("/api/ai/operator", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.OPENAI_API_KEY = "unit-test-key";
  });

  it("wraps a successful OpenAI operator plan in a stable response envelope", async () => {
    vi.mocked(requestOpenAiOperatorPlan).mockResolvedValue({
      summary: "승인 큐 제안",
      actions: [],
      memories: []
    });

    const response = await POST(
      new Request("http://localhost/api/ai/operator", {
        method: "POST",
        body: JSON.stringify({
          command: "정리해줘",
          pageTitle: "오늘의 계획",
          memory: ["메모리"]
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      plan: {
        summary: "승인 큐 제안",
        actions: [],
        memories: []
      }
    });
  });

  it("rejects oversized commands before spending model budget", async () => {
    const response = await POST(
      new Request("http://localhost/api/ai/operator", {
        method: "POST",
        body: JSON.stringify({
          command: "x".repeat(6001)
        })
      })
    );

    expect(response.status).toBe(413);
    expect(requestOpenAiOperatorPlan).not.toHaveBeenCalled();
  });

  it("caps memory scope sent to OpenAI", async () => {
    vi.mocked(requestOpenAiOperatorPlan).mockResolvedValue({
      summary: "승인 큐 제안",
      actions: [],
      memories: []
    });

    await POST(
      new Request("http://localhost/api/ai/operator", {
        method: "POST",
        body: JSON.stringify({
          command: "정리해줘",
          memory: Array.from({ length: 20 }, (_, index) => `memory-${index}`)
        })
      })
    );

    expect(requestOpenAiOperatorPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        memory: expect.arrayContaining(["memory-0", "memory-7"])
      }),
      expect.anything()
    );
    expect(
      vi.mocked(requestOpenAiOperatorPlan).mock.calls[0]?.[0].memory
    ).toHaveLength(8);
  });
});
