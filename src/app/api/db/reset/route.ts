import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { resetDb } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (env.appEnv === "production") {
    return NextResponse.json({ error: "Reset is disabled in production." }, { status: 403 });
  }
  const state = await resetDb();
  return NextResponse.json({
    reset: true,
    counts: {
      leads: state.leads.length,
      audit_runs: state.audit_runs.length
    }
  });
}
