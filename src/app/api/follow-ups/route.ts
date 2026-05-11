import { NextResponse } from "next/server";
import { canAccess, requirePermission } from "@/lib/server/authz";
import { createFollowUp, listFollowUps } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "leads:view_own");
  if (!auth.ok) return auth.response;
  const followUps = await listFollowUps();
  return NextResponse.json({
    source: "repository",
    firestoreCollection: "follow_ups",
    followUps: followUps.filter((followUp) => canAccess(auth.user, { ...followUp, createdBy: followUp.createdBy, assignedTo: followUp.assignedTo, teamId: followUp.teamId, visibility: followUp.visibility }))
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "followup:create");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  const followUp = await createFollowUp({ ...payload, createdBy: auth.user.email });
  if (!followUp) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  return NextResponse.json({ source: "repository", followUp }, { status: 201 });
}
