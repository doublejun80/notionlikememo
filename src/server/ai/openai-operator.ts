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
};

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
            type: "object",
            additionalProperties: true
          },
          diffJson: {
            type: "object",
            additionalProperties: true
          },
          riskLevel: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          undoJson: {
            type: "object",
            additionalProperties: true
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
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

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

  const parsed = JSON.parse(text) as OperatorPlan;

  return {
    summary: parsed.summary,
    actions: parsed.actions ?? [],
    memories: parsed.memories ?? []
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
