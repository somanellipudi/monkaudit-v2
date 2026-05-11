import Link from "next/link";
import { AlertTriangle, FileText, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { AuditTable } from "@/components/AuditTable";
import { FilterBar } from "@/components/FilterBar";
import { Button, PageHeader, Panel, SectionTitle, StatCard, StatusBadge, buttonClassName } from "@/components/ui";
import { getSession, listAudits } from "@/lib/server/repositories";
import { auditModeLabel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SalesAuditPage() {
  const [audits, session] = await Promise.all([listAudits(), getSession()]);
  const user = session.user || undefined;
  const needsReview = audits.filter((audit) => audit.auditStatus === "Needs Review").length;
  const running = audits.filter((audit) => audit.auditStatus === "Research Running").length;
  const approved = audits.filter((audit) => audit.auditStatus === "Approved").length;
  const failed = audits.filter((audit) => audit.auditStatus === "Failed").length;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="MonkAudit"
        title="MonkAudit control room"
        description="Run prospect research, monitor audit status, review client-safe reports, and keep unsupported claims out of sales materials."
        action={
          <Link href="/sales-audit/new" className={buttonClassName()}>
            <Plus size={16} /> New Audit
          </Link>
        }
      />

      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Total audits" value={String(audits.length)} detail="Visible records" />
        <StatCard label="Research running" value={String(running)} detail="Worker queue" />
        <StatCard label="Needs review" value={String(needsReview)} detail="Before client sharing" />
        <StatCard label="Approved" value={String(approved)} detail="Client-safe reports" />
        <StatCard label="Failed jobs" value={String(failed)} detail="Retry from detail view" />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <SectionTitle title="Review Queue" detail="Reports that need human judgment before export or sharing." />
          <div className="space-y-3">
            {audits.filter((audit) => audit.auditStatus === "Needs Review" || audit.auditStatus === "Research Completed").map((audit) => (
              <div key={audit.id} className="grid gap-3 border-b border-stoneLine pb-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="min-w-0">
                  <Link href={`/sales-audit/${audit.id}/client-report`} className="truncate font-semibold text-ink hover:text-monk">
                    {audit.businessName}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{audit.city} - {auditModeLabel(audit.auditMode)} - Reviewer: {audit.assignedStrategist}</p>
                </div>
                <StatusBadge status={audit.auditStatus} />
                <Link href={`/sales-audit/${audit.id}/client-report`} className="text-sm font-semibold text-monk">Open report</Link>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle title="Audit Guardrails" />
            <div className="space-y-4 text-sm leading-6 text-muted">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-sage" size={18} />
                <p>Separate verified public data from strategic inference.</p>
              </div>
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-monk" size={18} />
                <p>Never claim exact revenue loss, guaranteed rankings, or unsupported performance impact.</p>
              </div>
              <div className="flex gap-3">
                <FileText className="mt-0.5 shrink-0 text-monk" size={18} />
                <p>Client reports must include limitations and access required to confirm performance.</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Operational Notes" />
            <div className="space-y-3 text-sm">
              {[
                ["Preferred start", "Google Maps / GBP link"],
                ["Storage", "Cloud Storage for PDFs and raw research"],
                ["Review gate", "Required for pre-proposal audits"],
                ["Retry path", "Failed jobs reopen from detail page"]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-stoneLine pb-3 last:border-0">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <FilterBar context="audits" />
      </div>

      <Panel>
        <div className="mb-4 flex items-center justify-between gap-4">
          <SectionTitle title="Audit Records" detail="Full audit database with owner, reviewer, visibility, mode, score, status, and next follow-up." />
          <Button variant="secondary"><RotateCcw size={16} /> Refresh</Button>
        </div>
        <AuditTable audits={audits} user={user} />
      </Panel>
    </ShellPage>
  );
}
