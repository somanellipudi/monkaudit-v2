import Link from "next/link";
import { PitchPackWorkspace } from "@/components/PitchPackWorkspace";
import { EmptyState, buttonClassName } from "@/components/ui";
import { buildPitchPack } from "@/lib/sales-pitch";
import { getAudit, getLead, listReportsForAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PitchPackPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  if (!audit) return null;

  const hasCompletedResearch = audit.score > 0 && audit.auditStatus !== "Research Running";
  if (!hasCompletedResearch) {
    return (
      <EmptyState
        title="Pitch pack is not ready"
        body="Complete the public-source research first so the pitch can use real audit findings, competitor proof, and careful sales language."
        action={<Link href={`/sales-audit/${audit.id}`} className={buttonClassName()}>Open audit control</Link>}
      />
    );
  }

  const lead = await getLead(audit.leadId);
  const reports = await listReportsForAudit(audit.id);
  const callNotes = reports
    .filter((item) => item.type === "sales_call_notes")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const pitch = buildPitchPack(audit, lead);

  return <PitchPackWorkspace pitch={pitch} callNotesMarkdown={callNotes?.salesCallNotesMarkdown || callNotes?.markdown || ""} />;
}
