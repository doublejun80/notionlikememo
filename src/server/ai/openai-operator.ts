export type OperatorContext = {
  command: string;
  pageTitle: string;
  selectedText: string;
  memory: string[];
};

export type OperatorPlan = {
  summary: string;
  actions: Array<{
    toolName: string;
    argsJson: Record<string, unknown>;
    diffJson: Record<string, unknown>;
    riskLevel: "low" | "medium" | "high";
    undoJson: Record<string, unknown>;
  }>;
  memories: string[];
};

type RequestOptions = {
  apiKey: string;
  fetch?: typeof fetch;
  model?: string;
  timeoutMs?: number;
};

const allowedToolNames = new Set([
  "searchWorkspace",
  "readPage",
  "createPage",
  "updateBlock",
  "moveBlock",
  "createDatabase",
  "updateDatabaseRow",
  "createCalendarEvent",
  "updateCalendarEvent",
  "writeAiMemory"
]);
const allowedRiskLevels = new Set(["low", "medium", "high"]);
const MAX_OPERATOR_ACTIONS = 8;
const MAX_OPERATOR_MEMORIES = 8;

const operatorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "actions", "memories"],
  properties: {
    summary: {
      type: "string"
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["toolName", "argsJson", "diffJson", "riskLevel", "undoJson"],
        properties: {
          toolName: {
            type: "string",
            enum: [
              "searchWorkspace",
              "readPage",
              "createPage",
              "updateBlock",
              "moveBlock",
              "createDatabase",
              "updateDatabaseRow",
              "createCalendarEvent",
              "updateCalendarEvent",
              "writeAiMemory"
            ]
          },
          argsJson: {
            type: "string"
          },
          diffJson: {
            type: "string"
          },
          riskLevel: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          undoJson: {
            type: "string"
          }
        }
      }
    },
    memories: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

export function buildOpenAiOperatorPayload(
  context: OperatorContext,
  model = "gpt-5.5"
) {
  return {
    model,
    input: [
      "You are Nodiary's AI Operator.",
      "Return proposed actions only. Do not claim that changes were executed.",
      "Every mutating action must include a human-readable diff, risk level, and undo payload.",
      "For each action, encode argsJson, diffJson, and undoJson as JSON strings.",
      "High-risk calendar writes, deletion, bulk edits, and database restructuring require approval.",
      `Current page: ${context.pageTitle}`,
      `Selected text: ${context.selectedText || "(none)"}`,
      `Long-term memory: ${context.memory.join(" | ") || "(none)"}`,
      `User command: ${context.command}`
    ].join("\n"),
    text: {
      format: {
        type: "json_schema",
        name: "nodiary_ai_operator_plan",
        strict: true,
        schema: operatorSchema
      }
    }
  };
}

export async function requestOpenAiOperatorPlan(
  context: OperatorContext,
  options: RequestOptions
): Promise<OperatorPlan> {
  const payload = buildOpenAiOperatorPayload(
    context,
    options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.5"
  );
  const fetchImpl = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? 30_000);
  let response: Response;

  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`OpenAI operator request failed with ${response.status}`);
  }

  return parseOpenAiOperatorResponse(await response.json());
}

export function parseOpenAiOperatorResponse(response: unknown): OperatorPlan {
  const text = extractOutputText(response);

  if (!text) {
    return {
      summary: "모델 응답에서 구조화된 제안을 찾지 못했습니다.",
      actions: [],
      memories: []
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return emptyOperatorPlan("모델 응답 JSON을 해석하지 못했습니다.");
  }

  return validateOperatorPlan(parsed);
}

function validateOperatorPlan(value: unknown): OperatorPlan {
  if (!value || typeof value !== "object") {
    return emptyOperatorPlan("모델 응답 구조가 올바르지 않습니다.");
  }

  const record = value as Record<string, unknown>;
  const rawActions = Array.isArray(record.actions) ? record.actions : [];
  const actions = rawActions
    .map(readOperatorAction)
    .filter((action): action is OperatorPlan["actions"][number] => Boolean(action))
    .slice(0, MAX_OPERATOR_ACTIONS);
  const memories = Array.isArray(record.memories)
    ? record.memories
        .filter((memory): memory is string => typeof memory === "string")
        .slice(0, MAX_OPERATOR_MEMORIES)
        .map((memory) => memory.slice(0, 500))
    : [];

  return {
    summary:
      typeof record.summary === "string"
        ? record.summary.slice(0, 240)
        : "모델이 승인 가능한 변경안을 제안했습니다.",
    actions,
    memories
  };
}

function readOperatorAction(value: unknown): OperatorPlan["actions"][number] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.toolName !== "string" ||
    !allowedToolNames.has(record.toolName) ||
    typeof record.riskLevel !== "string" ||
    !allowedRiskLevels.has(record.riskLevel) ||
    !readJsonRecord(record.argsJson) ||
    !readJsonRecord(record.diffJson) ||
    !readJsonRecord(record.undoJson)
  ) {
    return undefined;
  }

  const argsJson = readJsonRecord(record.argsJson);
  const diffJson = readJsonRecord(record.diffJson);
  const undoJson = readJsonRecord(record.undoJson);

  if (!argsJson || !diffJson || !undoJson) {
    return undefined;
  }

  return {
    toolName: record.toolName,
    argsJson: limitRecord(argsJson),
    diffJson: limitRecord(diffJson),
    riskLevel: record.riskLevel as OperatorPlan["actions"][number]["riskLevel"],
    undoJson: limitRecord(undoJson)
  };
}

function emptyOperatorPlan(summary: string): OperatorPlan {
  return {
    summary,
    actions: [],
    memories: []
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJsonRecord(value: unknown): Record<string, unknown> | undefined {
  if (isPlainRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || value.length > 8_000) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return isPlainRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function limitRecord(record: Record<string, unknown>) {
  const serialized = JSON.stringify(record);

  if (serialized.length <= 8_000) {
    return record;
  }

  return {
    truncated: true
  };
}

function extractOutputText(response: unknown): string | undefined {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  if ("output_text" in response && typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = "output" in response ? response.output : undefined;

  if (!Array.isArray(output)) {
    return undefined;
  }

  for (const item of output) {
    if (!item || typeof item !== "object" || !("content" in item)) {
      continue;
    }

    const content = item.content;

    if (!Array.isArray(content)) {
      continue;
    }

    const textPart = content.find(
      (part) =>
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
    );

    if (textPart && typeof textPart === "object" && "text" in textPart) {
      return textPart.text as string;
    }
  }

  return undefined;
}
