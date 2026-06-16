import { describe, expect, it } from "vitest";

import {
  addDatabaseRow,
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
  requestCalendarEventMove,
  selectCalendarDate,
  selectPage,
  switchDatabaseView,
  undoLastAiAction,
  updateBlockText,
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

  it("preserves edited page blocks when navigating away and back", () => {
    const edited = updateBlockText(
      defaultNodiaryState(),
      "memo-body",
      "페이지 이동 후에도 남아야 하는 문장"
    );
    const away = selectPage(edited, "memo-ideas");
    const back = selectPage(away, "today");

    expect(back.activePage.blocks.find((block) => block.id === "memo-body")).toMatchObject({
      text: "페이지 이동 후에도 남아야 하는 문장"
    });
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

  it("adds editable database rows with stable unique ids", () => {
    const state = insertBlockFromSlash(defaultNodiaryState(), "memo", "database");
    const nextState = addDatabaseRow(state, "project-db", {
      title: "새 보안 검토 항목",
      status: "review",
      owner: "검토자",
      date: "2026-06-21"
    });

    const rows = nextState.activePage.blocks.find((block) => block.id === "project-db")
      ?.database?.rows;
    const added = rows?.find((row) => row.title === "새 보안 검토 항목");

    expect(rows).toHaveLength(5);
    expect(added).toMatchObject({
      id: "row-5",
      status: "review",
      owner: "검토자",
      date: "2026-06-21"
    });
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

  it("queues high-risk calendar moves for approval instead of mutating immediately", () => {
    const state = defaultNodiaryState();
    const queued = requestCalendarEventMove(state, "schedule-2", {
      date: "2026-06-18",
      time: "16:30"
    });

    expect(queued.sidebarCalendar.selectedDate).toBe("2026-06-16");
    expect(queued.ai.runs[0]?.actions[0]).toMatchObject({
      toolName: "updateCalendarEvent",
      approvalStatus: "pending",
      riskLevel: "high"
    });

    const approved = approveAiAction(queued, queued.ai.runs[0].actions[0].id);

    expect(approved.sidebarCalendar.selectedDate).toBe("2026-06-18");
    expect(approved.sidebarCalendar.schedule[0]).toMatchObject({
      id: "schedule-2",
      time: "16:30",
      conflictRisk: "high"
    });

    const undone = undoLastAiAction(approved);

    expect(undone.sidebarCalendar.selectedDate).toBe("2026-06-16");
    expect(undone.sidebarCalendar.schedule.some((event) => event.id === "schedule-2")).toBe(
      true
    );
  });

  it("keeps moved calendar events when selecting away and back", () => {
    const moved = moveCalendarEvent(defaultNodiaryState(), "schedule-2", {
      date: "2026-06-18"
    });
    const away = selectCalendarDate(moved, "2026-06-16");
    const back = selectCalendarDate(away, "2026-06-18");

    expect(away.sidebarCalendar.schedule.some((event) => event.id === "schedule-2")).toBe(
      false
    );
    expect(back.sidebarCalendar.schedule[0]).toMatchObject({
      id: "schedule-2",
      time: "15:00",
      conflictRisk: "high"
    });
  });

  it("creates unique block and database ids for rapid slash insertions", () => {
    const first = insertBlockFromSlash(defaultNodiaryState(), "memo-body", "paragraph");
    const second = insertBlockFromSlash(first, "memo-body", "paragraph");
    const paragraphIds = second.activePage.blocks
      .filter((block) => block.id.startsWith("paragraph-"))
      .map((block) => block.id);

    expect(new Set(paragraphIds).size).toBe(paragraphIds.length);

    const withDb = insertBlockFromSlash(defaultNodiaryState(), "memo", "database");
    const withTwoDbs = insertBlockFromSlash(withDb, "memo", "database");
    const databaseIds = withTwoDbs.activePage.blocks
      .filter((block) => block.type === "database")
      .map((block) => block.id);

    expect(new Set(databaseIds).size).toBe(databaseIds.length);
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

  it("uses approval-time snapshots so operator undo does not overwrite later user edits", () => {
    const planned = createAiRunFromOperatorPlan(defaultNodiaryState(), "정리해줘", {
      summary: "문단을 바꿉니다.",
      actions: [
        {
          toolName: "updateBlock",
          argsJson: {
            blockId: "memo-body",
            text: "AI가 쓴 문장"
          },
          diffJson: { after: "AI가 쓴 문장" },
          riskLevel: "medium",
          undoJson: {}
        }
      ],
      memories: []
    });
    const userEditedBeforeApproval = {
      ...planned,
      activePage: {
        ...planned.activePage,
        blocks: planned.activePage.blocks.map((block) =>
          block.id === "memo-body"
            ? { ...block, text: "사용자가 승인 전에 직접 고친 문장" }
            : block
        )
      }
    };
    const approved = approveAiAction(
      userEditedBeforeApproval,
      planned.ai.runs[0].actions[0].id
    );
    const undone = undoLastAiAction(approved);

    expect(
      undone.activePage.blocks.find((block) => block.id === "memo-body")?.text
    ).toBe("사용자가 승인 전에 직접 고친 문장");
  });
});
