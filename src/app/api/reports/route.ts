import { NextResponse } from "next/server";
import type { Report } from "@/lib/types";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { getAudit, listReportsForAudit, saveReport } from "@/lib/server/repositories";
import { filterReports, paginate } from "@/lib/server/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportTypes = new Set<Report["type"]>(["client_growth_due_diligence", "internal_sales_brief", "sales_call_notes"]);

export async function GET(request: Request) {
  const auth = await requirePermission(request, "report:view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const auditRunId = url.searchParams.get("auditRunId");
  if (!auditRunId) {
    return NextResponse.json({ error: "auditRunId is required." }, { status: 400 });
  }
  const audit = await getAudit(auditRunId);
  if (!audit || !canAccess(auth.user, audit)) return NextResponse.json({ error: "Audit not visible to this user." }, { status: 403 });
  const reports = await listReportsForAudit(auditRunId);
  const filtered = filterReports(reports, {
    reportStatus: url.searchParams.get("reportStatus") || undefined,
    type: url.searchParams.get("type") || undefined
  });
  const page = paginate(filtered, {
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 25)
  });
  return NextResponse.json({ source: "repository", reports: page.records, pagination: { page: page.page, pageSize: page.pageSize, total: page.total } });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "report:review");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  if (!payload.auditRunId || !payload.leadId || !reportTypes.has(payload.type)) {
    return NextResponse.json({ error: "auditRunId, leadId, and a valid report type are required." }, { status: 400 });
  }
  const audit = await getAudit(payload.auditRunId);
  if (!audit || !canAccess(auth.user, audit)) return NextResponse.json({ error: "Audit not visible to this user." }, { status: 403 });
  const report = await saveReport({ ...payload, createdBy: auth.user.email });
  return NextResponse.json({ source: "repository", report }, { status: 201 });
}
