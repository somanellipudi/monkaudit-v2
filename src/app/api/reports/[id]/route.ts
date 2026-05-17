import { NextResponse } from "next/server";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { deleteReport, getAudit, getReport } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "report:delete");
  if (!auth.ok) return auth.response;

  const report = await getReport(params.id);
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const audit = await getAudit(report.auditRunId);
  if (!audit || !canAccess(auth.user, audit)) {
    return NextResponse.json({ error: "Report not visible to this user." }, { status: 403 });
  }

  const deleted = await deleteReport(report.id, auth.user.email);
  return NextResponse.json({ source: "repository", report: deleted });
}
