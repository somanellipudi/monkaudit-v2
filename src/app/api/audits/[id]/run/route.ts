import { NextResponse } from "next/server";
import { runLocalAuditPipeline } from "@/lib/server/audit-pipeline";
import { canAccess, logEvent, requirePermission } from "@/lib/server/authz";
import { getAudit, updateAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "audit:run");
  if (!auth.ok) return auth.response;
  const audit = await getAudit(params.id);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (!canAccess(auth.user, audit)) return NextResponse.json({ error: "Audit not visible to this user." }, { status: 403 });
  const payload = await request.json().catch(() => ({}));
  const force = Boolean(payload.force);
  const requireGemini = Boolean(payload.requireGemini);

  if (audit.auditStatus === "Research Running" && !force) {
    return NextResponse.json(
      { error: "Research is already running. Use force=true only for a manual retry." },
      { status: 409 }
    );
  }

  const startedAt = Date.now();
  const runningAudit = await updateAudit(audit.id, { auditStatus: "Research Running", status: "Research Running" });
  try {
    const result = await runLocalAuditPipeline(runningAudit || audit, { requireGemini });
    logEvent("info", "audit_job_completed", { requestId: auth.requestId, auditRunId: audit.id, userId: auth.user.email, durationMs: Date.now() - startedAt });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown research error.";
    await updateAudit(audit.id, { auditStatus: "Failed", status: "Failed", errorSummary: message });
    logEvent("error", "audit_job_failed", { requestId: auth.requestId, auditRunId: audit.id, userId: auth.user.email, durationMs: Date.now() - startedAt, error: message });
    return NextResponse.json({ error: `Research failed: ${message}` }, { status: 500 });
  }
}
