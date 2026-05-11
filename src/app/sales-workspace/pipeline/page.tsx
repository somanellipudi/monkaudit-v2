import Link from "next/link";
import { ShellPage } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader, Panel, SectionTitle, StatCard, StatusBadge } from "@/components/ui";
import { listLeads } from "@/lib/server/repositories";
import type { SalesStage } from "@/lib/types";

const stages: SalesStage[] = ["Research Pending", "Audit Requested", "Audit Completed", "Report Ready", "Follow-up Due", "Proposal Sent"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scoreChip(score: number) {
  if (score === 0) return { className: "border-stoneLine bg-ivory text-muted", label: "—" };
  if (score <= 39) return { className: "border-red-200 bg-red-50 text-red-800", label: String(score) };
  if (score <= 64) return { className: "border-amber-200 bg-amber-50 text-amber-800", label: String(score) };
  if (score <= 79) return { className: "border-green-200 bg-green-50 text-green-800", label: String(score) };
  return { className: "border-emerald-300 bg-emerald-50 text-emerald-900", label: String(score) };
}

export default async function PipelinePage() {
  const leads = await listLeads();
  const today = new Date();
  const activeLeads = leads.filter((lead) => !["Won", "Lost"].includes(lead.salesStage) && lead.leadStatus !== "Archived");
  const followUpDue = leads.filter((lead) => lead.salesStage === "Follow-up Due").length;
  const proposalStage = leads.filter((lead) => lead.salesStage === "Proposal Sent").length;
  const reviewDependency = leads.filter((lead) => lead.salesStage === "Report Ready").length;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="My Pipeline"
        title="Prospects by next sales stage"
        description="A board-style view for ownership, next action, and movement. Use it to see where each prospect is stuck."
      />
      <div className="mb-5 grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Active prospects" value={String(activeLeads.length)} detail="Open sales motion" />
        <StatCard label="Follow-up due" value={String(followUpDue)} detail="Needs owner action" />
        <StatCard label="Proposal stage" value={String(proposalStage)} detail="Commercial conversation" />
        <StatCard label="Reports ready" value={String(reviewDependency)} detail="Needs review or sharing" />
      </div>
      <FilterBar context="pipeline" />
      <div className="max-w-full overflow-x-auto">
        <div className="grid min-w-[1340px] gap-4 xl:grid-cols-6">
          {stages.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.salesStage === stage);
            return (
              <Panel key={stage} className="min-h-[420px]">
                <SectionTitle title={stage} detail={`${stageLeads.length} records`} />
                {stageLeads.length ? (
                  <div className="space-y-3">
                    {stageLeads.map((lead) => {
                      const score = lead.growthReadinessScore !== undefined ? scoreChip(lead.growthReadinessScore) : null;
                      const daysSinceUpdate = Math.floor((today.getTime() - new Date(lead.updatedAt).getTime()) / 86400000);
                      return (
                        <div key={`${stage}-${lead.id}`} className="border border-stoneLine bg-ivory p-4">
                          <Link href={`/leads/${lead.id}`} className="font-semibold text-ink hover:text-monk">{lead.businessName}</Link>
                          <p className="mt-2 text-sm leading-6 text-muted">{lead.city} - {lead.category}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <StatusBadge status={lead.salesStage} />
                            <div className="flex gap-2">
                              <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-monk">Open</Link>
                              <Link href={`/sales-audit/new?leadId=${lead.id}`} className="text-sm font-semibold text-monk">Research</Link>
                            </div>
                          </div>
                          {score ? (
                            <span className={`mt-3 inline-flex min-w-10 justify-center border px-2.5 py-1 text-xs font-semibold ${score.className}`}>
                              {score.label}
                            </span>
                          ) : null}
                          <p className="mt-3 text-xs text-muted">Owner: {lead.assignedTo}</p>
                          <p className="mt-2 text-xs font-semibold text-ink">{lead.nextAction}</p>
                          {stage === "Proposal Sent" && daysSinceUpdate > 7 ? (
                            <span className="mt-2 block text-xs font-semibold text-amber-700">
                              {daysSinceUpdate}d since last update — chase?
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid min-h-[260px] place-items-center border border-dashed border-stoneLine bg-ivory p-5 text-center">
                    <div>
                      <p className="text-sm font-semibold text-ink">No records here</p>
                      <p className="mt-2 text-xs leading-5 text-muted">When a prospect reaches this stage, it will appear in this lane.</p>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      </div>
    </ShellPage>
  );
}
