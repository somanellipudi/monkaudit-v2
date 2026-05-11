import Link from "next/link";
import { PhoneCall, Send } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { FollowUpCompleteButton } from "@/components/FollowUpCompleteButton";
import { buttonClassName, PageHeader, Panel, SectionTitle, StatCard, StatusBadge } from "@/components/ui";
import { listFollowUps, listLeads } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const [followUps, leads] = await Promise.all([listFollowUps(), listLeads()]);
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = followUps.filter((followUp) => followUp.dueAt === today && followUp.status === "Pending").length;
  const overdue = followUps.filter((followUp) => followUp.dueAt < today && followUp.status === "Pending").length;
  const proposalFollowUps = followUps.filter((followUp) => leadMap.get(followUp.leadId)?.status === "Proposal Sent").length;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Follow-ups"
        title="Next action queue"
        description="A focused queue for calls, WhatsApp nudges, report follow-ups, and proposal-stage check-ins."
      />
      <div className="mb-5 grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Due today" value={String(dueToday)} detail="Call or WhatsApp" />
        <StatCard label="Overdue" value={String(overdue)} detail="Needs recovery" />
        <StatCard label="Pending follow-ups" value={String(followUps.filter((item) => item.status === "Pending").length)} detail="Owner action required" />
        <StatCard label="Proposal follow-ups" value={String(proposalFollowUps)} detail="Decision-stage records" />
      </div>
      <FilterBar context="follow-ups" />
      <Panel>
        <SectionTitle title="Follow-up Records" detail="Sorted by due date and owner responsibility." />
        <div className="space-y-3">
          {followUps.map((followUp) => {
            const lead = leadMap.get(followUp.leadId);
            const digitsOnlyPhone = lead?.phone?.replace(/\D/g, "");
            const isOverdue = followUp.status === "Pending" && followUp.dueAt < today;
            return (
              <div key={followUp.id} className={`grid gap-4 border-b border-stoneLine pb-4 last:border-0 lg:grid-cols-[minmax(0,1fr)_150px_120px_170px] ${isOverdue ? "bg-red-50 border-l-2 border-l-red-400" : ""}`}>
                <div className="min-w-0">
                  <Link href={`/leads/${followUp.leadId}`} className="truncate font-semibold text-ink hover:text-monk">
                    {lead?.businessName || followUp.leadId}
                  </Link>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {lead ? `${lead.city} - ` : ""}{followUp.nextAction}
                  </p>
                </div>
                <p className="text-sm text-muted">{followUp.assignedTo}</p>
                <p className="text-sm font-semibold text-ink">
                  {followUp.dueAt || "Not set"}
                  {isOverdue ? <span className="ml-2 border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Overdue</span> : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {followUp.channel === "Call" || followUp.channel === "WhatsApp" ? (
                    lead?.phone ? (
                      <a
                        href={followUp.channel === "Call" ? `tel:${lead.phone}` : `https://wa.me/${digitsOnlyPhone}`}
                        className={buttonClassName("secondary")}
                      >
                        <PhoneCall size={15} /> {followUp.channel}
                      </a>
                    ) : (
                      <span className={buttonClassName("secondary", "cursor-not-allowed opacity-50")}>
                        <PhoneCall size={15} /> No phone
                      </span>
                    )
                  ) : (
                    <Link href={`/leads/${followUp.leadId}`} className={buttonClassName("secondary")}>
                      <PhoneCall size={15} /> {followUp.channel}
                    </Link>
                  )}
                  <Link href={`/leads/${followUp.leadId}`} className={buttonClassName("ghost")}>
                    <Send size={15} /> Log / update
                  </Link>
                  <FollowUpCompleteButton followUpId={followUp.id} />
                </div>
                <div className="lg:col-span-4">
                  <StatusBadge status={followUp.status} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </ShellPage>
  );
}
