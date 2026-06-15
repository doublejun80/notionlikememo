import { NextResponse } from "next/server";

import {
  loadNodiaryState,
  saveNodiaryState
} from "@/server/nodiary/nodiary-repository";
import type { NodiaryState } from "@/features/nodiary/nodiary-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadNodiaryState();

  return NextResponse.json({ state });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as { state?: NodiaryState };

  if (!payload.state) {
    return NextResponse.json({ error: "missing_state" }, { status: 400 });
  }

  await saveNodiaryState(payload.state);

  return NextResponse.json({ ok: true });
}
