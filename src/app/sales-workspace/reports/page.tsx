import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { ReportDeleteButton } from "@/components/ReportDeleteButton";
import { EmptyState, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { listAudits, listReports } from "@/lib/server/repositories";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reportTypeLabel(type: Report["type"]) {
  if (type === "client_growth_due_diligence") return "Client-safe report";
  if (type === "sales_call_notes") return "Sales call notes";
  return "Internal brief";
}

export default async function ReportsPage() {
  const [audits, reports] = await Promise.all([listAudits(), listReports()]);
  const auditById = new Map(audits.map((audit) => [audit.id, audit]));
  const needsReview = reports.filter((report) => report.reportStatus === "Needs Review").length;
  const approved = reports.filter((report) => report.reportStatus === "Approved").length;
  const exported = reports.filter((report) => report.reportStatus === "Exported").length;
  const shared = reports.filter((report) => report.reportStatus === "Shared With Prospect").length;
  const internalBriefs = reports.filter((report) => report.type === "internal_sales_brief").length;
  const protectedExports = reports.filter((report) => report.type === "internal_sales_brief" && report.reportStatus === "Exported").length;
  const reportQueue = reports.filter((report) => report.type === "client_growth_due_diligence");
  const auditsAwaitingReport = audits.filter((audit) => !reports.some((report) => report.auditRunId === audit.id));

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Reports"
        title="Client-safe report queue"
        description="Track report readiness, review gates, internal briefs, and export status before anything reaches a prospect."
      />
      <div className="mb-5 grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <QueueCard label="Needs review" value={needsReview} detail="Open review queue" href="#report-queue" />
        <QueueCard label="Awaiting report" value={auditsAwaitingReport.length} detail="Open report editor" href="#awaiting-reports" />
        <QueueCard label="Approved" value={approved} detail="Ready to share" href="#report-queue" />
        <QueueCard label="Exported" value={exported} detail="Export status recorded" href="#report-queue" />
        <QueueCard label="Shared" value={shared} detail="Follow-up required" href="/sales-workspace/follow-ups" />
        <QueueCard label="Internal briefs" value={internalBriefs} detail={`${protectedExports} protected exports`} href="#report-queue" />
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel id="report-queue">
          <SectionTitle title="Report Queue" detail="Saved client-facing reports and their review status." />
          {reportQueue.length ? (
            <div className="space-y-3">
              {reportQueue.map((report) => {
                const audit = auditById.get(report.auditRunId);
                return (
                  <div key={report.id} className="grid gap-3 border-b border-stoneLine pb-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                    <div className="min-w-0">
                      <Link href={`/sales-audit/${report.auditRunId}/client-report`} className="truncate font-semibold text-ink hover:text-monk">
                        {audit?.businessName || report.leadId}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {reportTypeLabel(report.type)} - {audit?.assignedStrategist || "Reviewer unassigned"}
                      </p>
                    </div>
                    <Link href={`/sales-audit/${report.auditRunId}/client-report`} className="inline-flex">
                      <StatusBadge status={report.reportStatus} />
                    </Link>
                    <Link href={`/sales-audit/${report.auditRunId}/client-report`} className="text-sm font-semibold text-monk">Open report</Link>
                    <ReportDeleteButton reportId={report.id} reportName={audit?.businessName || report.leadId} />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No saved client reports yet"
              body="Open an audit, save a client report draft, and it will appear here for review and export control."
            />
          )}
        </Panel>
        <Panel>
          <SectionTitle title="Report Rules" />
          <div className="space-y-4 text-sm leading-6 text-muted">
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-sage" size={18} /><p>Export only after factual and language review.</p></div>
            <div className="flex gap-3"><FileText className="mt-0.5 shrink-0 text-monk" size={18} /><p>Internal briefs must never be shared with prospects.</p></div>
            <p>Every client PDF needs verified data, strategic inference, limitations, and next step.</p>
          </div>
        </Panel>
      </div>
      <Panel id="awaiting-reports" className="mt-6">
        <SectionTitle title="Audits Awaiting Report" detail="Open the report editor directly from this list." />
        {auditsAwaitingReport.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {auditsAwaitingReport.map((audit) => (
              <Link
                key={audit.id}
                href={`/sales-audit/${audit.id}/client-report`}
                className="group border border-stoneLine bg-ivory p-4 transition hover:border-monk hover:bg-paper"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink group-hover:text-monk">{audit.businessName}</p>
                    <p className="mt-1 text-sm text-muted">{audit.city} - {audit.category}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-monk" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={audit.auditStatus} />
                  <span className="text-sm font-semibold text-ink">Score {audit.score}</span>
                </div>
                <p className="mt-3 text-sm text-muted">Reviewer: {audit.assignedStrategist}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No audits awaiting reports" body="Completed audits with no saved client report will appear here." />
        )}
      </Panel>
    </ShellPage>
  );
}

function QueueCard({ label, value, detail, href }: { label: string; value: number; detail: string; href: string }) {
  return (
    <Link href={href} className="block min-h-[112px] border border-stoneLine bg-paper p-4 transition hover:border-monk hover:bg-ivory">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
        <ArrowRight size={15} className="text-monk" />
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-3 text-xs leading-5 text-muted">{detail}</p>
    </Link>
  );
}
