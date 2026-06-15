import { describe, expect, it } from "vitest";

import {
  approveAiAction,
  createAiRun,
  defaultNodiaryState,
  insertBlockFromSlash,
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
});
