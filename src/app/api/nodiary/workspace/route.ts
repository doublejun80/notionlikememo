import { NextResponse } from "next/server";

import {
  loadNodiaryState,
  saveNodiaryState
} from "@/server/nodiary/nodiary-repository";
import {
  defaultNodiaryState,
  type NodiaryState
} from "@/features/nodiary/nodiary-model";

export const dynamic = "force-dynamic";

const VALID_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "todo",
  "callout",
  "divider",
  "database",
  "ai"
]);
const VALID_DATABASE_STATUS = new Set(["backlog", "doing", "review", "done"]);
const VALID_DATABASE_VIEWS = new Set(["table", "board", "calendar"]);
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;

export async function GET(request: Request) {
  if (!isAuthorizedLocalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      persistence: "fallback",
      state: getDefaultWorkspaceState()
    });
  }

  let state: NodiaryState;

  try {
    state = await loadNodiaryState();
  } catch {
    return NextResponse.json({
      persistence: "fallback",
      state: getDefaultWorkspaceState()
    });
  }

  return NextResponse.json({ state });
}

export async function PUT(request: Request) {
  if (!isAuthorizedLocalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const state = readStatePayload(payload);

  if (!state) {
    return NextResponse.json({ error: "missing_state" }, { status: 400 });
  }

  if (!isValidNodiaryState(state)) {
    return NextResponse.json({ error: "invalid_state" }, { status: 422 });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        persistence: "fallback"
      },
      { status: 202 }
    );
  }

  try {
    await saveNodiaryState(state);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        persistence: "fallback"
      },
      { status: 202 }
    );
  }

  return NextResponse.json({ ok: true });
}

function getDefaultWorkspaceState(): NodiaryState {
  return {
    ...defaultNodiaryState()
  };
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function readStatePayload(payload: unknown): NodiaryState | undefined {
  if (!payload || typeof payload !== "object" || !("state" in payload)) {
    return undefined;
  }

  return (payload as { state?: NodiaryState }).state;
}

function isValidNodiaryState(state: NodiaryState) {
  if (!state || typeof state !== "object") {
    return false;
  }

  if (!isNonEmptyBoundedString(state.workspace?.name, 80)) {
    return false;
  }

  if (!isValidId(state.activePage?.id)) {
    return false;
  }

  if (!isNonEmptyBoundedString(state.activePage?.title, 180)) {
    return false;
  }

  if (
    !Array.isArray(state.activePage.blocks) ||
    state.activePage.blocks.length > 500
  ) {
    return false;
  }

  return state.activePage.blocks.every((block) => {
    if (!isValidId(block.id) || !VALID_BLOCK_TYPES.has(block.type)) {
      return false;
    }

    if (block.text !== undefined && !isBoundedString(block.text, 20000)) {
      return false;
    }

    if (block.title !== undefined && !isBoundedString(block.title, 500)) {
      return false;
    }

    if (!block.database) {
      return true;
    }

    return isValidDatabaseBlock(block.database);
  });
}

function isValidDatabaseBlock(database: NodiaryState["activePage"]["blocks"][number]["database"]) {
  if (!database) {
    return true;
  }

  return (
    isValidId(database.id) &&
    isNonEmptyBoundedString(database.name, 200) &&
    VALID_DATABASE_VIEWS.has(database.activeView) &&
    Array.isArray(database.rows) &&
    database.rows.length <= 1000 &&
    database.rows.every(
      (row) =>
        isValidId(row.id) &&
        isBoundedString(row.title, 1000) &&
        VALID_DATABASE_STATUS.has(row.status) &&
        isBoundedString(row.owner, 200) &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    )
  );
}

function isNonEmptyBoundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isBoundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength;
}

function isValidId(value: unknown) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isAuthorizedLocalRequest(request?: Request) {
  const expectedToken = process.env.NODIARY_SESSION_TOKEN;

  if (!expectedToken) {
    return true;
  }

  return request?.headers.get("x-nodiary-session") === expectedToken;
}
