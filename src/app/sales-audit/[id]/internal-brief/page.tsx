import Link from "next/link";
import { InternalBriefPanel } from "@/components/InternalBriefPanel";
import { InternalBriefSaveControl } from "@/components/InternalBriefSaveControl";
import { EmptyState, Panel, StatusBadge, buttonClassName } from "@/components/ui";
import { getAudit, listReportsForAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DynamicInternalBriefPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  const reports = audit ? await listReportsForAudit(params.id) : [];
  const report = reports
    .filter((item) => item.type === "internal_sales_brief")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!audit) return null;

  const briefReady = audit.score > 0 && audit.status !== "Research Running";
  const markdown = report?.internalBriefMarkdown || report?.markdown || String(audit.finalDataUsed?.internalSalesBrief || "");
  const generation = parseGeneration(audit.finalDataUsed?.generation);

  return (
    <>
      <Panel className="mb-5 p-4">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ReviewFact label="Audit status" value={<StatusBadge status={audit.status} />} />
            <ReviewFact label="Confidence" value={briefReady ? "Medium" : "Pending"} detail="Public-source coverage" />
            <ReviewFact label="AI generation" value={generation?.status === "gemini_generated" ? "Gemini" : "Fallback"} detail={generation?.model || "No model run"} />
            <ReviewFact label="Suggested offer" value={briefReady ? "Sprint" : "Pending"} detail="Visibility and funnel" />
            <ReviewFact label="Next step" value={briefReady ? "Review" : "Complete research"} detail="Before client sharing" />
          </div>
          {briefReady ? (
            <div className="min-w-0 border-t border-stoneLine pt-4">
              <InternalBriefSaveControl auditRunId={audit.id} leadId={audit.leadId} markdown={markdown} />
            </div>
          ) : null}
        </div>
      </Panel>

      {briefReady ? (
        <InternalBriefPanel markdown={markdown} />
      ) : (
        <EmptyState
          title="Internal brief is not ready"
          body="Complete the research stage before generating pitch angles, objection handling, and suggested offers."
          action={<Link href={`/sales-audit/${audit.id}`} className={buttonClassName()}>Open audit control</Link>}
        />
      )}
    </>
  );
}

function ReviewFact({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-2 text-base font-semibold leading-6 text-ink">{value}</div>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted">{detail}</p> : null}
    </div>
  );
}

function parseGeneration(value: unknown) {
  const candidate = value as { model?: unknown; status?: unknown };
  if (!candidate || typeof candidate.status !== "string") return null;
  return {
    model: typeof candidate.model === "string" ? candidate.model : "",
    status: candidate.status
  };
}
