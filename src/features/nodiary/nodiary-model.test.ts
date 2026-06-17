import { describe, expect, it } from "vitest";

import {
  addDatabaseRow,
  approveAiAction,
  changeCalendarMonth,
  createAiAnswerRun,
  createAiRunFromOperatorPlan,
  createAiRun,
  defaultNodiaryState,
  deleteBlock,
  deletePage,
  getDatabaseRowsForView,
  getKoreanTodayIsoDate,
  insertBlockFromSlash,
  moveBlock,
  moveBlockByKeyboard,
  moveCalendarEvent,
  moveDatabaseRow,
  movePageNode,
  movePageNodeByKeyboard,
  prepareWorkspaceForStartup,
  rejectAiAction,
  renamePage,
  requestCalendarEventMove,
  selectCalendarDate,
  selectPage,
  switchDatabaseView,
  undoLastAiAction,
  updateDatabaseField,
  updateDatabaseFilter,
  updateDatabaseSort,
  updateBlockText,
  updatePreference
} from "./nodiary-model";

describe("nodiary model", () => {
  it("resolves today from the Korea timezone instead of UTC", () => {
    expect(getKoreanTodayIsoDate(new Date("2026-06-16T14:59:59.000Z"))).toBe(
      "2026-06-16"
    );
    expect(getKoreanTodayIsoDate(new Date("2026-06-16T15:00:00.000Z"))).toBe(
      "2026-06-17"
    );
  });

  it("can start the workspace on the current Korea date", () => {
    const state = defaultNodiaryState({ todayIsoDate: "2026-06-17" });

    expect(state.sidebarCalendar.selectedDate).toBe("2026-06-17");
    expect(
      state.sidebarCalendar.days.find((day) => day.isoDate === "2026-06-17")
    ).toMatchObject({
      isSelected: true,
      isToday: true
    });
    expect(state.activePage.properties.find((property) => property.label === "날짜")).toMatchObject({
      value: "2026년 6월 17일 수요일"
    });
  });

  it("refreshes stale saved calendar state when startup page is today", () => {
    const staleState = defaultNodiaryState({ todayIsoDate: "2026-06-16" });
    const refreshed = prepareWorkspaceForStartup(staleState, "2026-06-17");

    expect(refreshed.activePage.id).toBe("today");
    expect(refreshed.sidebarCalendar.selectedDate).toBe("2026-06-17");
    expect(
      refreshed.sidebarCalendar.days.find((day) => day.isoDate === "2026-06-17")
    ).toMatchObject({
      isSelected: true,
      isToday: true
    });
    expect(refreshed.activePage.properties.find((property) => property.label === "날짜")).toMatchObject({
      value: "2026년 6월 17일 수요일"
    });
  });

  it("keeps the saved calendar date when startup page is last", () => {
    const staleState = updatePreference(
      defaultNodiaryState({ todayIsoDate: "2026-06-16" }),
      {
        startupPage: "last"
      }
    );
    const refreshed = prepareWorkspaceForStartup(staleState, "2026-06-17");

    expect(refreshed.sidebarCalendar.selectedDate).toBe("2026-06-16");
  });

  it("starts as a document-first workspace with no project database on the first screen", () => {
    const state = defaultNodiaryState();

    expect(state.workspace.name).toBe("Nodiary");
    expect(state.activePage.title).toBe("오늘의 계획");
    expect(state.activePage.blocks.some((block) => block.type === "database")).toBe(
      false
    );
    expect(state.sidebarCalendar.days).toHaveLength(35);
    expect(state.sidebarCalendar.days.at(0)?.isoDate).toBe("2026-05-31");
    expect(state.sidebarCalendar.days.at(0)?.label).toBe("31");
    expect(state.sidebarCalendar.days.at(-1)?.isoDate).toBe("2026-07-04");
    expect(state.sidebarCalendar.days.at(-1)?.label).toBe("4");
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

  it("removes document blocks including callouts without disturbing other blocks", () => {
    const state = defaultNodiaryState();
    const nextState = deleteBlock(state, "owner-note");

    expect(nextState.activePage.blocks.some((block) => block.id === "owner-note")).toBe(
      false
    );
    expect(nextState.activePage.blocks.some((block) => block.id === "memo-body")).toBe(
      true
    );
  });

  it("renames and deletes pages while keeping the tree and page cache in sync", () => {
    const state = selectPage(defaultNodiaryState(), "fix-list");
    const renamed = renamePage(state, "meetings", "회의록 수정");
    const selectedRenamed = selectPage(renamed, "meetings");
    const deleted = deletePage(selectedRenamed, "planning");
    const flattenedIds = JSON.stringify(deleted.pageTree);

    expect(selectedRenamed.activePage.title).toBe("회의록 수정");
    expect(flattenedIds).not.toContain("planning");
    expect(flattenedIds).not.toContain("fix-list");
    expect(deleted.pages["planning"]).toBeUndefined();
    expect(deleted.pages["fix-list"]).toBeUndefined();
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

  it("filters, sorts, and edits database field schema without losing rows", () => {
    const state = insertBlockFromSlash(defaultNodiaryState(), "memo", "database");
    const filtered = updateDatabaseFilter(state, "project-db", {
      status: "doing",
      query: "문서"
    });
    const sorted = updateDatabaseSort(filtered, "project-db", {
      fieldId: "date",
      direction: "desc"
    });
    const renamed = updateDatabaseField(sorted, "project-db", "title", {
      name: "할 일"
    });
    const database = renamed.activePage.blocks.find((block) => block.id === "project-db")
      ?.database;

    expect(database?.fields.find((field) => field.id === "title")?.name).toBe("할 일");
    expect(database?.rows).toHaveLength(4);
    expect(database?.filter).toEqual({
      status: "doing",
      query: "문서"
    });
    expect(database?.sort).toEqual({
      fieldId: "date",
      direction: "desc"
    });
    expect(database ? getDatabaseRowsForView(database).map((row) => row.id) : []).toEqual([
      "row-1"
    ]);
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

  it("navigates sidebar calendar months while keeping full month grids", () => {
    const state = defaultNodiaryState();
    const nextMonth = changeCalendarMonth(state, "next");
    const previousMonth = changeCalendarMonth(nextMonth, "previous");

    expect(nextMonth.sidebarCalendar.monthLabel).toBe("2026년 7월");
    expect(nextMonth.sidebarCalendar.selectedDate).toBe("2026-07-01");
    expect(nextMonth.sidebarCalendar.days).toHaveLength(35);
    expect(nextMonth.sidebarCalendar.days[0]).toMatchObject({
      isoDate: "2026-06-28",
      label: "28"
    });
    expect(nextMonth.sidebarCalendar.days.at(-1)).toMatchObject({
      isoDate: "2026-08-01",
      label: "1"
    });
    expect(previousMonth.sidebarCalendar.monthLabel).toBe("2026년 6월");
    expect(previousMonth.sidebarCalendar.selectedDate).toBe("2026-06-01");
    expect(previousMonth.sidebarCalendar.days[0]).toMatchObject({
      isoDate: "2026-05-31",
      label: "31"
    });
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

  it("stores direct AI answers without creating an approval action", () => {
    const answered = createAiAnswerRun(
      defaultNodiaryState(),
      "너는 어떤 모델이야?",
      "현재 선택한 모델은 gpt-5.5입니다.",
      "planner",
      "gpt-5.5"
    );
    const run = answered.ai.runs[0];

    expect(run).toMatchObject({
      status: "completed",
      command: "너는 어떤 모델이야?",
      modelRoute: "planner",
      modelName: "gpt-5.5",
      answer: "현재 선택한 모델은 gpt-5.5입니다.",
      actions: []
    });
  });

  it("adds direct AI answers to the active document as a visible block", () => {
    const answered = createAiAnswerRun(
      defaultNodiaryState(),
      "꽃",
      "꽃은 식물의 번식 기관입니다.",
      "planner",
      "gpt-5.5"
    );

    expect(answered.activePage.blocks.at(-1)).toMatchObject({
      id: "ai-answer-1",
      type: "callout",
      text: "AI 답변: 꽃은 식물의 번식 기관입니다."
    });
    expect(answered.pages[answered.activePage.id]?.blocks.at(-1)).toMatchObject({
      id: "ai-answer-1",
      text: "AI 답변: 꽃은 식물의 번식 기관입니다."
    });
  });

  it("replaces an AI edit request block after approval without writing execution logs", () => {
    const withAiRequest = insertBlockFromSlash(defaultNodiaryState(), "memo-body", "ai");
    const aiRequestBlock = withAiRequest.activePage.blocks.find(
      (block) => block.type === "ai"
    );

    expect(aiRequestBlock).toBeDefined();

    const queued = createAiRun(withAiRequest, "꽃의 정의");
    const action = queued.ai.runs[0]?.actions[0];

    expect(action).toMatchObject({
      approvalStatus: "pending",
      toolName: "updateBlock",
      applyPayload: {
        operation: {
          toolName: "updateBlock",
          argsJson: {
            blockId: aiRequestBlock?.id
          }
        }
      }
    });

    const approved = approveAiAction(queued, action.id);
    const updatedBlock = approved.activePage.blocks.find(
      (block) => block.id === aiRequestBlock?.id
    );

    expect(updatedBlock).toMatchObject({
      type: "paragraph",
      text: expect.stringContaining("꽃")
    });
    expect(
      approved.activePage.blocks.some((block) =>
        (block.text ?? "").includes("AI 승인 실행 기록")
      )
    ).toBe(false);
  });

  it("parses local AI fallback calendar move commands into approval proposals", () => {
    const withRun = createAiRun(
      defaultNodiaryState(),
      "디자인 리뷰 일정을 2026-06-18 16:30로 옮겨줘."
    );
    const action = withRun.ai.runs[0]?.actions[0];

    expect(withRun.sidebarCalendar.selectedDate).toBe("2026-06-16");
    expect(action).toMatchObject({
      toolName: "updateCalendarEvent",
      approvalStatus: "pending",
      riskLevel: "high",
      applyPayload: {
        operation: {
          toolName: "updateCalendarEvent",
          argsJson: {
            eventId: "schedule-2",
            date: "2026-06-18",
            time: "16:30"
          }
        }
      }
    });

    const approved = approveAiAction(withRun, action.id);

    expect(approved.sidebarCalendar.selectedDate).toBe("2026-06-18");
    expect(approved.sidebarCalendar.schedule[0]).toMatchObject({
      id: "schedule-2",
      time: "16:30"
    });
  });

  it("executes approved OpenAI calendar creation actions immediately", () => {
    const state = defaultNodiaryState();
    const withRun = createAiRunFromOperatorPlan(state, "내일 업체 미팅 추가해줘", {
      summary: "내일 업체 미팅 일정을 추가합니다.",
      actions: [
        {
          toolName: "createCalendarEvent",
          argsJson: {
            title: "업체 미팅",
            start: "2026-06-17T14:00:00+09:00",
            end: "2026-06-17T15:00:00+09:00"
          },
          diffJson: {
            change: "create_calendar_event",
            after: {
              title: "업체 미팅",
              start: "2026-06-17T14:00:00+09:00"
            }
          },
          riskLevel: "high",
          undoJson: {
            title: "업체 미팅"
          }
        }
      ],
      memories: []
    });
    const action = withRun.ai.runs[0]?.actions[0];

    const approved = approveAiAction(withRun, action.id);

    expect(approved.ai.runs[0]?.status).toBe("completed");
    expect(approved.sidebarCalendar.selectedDate).toBe("2026-06-17");
    expect(approved.sidebarCalendar.schedule).toContainEqual(
      expect.objectContaining({
        title: "업체 미팅",
        time: "14:00",
        source: "nodiary"
      })
    );

    const undone = undoLastAiAction(approved);

    expect(undone.sidebarCalendar.selectedDate).toBe("2026-06-16");
    expect(undone.sidebarCalendar.schedule).not.toContainEqual(
      expect.objectContaining({ title: "업체 미팅" })
    );
  });

  it("parses Korean calendar move phrases into approval proposals", () => {
    const withRun = createAiRun(
      defaultNodiaryState(),
      "디자인 리뷰를 6월 18일 오후 4시 30분으로 옮겨줘."
    );
    const action = withRun.ai.runs[0]?.actions[0];

    expect(action).toMatchObject({
      toolName: "updateCalendarEvent",
      applyPayload: {
        operation: {
          argsJson: {
            eventId: "schedule-2",
            date: "2026-06-18",
            time: "16:30"
          }
        }
      }
    });
  });

  it("parses local AI calendar commands even when another month is visible", () => {
    const julyState = changeCalendarMonth(defaultNodiaryState(), "next");
    const withRun = createAiRun(
      julyState,
      "디자인 리뷰 일정을 2026-06-18 16:30로 옮겨줘."
    );
    const action = withRun.ai.runs[0]?.actions[0];

    expect(action).toMatchObject({
      toolName: "updateCalendarEvent",
      applyPayload: {
        operation: {
          argsJson: {
            eventId: "schedule-2"
          }
        }
      }
    });

    const approved = approveAiAction(withRun, action.id);

    expect(approved.sidebarCalendar.selectedDate).toBe("2026-06-18");
    expect(approved.sidebarCalendar.schedule[0]).toMatchObject({
      id: "schedule-2",
      time: "16:30"
    });
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
      theme: "lavender",
      accent: "slate",
      density: "compact",
      documentWidth: "wide",
      rightAiPanel: "closed",
      startupPage: "last"
    });

    expect(personalized.preferences).toMatchObject({
      theme: "lavender",
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

  it("reorders document blocks through keyboard fallback commands", () => {
    const state = defaultNodiaryState();
    const movedUp = moveBlockByKeyboard(state, "memo-body", "up");
    const movedDown = moveBlockByKeyboard(movedUp, "memo-body", "down");

    expect(movedUp.activePage.blocks.map((block) => block.id)).toEqual([
      "today-todos",
      "todo-ui",
      "todo-project",
      "todo-openai",
      "owner-note",
      "memo-body",
      "memo"
    ]);
    expect(movedDown.activePage.blocks.map((block) => block.id).at(-1)).toBe(
      "memo-body"
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

  it("reorders page tree siblings through keyboard fallback commands", () => {
    const state = defaultNodiaryState();
    const movedUp = movePageNodeByKeyboard(state, "fix-list", "up");
    const planning = movedUp.pageTree.find((node) => node.id === "planning");

    expect(planning?.children?.map((node) => node.id)).toEqual([
      "fix-list",
      "notion-standard"
    ]);
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

  it("targets the AI request block when an operator edit plan omits a block id", () => {
    const state = insertBlockFromSlash(defaultNodiaryState(), "memo-body", "ai");
    const aiRequestBlock = state.activePage.blocks.find((block) => block.type === "ai");
    const planned = createAiRunFromOperatorPlan(state, "꽃의 정의", {
      summary: "선택된 블록을 꽃의 정의 설명으로 교체합니다.",
      actions: [
        {
          toolName: "updateBlock",
          argsJson: {
            text: "꽃은 식물의 번식 기관으로, 씨앗을 만들기 위해 피는 구조입니다."
          },
          diffJson: {
            after: "꽃은 식물의 번식 기관으로, 씨앗을 만들기 위해 피는 구조입니다."
          },
          riskLevel: "medium",
          undoJson: {}
        }
      ],
      memories: []
    });
    const action = planned.ai.runs[0]?.actions[0];

    expect(action.applyPayload.blocks).toHaveLength(0);
    expect(action.applyPayload.operation?.argsJson).toMatchObject({
      blockId: aiRequestBlock?.id,
      text: "꽃은 식물의 번식 기관으로, 씨앗을 만들기 위해 피는 구조입니다."
    });

    const approved = approveAiAction(planned, action.id);

    expect(
      approved.activePage.blocks.find((block) => block.id === aiRequestBlock?.id)
    ).toMatchObject({
      type: "paragraph",
      text: "꽃은 식물의 번식 기관으로, 씨앗을 만들기 위해 피는 구조입니다."
    });
    expect(
      approved.activePage.blocks.some((block) =>
        (block.text ?? "").includes("AI 승인 실행 기록")
      )
    ).toBe(false);
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
