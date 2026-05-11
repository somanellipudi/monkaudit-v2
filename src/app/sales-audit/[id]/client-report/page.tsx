import Link from "next/link";
import { ReportSectionEditor } from "@/components/ReportSectionEditor";
import { EmptyState, Panel, buttonClassName } from "@/components/ui";
import { getAudit, listReportsForAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DynamicClientReportPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  const reports = audit ? await listReportsForAudit(params.id) : [];
  const report = reports
    .filter((item) => item.type === "client_growth_due_diligence")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!audit) return null;

  const reportReady = audit.score > 0 && audit.status !== "Research Running";
  const markdown = report?.clientReportMarkdown || report?.markdown || String(audit.finalDataUsed?.clientSafeNarrative || "");
  const scoreBreakdown = parseScoreBreakdown(audit.finalDataUsed?.scoreBreakdown);
  const preparedDate = new Date(report?.updatedAt || audit.lastUpdated || Date.now()).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <>
      <style>{`
        @media print {
          nav, aside, [data-no-print], .no-print { display: none !important; }
          body { background: white; color: black; font-size: 12pt; }
          h1 { font-size: 18pt; }
          h2 { font-size: 14pt; margin-top: 16pt; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc; padding: 6pt; font-size: 10pt; }
          a { color: inherit; text-decoration: none; }
          .shadow-calm, .shadow-sm { box-shadow: none !important; }
        }
      `}</style>
      <div className="mb-5 border border-stoneLine bg-paper p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk">Client-ready draft</p>
            <h2 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight text-ink md:text-3xl">{audit.businessName}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Public-source growth audit for {audit.category || "local business"} visibility, reputation, competitor position, social proof, conversion flow, and next-step execution.
            </p>
          </div>
          <div className="grid gap-3 text-sm">
            <ClientFact label="Prepared" value={preparedDate} />
            <ClientFact label="Market" value={[audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "Needs review"} />
            <ClientFact label="Growth readiness" value={audit.score ? `${audit.score}/100` : "Pending"} />
            <ClientFact label="Review status" value={reportReady ? "Needs strategist review" : "Research pending"} />
          </div>
        </div>
        <div data-no-print className="mt-6 flex flex-wrap gap-2">
          <EvidenceBadge label="Verified" />
          <EvidenceBadge label="Observed" />
          <EvidenceBadge label="Inferred" />
          <EvidenceBadge label="Needs Manual Review" />
          <EvidenceBadge label="Not Found" />
        </div>
      </div>

      <div data-no-print className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scoreBreakdown.slice(0, 4).map((score) => (
          <Panel key={score.label} className="bg-paper p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{score.label}</p>
            <p className="mt-3 text-2xl font-semibold text-ink">{score.value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{score.detail || "Directional score from public-source evidence."}</p>
          </Panel>
        ))}
      </div>

      {reportReady ? (
        <ReportSectionEditor markdown={markdown} businessName={audit.businessName} preparedDate={preparedDate} />
      ) : (
        <EmptyState
          title="Client report is not ready"
          body="Complete research or mark the audit as Research Completed before drafting a client-safe report. This prevents fake precision and unsupported claims."
          action={<Link href={`/sales-audit/${audit.id}`} className={buttonClassName()}>Open audit control</Link>}
        />
      )}
    </>
  );
}

function parseScoreBreakdown(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { label: string; value: number; detail?: string } => {
    const candidate = item as { label?: unknown; value?: unknown };
    return typeof candidate.label === "string" && typeof candidate.value === "number";
  });
}

function ClientFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stoneLine pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function EvidenceBadge({ label }: { label: string }) {
  return <span className="border border-stoneLine bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>;
}
