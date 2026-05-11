import { NextResponse } from "next/server";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { getLead, updateLead } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "leads:view_own");
  if (!auth.ok) return auth.response;
  const lead = await getLead(params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  if (!canAccess(auth.user, lead)) {
    return NextResponse.json({ error: "Lead not visible to this user." }, { status: 403 });
  }
  return NextResponse.json({ source: "repository", lead });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "leads:edit");
  if (!auth.ok) return auth.response;
  const current = await getLead(params.id);
  if (!current) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  if (!canAccess(auth.user, current)) return NextResponse.json({ error: "Lead not visible to this user." }, { status: 403 });
  const payload = await request.json();
  if ((payload.assignedTo || payload.assignedStrategist || payload.visibility) && !auth.user.roleIds.some((role) => role === "owner" || role === "admin" || role === "sales_manager")) {
    return NextResponse.json({ error: "Only managers and admins can assign ownership or visibility." }, { status: 403 });
  }
  const lead = await updateLead(params.id, {
    status: payload.status,
    leadStatus: payload.leadStatus,
    salesStage: payload.salesStage,
    nextAction: payload.nextAction,
    nextFollowUpAt: payload.nextFollowUpAt,
    salesContext: payload.salesContext,
    lostReason: payload.lostReason,
    wonNotes: payload.wonNotes,
    assignedTo: payload.assignedTo,
    assignedStrategist: payload.assignedStrategist,
    visibility: payload.visibility,
    updatedBy: auth.user.email
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ source: "repository", lead });
}
