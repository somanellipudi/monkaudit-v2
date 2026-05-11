import Link from "next/link";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { PageHeader, Panel, SectionTitle, StatCard, StatusBadge, buttonClassName } from "@/components/ui";
import { listAudits, listFollowUps, listLeads } from "@/lib/server/repositories";
import type { AuditRun } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isReportOpenable(audit: AuditRun) {
  return ["Research Completed", "Needs Review", "Approved"].includes(audit.auditStatus);
}

function primaryAuditHref(audit: AuditRun) {
  return isReportOpenable(audit) ? `/sales-audit/${audit.id}/client-report` : `/sales-audit/${audit.id}`;
}

function primaryAuditAction(audit: AuditRun) {
  if (audit.auditStatus === "Research Completed") return "Open report";
  if (audit.auditStatus === "Needs Review") return "Review report";
  if (audit.auditStatus === "Approved") return "Open approved report";
  return "Open audit";
}

export default async function OverviewPage() {
  const [audits, leads, followUps] = await Promise.all([listAudits(), listLeads(), listFollowUps()]);
  const today = new Date().toISOString().slice(0, 10);
  const openFollowUps = followUps.filter((followUp) => followUp.status === "Pending");
  const dueFollowUps = openFollowUps.filter((followUp) => followUp.dueAt <= today).length;
  const reportQueue = audits.filter((audit) => isReportOpenable(audit));
  const runningAudits = audits.filter((audit) => audit.auditStatus === "Research Running").length;
  const recentAudits = [...audits].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 6);

  return (
    <ShellPage>
      <PageHeader
        eyebrow="MonkAudit"
        title="MonkAudit"
        description="Run audits, open reports, and work follow-ups from one focused queue."
        action={
          <Link href="/sales-audit/new" className={buttonClassName()}>
            <Plus size={16} /> New MonkAudit
          </Link>
        }
      />

      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <Link href="/sales-audit/new" className="border border-stoneLine bg-paper p-5 transition hover:border-monk hover:bg-ivory">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Start</span>
            <ArrowRight size={16} className="text-monk" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-ink">New audit</p>
          <p className="mt-2 text-sm text-muted">Create from Maps, website, or social links.</p>
        </Link>
        <StatCard label="Audits" value={String(audits.length)} detail={`${runningAudits} running`} />
        <Link href="/sales-workspace/reports" className="border border-stoneLine bg-paper p-5 transition hover:border-monk hover:bg-ivory">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Reports</span>
            <FileText size={16} className="text-monk" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-ink">{reportQueue.length}</p>
          <p className="mt-2 text-sm text-muted">Ready to open or review.</p>
        </Link>
        <Link href="/sales-workspace/follow-ups" className="border border-stoneLine bg-paper p-5 transition hover:border-monk hover:bg-ivory">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Follow-ups</span>
            <ArrowRight size={16} className="text-monk" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-ink">{dueFollowUps}</p>
          <p className="mt-2 text-sm text-muted">Due or overdue today.</p>
        </Link>
        <StatCard label="Leads" value={String(leads.length)} detail="Visible records" />
      </div>

      <Panel className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <SectionTitle title="Recent MonkAudits" detail="Click a report-ready record to open the client report directly." />
          <Link href="/sales-audit" className="shrink-0 text-sm font-semibold text-monk">
            View all
          </Link>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-stoneLine text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                {["Business", "Market", "Owner", "Score", "Status", "Next step"].map((heading) => (
                  <th key={heading} className="px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAudits.map((audit) => {
                const href = primaryAuditHref(audit);
                return (
                  <tr key={audit.id} className="border-b border-stoneLine last:border-0 hover:bg-ivory">
                    <td className="px-3 py-4">
                      <Link href={href} className="font-semibold text-ink hover:text-monk">
                        {audit.businessName}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-muted">{audit.city}, {audit.country}</td>
                    <td className="px-3 py-4 text-muted">{audit.assignedTo}</td>
                    <td className="px-3 py-4 font-semibold text-ink">{audit.score}</td>
                    <td className="px-3 py-4">
                      <Link href={href} className="inline-flex">
                        <StatusBadge status={audit.auditStatus} />
                      </Link>
                    </td>
                    <td className="px-3 py-4">
                      <Link href={href} className="font-semibold text-monk">
                        {primaryAuditAction(audit)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!recentAudits.length ? (
            <p className="py-8 text-sm text-muted">No audits yet. Start a new MonkAudit to create the first record.</p>
          ) : null}
        </div>
      </Panel>
    </ShellPage>
  );
}
