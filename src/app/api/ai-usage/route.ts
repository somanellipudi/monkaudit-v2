import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/authz";
import { listAiUsage, recordAiUsage } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "ai_usage:view");
  if (!auth.ok) return auth.response;
  const usage = await listAiUsage();
  return NextResponse.json({ source: "repository", usage });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "ai_usage:view");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  const usage = await recordAiUsage({ ...payload, userId: payload.userId || auth.user.email });
  return NextResponse.json({ source: "repository", usage }, { status: 201 });
}
