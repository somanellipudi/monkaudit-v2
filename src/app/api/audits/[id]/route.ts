import { NextResponse } from "next/server";
import { scores } from "@/lib/mock-data";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { getAudit, updateAudit } from "@/lib/server/repositories";
import type { AuditMode } from "@/lib/types";

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
  const sourceLinks = {
    ...current.sourceLinks,
    googleMapsUrl: normalizeSourceLink(payload.googleMapsUrl ?? payload.sourceLinks?.googleMapsUrl ?? current.sourceLinks?.googleMapsUrl),
    website: normalizeSourceLink(payload.website ?? payload.sourceLinks?.website ?? current.sourceLinks?.website),
    instagramUrl: normalizeSourceLink(payload.instagramUrl ?? payload.sourceLinks?.instagramUrl ?? current.sourceLinks?.instagramUrl),
    facebookUrl: normalizeSourceLink(payload.facebookUrl ?? payload.sourceLinks?.facebookUrl ?? current.sourceLinks?.facebookUrl),
    otherPublicLink: normalizeSourceLink(payload.otherPublicLink ?? payload.sourceLinks?.otherPublicLink ?? current.sourceLinks?.otherPublicLink)
  };
  const auditMode = normalizeAuditMode(payload.auditMode);

  if (payload.auditMode && !auditMode) {
    return NextResponse.json({ error: "Invalid audit mode." }, { status: 400 });
  }

  const links = Object.values(sourceLinks).map((value) => String(value || "").trim());
  const invalidLink = links.find((link) => link && !isLikelyUrl(link));
  if (invalidLink) {
    return NextResponse.json({ error: "Source links must start with http:// or https://." }, { status: 400 });
  }

  const audit = await updateAudit(params.id, {
    businessName: stringValue(payload.businessName, current.businessName),
    city: stringValue(payload.city, current.city),
    country: stringValue(payload.country, current.country),
    area: stringValue(payload.area, current.area),
    category: stringValue(payload.category, current.category),
    auditMode: auditMode ?? current.auditMode,
    sourceLinks,
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

function stringValue(value: unknown, fallback: string) {
  return value === undefined ? fallback : String(value || "").trim();
}

function normalizeSourceLink(value: unknown) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeAuditMode(value: unknown): AuditMode | undefined {
  const map: Record<string, AuditMode> = {
    quick: "quick",
    deep: "deep",
    pre_proposal: "pre_proposal",
    "Quick Audit": "quick",
    "Deep Audit": "deep",
    "Pre-Proposal Audit": "pre_proposal"
  };
  const key = String(value || "").trim();
  return key ? map[key] : undefined;
}
