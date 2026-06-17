import { describe, expect, it, vi } from "vitest";

import {
  buildOpenAiOperatorPayload,
  parseOpenAiOperatorResponse,
  requestOpenAiOperatorPlan
} from "./openai-operator";

describe("OpenAI operator boundary", () => {
  it("builds a Responses API structured-output payload for approval actions", () => {
    const payload = buildOpenAiOperatorPayload({
      command: "메모를 실행 계획으로 바꿔줘.",
      pageTitle: "오늘의 계획",
      selectedText: "회의 준비와 일정 정리",
      memory: ["AI 변경은 approval/undo가 필요하다."],
      calendarContext: "선택일 2026-06-17: 10:00 제품 기획서 정리"
    });

    expect(payload.model).toBe("gpt-5.5");
    expect(payload.input).toContain("오늘의 계획");
    expect(payload.input).toContain("메모를 실행 계획으로 바꿔줘.");
    expect(payload.input).toContain(
      "If selected text includes `Block ID:`, use that exact id"
    );
    expect(payload.input).toContain("선택일 2026-06-17");
    expect(payload.text.format).toMatchObject({
      type: "json_schema",
      name: "nodiary_ai_operator_plan",
      strict: true
    });
    expect(JSON.stringify(payload.text.format.schema)).not.toContain(
      '"additionalProperties":true'
    );
    expect(JSON.stringify(payload)).not.toContain("OPENAI_API_KEY");
  });

  it("parses structured model output into proposed approval actions", () => {
    const parsed = parseOpenAiOperatorResponse({
      output_text: JSON.stringify({
        summary: "두 가지 변경을 제안합니다.",
        actions: [
          {
            toolName: "updateBlock",
            argsJson: { blockId: "memo" },
            diffJson: { before: "메모", after: "실행 계획" },
            riskLevel: "medium",
            undoJson: { blockId: "memo", text: "메모" }
          }
        ],
        memories: ["사용자는 문서-first UI를 원한다."]
      })
    });

    expect(parsed.actions[0]).toMatchObject({
      toolName: "updateBlock",
      riskLevel: "medium"
    });
    expect(parsed.memories).toContain("사용자는 문서-first UI를 원한다.");
  });

  it("parses JSON-string action payloads from strict Responses API schemas", () => {
    const parsed = parseOpenAiOperatorResponse({
      output_text: JSON.stringify({
        summary: "일정 변경을 제안합니다.",
        actions: [
          {
            toolName: "updateCalendarEvent",
            argsJson: JSON.stringify({
              eventId: "schedule-2",
              date: "2026-06-18",
              time: "16:30"
            }),
            diffJson: JSON.stringify({
              before: "2026-06-16 15:00",
              after: "2026-06-18 16:30"
            }),
            riskLevel: "high",
            undoJson: JSON.stringify({
              date: "2026-06-16",
              time: "15:00"
            })
          }
        ],
        memories: []
      })
    });

    expect(parsed.actions[0]).toMatchObject({
      toolName: "updateCalendarEvent",
      argsJson: {
        eventId: "schedule-2",
        date: "2026-06-18",
        time: "16:30"
      },
      diffJson: {
        before: "2026-06-16 15:00",
        after: "2026-06-18 16:30"
      },
      undoJson: {
        date: "2026-06-16",
        time: "15:00"
      }
    });
  });

  it("caps and validates structured model output before returning it to the UI", () => {
    const parsed = parseOpenAiOperatorResponse({
      output_text: JSON.stringify({
        summary: "x".repeat(500),
        actions: [
          {
            toolName: "updateBlock",
            argsJson: { blockId: "memo" },
            diffJson: { after: "정리" },
            riskLevel: "medium",
            undoJson: {}
          },
          {
            toolName: "dangerousTool",
            argsJson: {},
            diffJson: {},
            riskLevel: "critical",
            undoJson: {}
          }
        ],
        memories: Array.from({ length: 20 }, (_, index) => `memory-${index}`)
      })
    });

    expect(parsed.summary.length).toBeLessThanOrEqual(240);
    expect(parsed.actions).toHaveLength(1);
    expect(parsed.memories).toHaveLength(8);
  });

  it("sends the API key only as an Authorization header and never returns it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          summary: "승인 큐 제안",
          actions: [],
          memories: []
        })
      })
    })) as unknown as typeof fetch;

    const result = await requestOpenAiOperatorPlan(
      {
        command: "정리해줘.",
        pageTitle: "오늘의 계획",
        selectedText: "",
        memory: []
      },
      {
        apiKey: "unit-test-secret",
        fetch: fetchMock
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer unit-test-secret"
        })
      })
    );
    expect(JSON.stringify(result)).not.toContain("unit-test-secret");
  });

  it("aborts slow OpenAI requests", async () => {
    const fetchMock = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        })
    ) as unknown as typeof fetch;

    await expect(
      requestOpenAiOperatorPlan(
        {
          command: "정리해줘.",
          pageTitle: "오늘의 계획",
          selectedText: "",
          memory: []
        },
        {
          apiKey: "unit-test-secret",
          fetch: fetchMock,
          timeoutMs: 1
        }
      )
    ).rejects.toThrow("aborted");
  });
});
