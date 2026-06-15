import { NextResponse } from "next/server";

import { requestOpenAiOperatorPlan } from "@/server/ai/openai-operator";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured"
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    command?: string;
    pageTitle?: string;
    selectedText?: string;
    memory?: string[];
  };

  if (!body.command?.trim()) {
    return NextResponse.json(
      {
        error: "command is required"
      },
      { status: 400 }
    );
  }

  try {
    const plan = await requestOpenAiOperatorPlan({
      command: body.command,
      pageTitle: body.pageTitle ?? "오늘의 계획",
      selectedText: body.selectedText ?? "",
      memory: body.memory ?? []
    }, {
      apiKey
    });

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      {
        error: "AI operator request failed"
      },
      { status: 502 }
    );
  }
}
