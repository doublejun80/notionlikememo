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
const VALID_DATABASE_FIELD_TYPES = new Set(["text", "status", "date", "person"]);
const VALID_DATABASE_FILTER_STATUS = new Set([
  "all",
  "backlog",
  "doing",
  "review",
  "done"
]);
const VALID_DATABASE_SORT_FIELDS = new Set(["title", "status", "owner", "date"]);
const VALID_DATABASE_SORT_DIRECTIONS = new Set(["asc", "desc"]);
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

  if (!isValidPageTree(state.pageTree)) {
    return false;
  }

  if (!isValidPagesRecord(state.pages)) {
    return false;
  }

  if (!isValidPage(state.activePage)) {
    return false;
  }

  return Boolean(state.pages[state.activePage.id]);
}

function isValidPagesRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const pages = Object.values(value as Record<string, unknown>);

  return pages.length <= 200 && pages.every(isValidPage);
}

function isValidPage(page: unknown) {
  if (!page || typeof page !== "object" || Array.isArray(page)) {
    return false;
  }

  const candidate = page as NodiaryState["activePage"];

  if (!isValidId(candidate.id)) {
    return false;
  }

  if (!isNonEmptyBoundedString(candidate.title, 180)) {
    return false;
  }

  if (
    !Array.isArray(candidate.properties) ||
    candidate.properties.length > 50 ||
    !candidate.properties.every(
      (property) =>
        property &&
        typeof property === "object" &&
        isBoundedString((property as { label?: unknown }).label, 80) &&
        isBoundedString((property as { value?: unknown }).value, 500)
    )
  ) {
    return false;
  }

  if (!Array.isArray(candidate.blocks) || candidate.blocks.length > 500) {
    return false;
  }

  return candidate.blocks.every(isValidBlock);
}

function isValidBlock(block: unknown) {
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return false;
  }

  const candidate = block as NodiaryState["activePage"]["blocks"][number];

  if (!isValidId(candidate.id) || !VALID_BLOCK_TYPES.has(candidate.type)) {
    return false;
  }

  if (candidate.text !== undefined && !isBoundedString(candidate.text, 20000)) {
    return false;
  }

  if (candidate.title !== undefined && !isBoundedString(candidate.title, 500)) {
    return false;
  }

  if (candidate.database && candidate.type !== "database") {
    return false;
  }

  return candidate.database ? isValidDatabaseBlock(candidate.database) : true;
}

function isValidDatabaseBlock(database: NodiaryState["activePage"]["blocks"][number]["database"]) {
  if (!database) {
    return true;
  }

  return (
    isValidId(database.id) &&
    isNonEmptyBoundedString(database.name, 200) &&
    VALID_DATABASE_VIEWS.has(database.activeView) &&
    Array.isArray(database.fields) &&
    database.fields.length <= 100 &&
    database.fields.every(
      (field) =>
        isValidId(field.id) &&
        isNonEmptyBoundedString(field.name, 120) &&
        VALID_DATABASE_FIELD_TYPES.has(field.type)
    ) &&
    isValidDatabaseFilter(database.filter) &&
    isValidDatabaseSort(database.sort) &&
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

function isValidDatabaseFilter(filter: unknown) {
  if (filter === undefined) {
    return true;
  }

  if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
    return false;
  }

  const candidate = filter as { status?: unknown; query?: unknown };

  return (
    typeof candidate.status === "string" &&
    VALID_DATABASE_FILTER_STATUS.has(candidate.status) &&
    isBoundedString(candidate.query, 500)
  );
}

function isValidDatabaseSort(sort: unknown) {
  if (sort === undefined) {
    return true;
  }

  if (!sort || typeof sort !== "object" || Array.isArray(sort)) {
    return false;
  }

  const candidate = sort as { fieldId?: unknown; direction?: unknown };

  return (
    typeof candidate.fieldId === "string" &&
    typeof candidate.direction === "string" &&
    VALID_DATABASE_SORT_FIELDS.has(candidate.fieldId) &&
    VALID_DATABASE_SORT_DIRECTIONS.has(candidate.direction)
  );
}

function isValidPageTree(nodes: unknown, depth = 0): nodes is NodiaryState["pageTree"] {
  if (!Array.isArray(nodes) || nodes.length > 500 || depth > 12) {
    return false;
  }

  return nodes.every((node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return false;
    }

    const candidate = node as {
      id?: unknown;
      title?: unknown;
      expanded?: unknown;
      children?: unknown;
    };

    return (
      isValidId(candidate.id) &&
      isNonEmptyBoundedString(candidate.title, 180) &&
      typeof candidate.expanded === "boolean" &&
      (candidate.children === undefined ||
        isValidPageTree(candidate.children, depth + 1))
    );
  });
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
