import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, FileText, PhoneCall } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { PageHeader, Panel, SectionTitle, StatCard, StatusBadge, buttonClassName } from "@/components/ui";
import { listAudits, listFollowUps, listLeads } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SalesWorkspacePage() {
  const [audits, leads, followUps] = await Promise.all([listAudits(), listLeads(), listFollowUps()]);
  const needsReview = audits.filter((audit) => audit.status === "Needs Review").length;
  const won = leads.filter((lead) => lead.salesStage === "Won").length;
  const proposalSent = leads.filter((lead) => lead.salesStage === "Proposal Sent").length;
  const today = new Date().toISOString().slice(0, 10);
  const openFollowUps = followUps.filter((followUp) => followUp.status === "Pending");
  const followUpsDue = openFollowUps.filter((followUp) => followUp.dueAt <= today).length;
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const todayQueue = openFollowUps.slice(0, 5).map((followUp) => {
    const lead = leadMap.get(followUp.leadId);
    const Icon = followUp.channel === "Call" ? PhoneCall : followUp.channel === "Email" ? FileText : CalendarCheck;
    return {
      label: followUp.channel,
      business: lead?.businessName || followUp.leadId,
      note: followUp.nextAction,
      due: followUp.dueAt,
      href: lead ? `/leads/${lead.id}` : "/leads",
      icon: Icon
    };
  });

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Sales Workspace"
        title="Work the right prospects today."
        description="A focused operating view for follow-ups, running audits, report readiness, and sales movement. Use Leads and Audits for full database filtering."
        action={
          <Link href="/sales-audit/new" className={buttonClassName()}>
            New MonkAudit <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Follow-ups due" value={String(followUpsDue)} detail="Owner action needed" />
        <StatCard label="Running audits" value={String(audits.filter((audit) => audit.status === "Research Running").length)} detail="Research in progress" />
        <StatCard label="Reports to review" value={String(needsReview)} detail="Before client sharing" />
        <StatCard label="Proposals sent" value={String(proposalSent)} detail="Commercial conversations" />
        <StatCard label="Deals won" value={String(won)} detail="Closed in pipeline" />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionTitle title="Today's Queue" detail="A short, opinionated list. The salesperson should not need to hunt." />
          <div className="space-y-3">
            {todayQueue.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.business} href={item.href} className="grid gap-4 border-b border-stoneLine pb-4 transition last:border-0 hover:text-monk md:grid-cols-[36px_minmax(0,1fr)_auto]">
                  <span className="grid h-9 w-9 place-items-center border border-stoneLine bg-ivory text-monk">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.business}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.label} - {item.note}</p>
                  </div>
                  <span className="text-sm font-semibold text-muted">{item.due}</span>
                </Link>
              );
            })}
            {!todayQueue.length ? (
              <p className="text-sm leading-6 text-muted">No open follow-ups are queued. Use Leads or Audits to create the next sales action.</p>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Pipeline Signals" detail="Manager-grade signals without turning this into a CRM wall." />
          <div className="space-y-4">
            {[
              ["Lead coverage", `${leads.length} active prospects`],
              ["Review queue", `${needsReview} reports need review`],
              ["Overdue follow-ups", `${followUpsDue} records`],
              ["Won / lost", `${leads.filter((lead) => lead.salesStage === "Won").length} won - ${leads.filter((lead) => lead.salesStage === "Lost").length} lost`]
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-stoneLine pb-3 last:border-0">
                <span className="text-sm text-muted">{label}</span>
                <span className="text-sm font-semibold text-ink">{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel>
          <SectionTitle title="Recently Moved" detail="Latest status changes across visible prospects." />
          <div className="space-y-3">
            {leads
              .slice()
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 4)
              .map((lead) => (
              <div key={lead.id} className="grid gap-3 border-b border-stoneLine pb-3 last:border-0 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{lead.businessName}</p>
                  <p className="mt-1 text-sm text-muted">{lead.city} - Assigned Owner: {lead.assignedTo}</p>
                </div>
                <StatusBadge status={lead.status} />
                <span className="flex items-center gap-1 text-sm font-semibold text-sage">
                  <CheckCircle2 size={15} /> Updated
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </ShellPage>
  );
}
