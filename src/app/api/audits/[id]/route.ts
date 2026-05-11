import { NextResponse } from "next/server";
import { scores } from "@/lib/mock-data";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { getAudit, updateAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "audit:view");
  if (!auth.ok) return auth.response;
  const audit = await getAudit(params.id);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (!canAccess(auth.user, audit)) return NextResponse.json({ error: "Audit not visible to this user." }, { status: 403 });
  return NextResponse.json({
    source: "repository",
    audit,
    scores,
    pipeline: [
      "normalize_business_data",
      "summarize_website_findings",
      "summarize_gbp_review_findings",
      "summarize_competitor_findings",
      "generate_scores",
      "generate_internal_sales_brief",
      "generate_client_safe_report",
      "run_client_language_cleanup"
    ]
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "audit:run");
  if (!auth.ok) return auth.response;
  const current = await getAudit(params.id);
  if (!current) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  if (!canAccess(auth.user, current)) return NextResponse.json({ error: "Audit not visible to this user." }, { status: 403 });
  const payload = await request.json();
  const audit = await updateAudit(params.id, {
    auditStatus: payload.auditStatus,
    status: payload.status,
    assignedStrategist: payload.assignedStrategist,
    nextFollowUpAt: payload.nextFollowUpAt,
    score: payload.score,
    rating: payload.rating,
    reviewCount: payload.reviewCount
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({ source: "repository", audit });
}
