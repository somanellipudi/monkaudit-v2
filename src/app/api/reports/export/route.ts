import { NextResponse } from "next/server";
import type { Report } from "@/lib/types";
import { requirePermission } from "@/lib/server/authz";
import { exportReport } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportTypes = new Set<Report["type"]>(["client_growth_due_diligence", "internal_sales_brief"]);

export async function POST(request: Request) {
  const auth = await requirePermission(request, "report:export");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  if (!payload.auditRunId || !reportTypes.has(payload.type)) {
    return NextResponse.json({ error: "auditRunId and a valid report type are required." }, { status: 400 });
  }
  const result = await exportReport(payload.auditRunId, payload.type, auth.user.email);
  if (!result) {
    return NextResponse.json({ error: "Report is not ready for export." }, { status: 409 });
  }
  return NextResponse.json({ source: "repository", ...result });
}
