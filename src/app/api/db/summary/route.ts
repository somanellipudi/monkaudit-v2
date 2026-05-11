import { NextResponse } from "next/server";
import { getDbSummary } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDbSummary());
}
