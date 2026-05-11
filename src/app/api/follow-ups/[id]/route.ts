import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/authz";
import { updateFollowUp } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, "followup:complete");
  if (!auth.ok) return auth.response;
  const payload = await request.json();
  const followUp = await updateFollowUp(params.id, payload);
  if (!followUp) {
    return NextResponse.json({ error: "Follow-up not found." }, { status: 404 });
  }
  return NextResponse.json({ source: "repository", followUp });
}
