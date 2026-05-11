import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Client account handoff is outside the Phase 1 sales workspace." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "Client account handoff is outside the Phase 1 sales workspace." }, { status: 410 });
}
