import Link from "next/link";
import { MarkdownDocument } from "@/components/MarkdownDocument";
import { PrintButton } from "@/components/PrintButton";
import { EmptyState, Panel, StatusBadge } from "@/components/ui";
import { getAudit, listReportsForAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SalesCallNotesPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  const reports = audit ? await listReportsForAudit(params.id) : [];
  const report = reports
    .filter((item) => item.type === "sales_call_notes")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const markdown = report?.salesCallNotesMarkdown || report?.markdown || "";

  if (!audit) return null;

  if (!report && audit.score === 0) {
    return (
      <EmptyState
        title="Call notes not ready"
        body="Complete research first. Call notes are generated alongside the internal brief."
        action={<Link href={`/sales-audit/${audit.id}`} className="inline-flex h-10 items-center gap-2 bg-monk px-5 text-[13px] font-semibold text-paper">Open audit</Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk">Sales call notes</p>
            <h2 className="mt-2 truncate text-2xl font-semibold text-ink">{audit.businessName}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`inline-flex min-w-10 justify-center border px-2.5 py-1 text-xs font-semibold ${scoreChip(audit.score)}`}>
                {audit.score ? audit.score : "—"}
              </span>
              <StatusBadge status={report?.reportStatus || audit.auditStatus} />
            </div>
          </div>
          <PrintButton label="Print call notes" />
        </div>
      </Panel>
      <MarkdownDocument markdown={markdown} />
    </div>
  );
}

function scoreChip(score: number) {
  if (score === 0) return "border-stoneLine bg-ivory text-muted";
  if (score <= 39) return "border-red-200 bg-red-50 text-red-800";
  if (score <= 64) return "border-amber-200 bg-amber-50 text-amber-800";
  if (score <= 79) return "border-green-200 bg-green-50 text-green-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-900";
}
