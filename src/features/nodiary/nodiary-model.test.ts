import { describe, expect, it } from "vitest";

import {
  approveAiAction,
  createAiRunFromOperatorPlan,
  createAiRun,
  defaultNodiaryState,
  insertBlockFromSlash,
  moveBlock,
  moveCalendarEvent,
  moveDatabaseRow,
  movePageNode,
  rejectAiAction,
  selectCalendarDate,
  switchDatabaseView,
  undoLastAiAction,
  updatePreference
} from "./nodiary-model";

describe("nodiary model", () => {
  it("starts as a document-first workspace with no project database on the first screen", () => {
    const state = defaultNodiaryState();

    expect(state.workspace.name).toBe("Nodiary");
    expect(state.activePage.title).toBe("오늘의 계획");
    expect(state.activePage.blocks.some((block) => block.type === "database")).toBe(
      false
    );
    expect(state.sidebarCalendar.days).toHaveLength(35);
    expect(state.sidebarCalendar.days.at(0)?.label).toBe("1");
    expect(state.sidebarCalendar.days.at(-1)?.label).toBe("5");
  });

  it("inserts a contextual project database block from the slash menu", () => {
    const state = defaultNodiaryState();

    const nextState = insertBlockFromSlash(state, "memo", "database");

    const databaseBlock = nextState.activePage.blocks.find(
      (block) => block.type === "database"
    );

    expect(databaseBlock).toMatchObject({
      type: "database",
      title: "고쳐야 할 50개 리스트"
    });
    expect(databaseBlock?.database?.activeView).toBe("table");
    expect(databaseBlock?.database?.rows).toHaveLength(4);
  });

  it("switches inserted database blocks between table, board, and calendar views", () => {
    const state = insertBlockFromSlash(defaultNodiaryState(), "memo", "database");
    const boardState = switchDatabaseView(state, "project-db", "board");
    const calendarState = switchDatabaseView(boardState, "project-db", "calendar");

    const databaseBlock = calendarState.activePage.blocks.find(
      (block) => block.id === "project-db"
    );

    expect(databaseBlock?.database?.activeView).toBe("calendar");
  });

  it("selects sidebar calendar dates and exposes the selected schedule", () => {
    const state = defaultNodiaryState();
    const selected = selectCalendarDate(state, "2026-06-18");

    expect(selected.sidebarCalendar.selectedDate).toBe("2026-06-18");
    expect(
      selected.sidebarCalendar.days.find((day) => day.isoDate === "2026-06-18")
        ?.isSelected
    ).toBe(true);
    expect(selected.sidebarCalendar.schedule[0]?.title).toBe("AI operator 점검");
  });

  it("creates approval-gated AI actions and keeps undo payloads", () => {
    const state = defaultNodiaryState();
    const withRun = createAiRun(
      state,
      "이 페이지를 실행 계획으로 정리하고 오늘 할 일을 만들어줘."
    );
    const action = withRun.ai.runs[0]?.actions[0];

    expect(action).toMatchObject({
      approvalStatus: "pending",
      riskLevel: "medium"
    });

    const approved = approveAiAction(withRun, action.id);
    const approvedAction = approved.ai.runs[0]?.actions[0];

    expect(approvedAction?.approvalStatus).toBe("approved");
    expect(approved.ai.undoLog).toHaveLength(1);
    expect(approved.activePage.blocks.some((block) => block.id === "ai-plan")).toBe(
      true
    );

    const undone = undoLastAiAction(approved);

    expect(undone.ai.undoLog).toHaveLength(0);
    expect(undone.activePage.blocks.some((block) => block.id === "ai-plan")).toBe(
      false
    );
  });

  it("rejects AI actions without mutating the document", () => {
    const withRun = createAiRun(defaultNodiaryState(), "오른쪽 일정도 바꿔줘.");
    const action = withRun.ai.runs[0]?.actions[0];
    const rejected = rejectAiAction(withRun, action.id);

    expect(rejected.ai.runs[0]?.actions[0]?.approvalStatus).toBe("rejected");
    expect(rejected.activePage.blocks.some((block) => block.id === "ai-plan")).toBe(
      false
    );
  });

  it("updates personalization preferences without losing document state", () => {
    const state = defaultNodiaryState();
    const personalized = updatePreference(state, {
      accent: "slate",
      density: "compact",
      documentWidth: "wide",
      rightAiPanel: "closed",
      startupPage: "last"
    });

    expect(personalized.preferences).toMatchObject({
      accent: "slate",
      density: "compact",
      documentWidth: "wide",
      rightAiPanel: "closed",
      startupPage: "last"
    });
    expect(personalized.activePage.title).toBe("오늘의 계획");
  });

  it("reorders document blocks through a drag-style move", () => {
    const state = defaultNodiaryState();
    const moved = moveBlock(state, "memo-body", "today-todos");
    const blockIds = moved.activePage.blocks.map((block) => block.id);

    expect(blockIds.indexOf("memo-body")).toBeLessThan(
      blockIds.indexOf("today-todos")
    );
  });

  it("moves page tree nodes under a new parent", () => {
    const state = defaultNodiaryState();
    const moved = movePageNode(state, "fix-list", "today", 1);
    const today = moved.pageTree.find((node) => node.id === "today");
    const planning = moved.pageTree.find((node) => node.id === "planning");

    expect(today?.children?.map((node) => node.id)).toEqual([
      "morning-check",
      "fix-list",
      "memo-ideas"
    ]);
    expect(planning?.children?.some((node) => node.id === "fix-list")).toBe(false);
  });

  it("moves database rows across board columns and calendar dates", () => {
    const state = insertBlockFromSlash(defaultNodiaryState(), "memo", "database");
    const moved = moveDatabaseRow(state, "project-db", "row-3", {
      status: "doing",
      date: "2026-06-19",
      index: 0
    });
    const row = moved.activePage.blocks
      .find((block) => block.id === "project-db")
      ?.database?.rows.find((candidate) => candidate.id === "row-3");

    expect(row).toMatchObject({
      status: "doing",
      date: "2026-06-19"
    });
  });

  it("moves sidebar calendar events with conflict risk metadata", () => {
    const state = defaultNodiaryState();
    const moved = moveCalendarEvent(state, "schedule-2", {
      date: "2026-06-18",
      time: "16:30"
    });

    expect(moved.sidebarCalendar.selectedDate).toBe("2026-06-18");
    expect(moved.sidebarCalendar.schedule[0]).toMatchObject({
      id: "schedule-2",
      time: "16:30",
      conflictRisk: "high"
    });
  });

  it("maps OpenAI operator plans into approval actions without direct mutation", () => {
    const state = defaultNodiaryState();
    const planned = createAiRunFromOperatorPlan(state, "정리해줘", {
      summary: "문단을 실행 계획으로 바꿉니다.",
      actions: [
        {
          toolName: "updateBlock",
          argsJson: { blockId: "memo-body" },
          diffJson: {
            before: "Notion-like의 첫인상",
            after: "실행 계획으로 정리"
          },
          riskLevel: "medium",
          undoJson: { blockId: "memo-body" }
        }
      ],
      memories: ["문서-first 흐름을 유지한다."]
    });

    const action = planned.ai.runs[0]?.actions[0];

    expect(action).toMatchObject({
      approvalStatus: "pending",
      toolName: "updateBlock",
      riskLevel: "medium"
    });
    expect(action.diff).toContain("실행 계획으로 정리");
    expect(planned.activePage.blocks.some((block) => block.id === "ai-plan")).toBe(
      false
    );
    expect(planned.ai.memories.at(0)?.content).toBe("문서-first 흐름을 유지한다.");
  });
});
