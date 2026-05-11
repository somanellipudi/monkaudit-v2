import { NextResponse } from "next/server";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { createLead, listLeads } from "@/lib/server/repositories";
import { filterLeads, paginate } from "@/lib/server/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "leads:view_own");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const leads = await listLeads();
  const filtered = filterLeads(leads.filter((lead) => canAccess(auth.user, lead)), {
    q: url.searchParams.get("q") || undefined,
    city: url.searchParams.get("city") || undefined,
    country: url.searchParams.get("country") || undefined,
    area: url.searchParams.get("area") || undefined,
    category: url.searchParams.get("category") || undefined,
    owner: url.searchParams.get("owner") || undefined,
    reviewer: url.searchParams.get("reviewer") || undefined,
    teamId: url.searchParams.get("teamId") || undefined,
    leadSource: url.searchParams.get("leadSource") || undefined,
    leadStatus: url.searchParams.get("leadStatus") || undefined,
    salesStage: url.searchParams.get("salesStage") || undefined,
    visibility: url.searchParams.get("visibility") || undefined
  });
  const page = paginate(filtered, {
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 25)
  });
  return NextResponse.json({
    source: "repository",
    firestoreCollection: "leads",
    leads: page.records,
    pagination: { page: page.page, pageSize: page.pageSize, total: page.total }
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "leads:create");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  const lead = await createLead({ ...payload, createdBy: auth.user.email, assignedTo: payload.assignedTo || auth.user.email, teamId: payload.teamId || auth.user.teamId });
  return NextResponse.json({ source: "repository", lead }, { status: 201 });
}
