import { NextResponse } from "next/server";

import { requestOpenAiOperatorPlan } from "@/server/ai/openai-operator";

const MAX_COMMAND_LENGTH = 6000;
const MAX_SELECTED_TEXT_LENGTH = 12000;
const MAX_PAGE_TITLE_LENGTH = 160;
const MAX_MEMORY_ITEMS = 8;
const MAX_MEMORY_ITEM_LENGTH = 500;

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
    const plan = await requestOpenAiOperatorPlan({
      command: parsedBody.value.command,
      pageTitle: parsedBody.value.pageTitle,
      selectedText: parsedBody.value.selectedText,
      memory: parsedBody.value.memory
    }, {
      apiKey
    });

    return NextResponse.json({ plan });
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
        pageTitle: string;
        selectedText: string;
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

  const memory = readMemory(record.memory);

  if (!memory.ok) {
    return { ok: false, error: memory.error, status: memory.status };
  }

  return {
    ok: true,
    value: {
      command: command.trim(),
      pageTitle: pageTitle?.trim() || "오늘의 계획",
      selectedText: selectedText ?? "",
      memory: memory.value
    }
  };
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
