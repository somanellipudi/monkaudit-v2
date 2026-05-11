import { NextResponse } from "next/server";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { createAudit, listAudits } from "@/lib/server/repositories";
import { filterAudits, paginate } from "@/lib/server/query";
import type { AuditMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "audit:view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const audits = await listAudits();
  const filtered = filterAudits(audits.filter((audit) => canAccess(auth.user, audit)), {
    q: url.searchParams.get("q") || undefined,
    city: url.searchParams.get("city") || undefined,
    country: url.searchParams.get("country") || undefined,
    owner: url.searchParams.get("owner") || undefined,
    reviewer: url.searchParams.get("reviewer") || undefined,
    teamId: url.searchParams.get("teamId") || undefined,
    auditStatus: url.searchParams.get("auditStatus") || undefined,
    auditMode: url.searchParams.get("auditMode") || undefined
  });
  const page = paginate(filtered, {
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 25)
  });
  return NextResponse.json({
    source: "repository",
    firestoreCollection: "audit_runs",
    audits: page.records,
    pagination: { page: page.page, pageSize: page.pageSize, total: page.total }
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "audit:create");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  const normalizedPayload = {
    ...payload,
    auditMode: normalizeAuditMode(payload.auditMode),
    googleMapsUrl: normalizeSourceLink(payload.googleMapsUrl),
    website: normalizeSourceLink(payload.website),
    instagramUrl: normalizeSourceLink(payload.instagramUrl),
    facebookUrl: normalizeSourceLink(payload.facebookUrl),
    otherPublicLink: normalizeSourceLink(payload.otherPublicLink)
  };
  const links = [
    normalizedPayload.googleMapsUrl,
    normalizedPayload.website,
    normalizedPayload.instagramUrl,
    normalizedPayload.facebookUrl,
    normalizedPayload.otherPublicLink
  ].map((value) => String(value || "").trim());
  const hasLead = Boolean(String(normalizedPayload.leadId || "").trim());

  if (!hasLead && links.every((link) => !link)) {
    return NextResponse.json({ error: "At least one public source link is required." }, { status: 400 });
  }

  const invalidLink = links.find((link) => link && !isLikelyUrl(link));
  if (invalidLink) {
    return NextResponse.json({ error: "Source links must start with http:// or https://." }, { status: 400 });
  }

  if (payload.auditMode && !normalizedPayload.auditMode) {
    return NextResponse.json({ error: "Invalid audit mode." }, { status: 400 });
  }

  const audit = await createAudit({ ...normalizedPayload, createdBy: auth.user.email });
  return NextResponse.json(
    {
      source: "repository",
      queued: true,
      queue: "growth-audit-research",
      nextStatus: "queued",
      audit
    },
    { status: 202 }
  );
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
