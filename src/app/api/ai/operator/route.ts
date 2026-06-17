import { NextResponse } from "next/server";

import { requestOpenAiOperatorPlan } from "@/server/ai/openai-operator";

const MAX_COMMAND_LENGTH = 6000;
const MAX_SELECTED_TEXT_LENGTH = 12000;
const MAX_PAGE_TITLE_LENGTH = 160;
const MAX_MEMORY_ITEMS = 8;
const MAX_MEMORY_ITEM_LENGTH = 500;
const MAX_CALENDAR_CONTEXT_LENGTH = 1200;
const DEFAULT_OPENAI_OPERATOR_MODEL = "gpt-5.5";

type AiModelRoute = "quick" | "planner" | "large-context";

export async function POST(request: Request) {
  if (!isAuthorizedLocalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured"
      },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsedBody = parseOperatorBody(body);

  if (!parsedBody.ok) {
    return NextResponse.json(
      {
        error: parsedBody.error
      },
      { status: parsedBody.status }
    );
  }

  try {
    const model = resolveOperatorModel();
    const plan = await requestOpenAiOperatorPlan(
      {
        command: parsedBody.value.command,
        pageTitle: parsedBody.value.pageTitle,
        selectedText: parsedBody.value.selectedText,
        calendarContext: parsedBody.value.calendarContext,
        memory: parsedBody.value.memory
      },
      {
        apiKey,
        model
      }
    );

    return NextResponse.json({
      model,
      modelRoute: parsedBody.value.modelRoute,
      plan
    });
  } catch {
    return NextResponse.json(
      {
        error: "AI operator request failed"
      },
      { status: 502 }
    );
  }
}

type ParsedOperatorBody =
  | {
      ok: true;
      value: {
        command: string;
        modelRoute: AiModelRoute;
        pageTitle: string;
        selectedText: string;
        calendarContext?: string;
        memory: string[];
      };
    }
  | {
      ok: false;
      error: string;
      status: 400 | 413 | 422;
    };

function parseOperatorBody(body: unknown): ParsedOperatorBody {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body", status: 400 };
  }

  const record = body as Record<string, unknown>;
  const command = readLimitedString(record.command, MAX_COMMAND_LENGTH);

  if (command === null) {
    return { ok: false, error: "command_too_large", status: 413 };
  }

  if (command === undefined || command.trim().length === 0) {
    return { ok: false, error: "command is required", status: 400 };
  }

  const pageTitle = readLimitedString(record.pageTitle, MAX_PAGE_TITLE_LENGTH);
  const selectedText = readLimitedString(
    record.selectedText,
    MAX_SELECTED_TEXT_LENGTH
  );

  if (pageTitle === null || selectedText === null) {
    return { ok: false, error: "context_too_large", status: 413 };
  }

  const calendarContext = readCalendarContext(record.calendarContext);
  const memory = readMemory(record.memory);

  if (!calendarContext.ok) {
    return {
      ok: false,
      error: calendarContext.error,
      status: calendarContext.status
    };
  }

  if (!memory.ok) {
    return { ok: false, error: memory.error, status: memory.status };
  }

  return {
    ok: true,
    value: {
      command: command.trim(),
      modelRoute: readModelRoute(record.modelRoute),
      pageTitle: pageTitle?.trim() || "오늘의 계획",
      selectedText: selectedText ?? "",
      calendarContext: calendarContext.value,
      memory: memory.value
    }
  };
}

function readModelRoute(value: unknown): AiModelRoute {
  return value === "quick" || value === "large-context" || value === "planner"
    ? value
    : "planner";
}

function resolveOperatorModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_OPERATOR_MODEL;
}

function readLimitedString(value: unknown, maxLength: number) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.length > maxLength ? null : value;
}

function readCalendarContext(
  value: unknown
):
  | { ok: true; value?: string }
  | { ok: false; error: string; status: 400 | 413 | 422 } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_calendar_context", status: 422 };
  }

  const record = value as Record<string, unknown>;
  const selectedDate = readLimitedString(record.selectedDate, 40);

  if (selectedDate === null) {
    return { ok: false, error: "calendar_context_too_large", status: 413 };
  }

  const events = Array.isArray(record.schedule)
    ? record.schedule.slice(0, 12).flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return [];
        }

        const event = item as Record<string, unknown>;
        const time = readLimitedString(event.time, 20);
        const title = readLimitedString(event.title, 120);

        if (time === null || title === null) {
          return [];
        }

        return title ? [`${time ?? ""} ${title}`.trim()] : [];
      })
    : [];
  const summary = [`선택일 ${selectedDate ?? "(없음)"}`, ...events].join(": ");

  if (summary.length > MAX_CALENDAR_CONTEXT_LENGTH) {
    return { ok: false, error: "calendar_context_too_large", status: 413 };
  }

  return { ok: true, value: summary };
}

function readMemory(
  value: unknown
):
  | { ok: true; value: string[] }
  | { ok: false; error: string; status: 400 | 413 | 422 } {
  if (value === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "invalid_memory", status: 422 };
  }

  const memory = value
    .filter((item): item is string => typeof item === "string")
    .slice(0, MAX_MEMORY_ITEMS)
    .map((item) => item.slice(0, MAX_MEMORY_ITEM_LENGTH));

  return { ok: true, value: memory };
}

function isAuthorizedLocalRequest(request: Request) {
  const expectedToken = process.env.NODIARY_SESSION_TOKEN;

  if (!expectedToken) {
    return true;
  }

  return request.headers.get("x-nodiary-session") === expectedToken;
}
