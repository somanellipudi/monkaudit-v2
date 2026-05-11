import Link from "next/link";
import { ShellPage } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState, PageHeader, Panel, SectionTitle, StatCard, StatusBadge } from "@/components/ui";
import { listLeads } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WonLostPage() {
  const leads = await listLeads();
  const won = leads.filter((lead) => lead.salesStage === "Won").length;
  const lost = leads.filter((lead) => lead.salesStage === "Lost").length;
  const proposalSent = leads.filter((lead) => lead.salesStage === "Proposal Sent").length;
  const archived = leads.filter((lead) => lead.leadStatus === "Archived").length;
  const closed = won + lost;
  const conversionRate = Math.round((won / Math.max(1, closed)) * 100);
  const outcomeRecords = leads.filter((lead) => ["Won", "Lost", "Proposal Sent"].includes(lead.salesStage) || lead.leadStatus === "Archived");

  const outcomeHealth =
    closed === 0
      ? "Not enough closed records yet"
      : conversionRate >= 50
        ? "Strong close quality"
        : "Review lost reasons";

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Won/Lost"
        title="Outcome and conversion review"
        description="Review proposals, won/lost outcomes, and archived prospects without mixing them into daily pipeline noise."
      />
      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Deals won" value={String(won)} detail="Closed won in pipeline" />
        <StatCard label="Lost" value={String(lost)} detail="Closed without conversion" />
        <StatCard label="Proposal sent" value={String(proposalSent)} detail="Commercial conversation" />
        <StatCard label="Conversion rate" value={`${conversionRate}%`} detail={outcomeHealth} />
        <StatCard label="Archived" value={String(archived)} detail="No active sales motion" />
      </div>
      <div className="mt-6"><FilterBar context="won and lost prospects" /></div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <SectionTitle title="Outcome Records" detail="Only proposal, closed, and archived records appear here." />
          {outcomeRecords.length ? (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="border-b border-stoneLine bg-ivory text-xs uppercase tracking-[0.14em] text-muted">
                  <tr>{["Business", "Owner", "Stage", "Outcome reason", "Next step"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {outcomeRecords.map((lead) => {
                    const isWon = lead.salesStage === "Won";
                    return (
                      <tr key={lead.id} className="border-b border-stoneLine last:border-0">
                        <td className="px-3 py-4">
                          <Link href={`/leads/${lead.id}`} className="font-semibold text-ink hover:text-monk">{lead.businessName}</Link>
                          <p className="mt-1 text-xs text-muted">{lead.city} - {lead.category}</p>
                        </td>
                        <td className="px-3 py-4 text-muted">{lead.assignedTo}</td>
                        <td className="px-3 py-4"><StatusBadge status={lead.salesStage} /></td>
                        <td className="px-3 py-4 text-muted">
                          {lead.lostReason || (lead.salesStage === "Lost" ? "Reason not recorded" : "—")}
                        </td>
                        <td className="px-3 py-4 text-muted">
                          {isWon ? (lead.wonNotes || "Prepare post-sale handoff") : lead.salesStage === "Lost" ? "Archive or revisit" : "Clarify decision date"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No closed outcomes yet"
              body="When a prospect is marked Proposal Sent, Won, Lost, or Archived, it will appear here for manager review and learning."
            />
          )}
        </Panel>

        <Panel>
          <SectionTitle title="Manager Review" detail="Keep this page focused on sales learning." />
          <div className="space-y-4 text-sm leading-6 text-muted">
            <div className="border border-stoneLine bg-ivory p-4">
              <p className="font-semibold text-ink">Reason discipline</p>
              <p className="mt-2">Lost records should identify fit, budget, timing, trust, or offer mismatch.</p>
            </div>
            <div className="border border-stoneLine bg-ivory p-4">
              <p className="font-semibold text-ink">Phase 1 boundary</p>
              <p className="mt-2">Won records stay in the sales loop until handoff notes, source audit, and owner are clear.</p>
            </div>
            <div className="border border-stoneLine bg-ivory p-4">
              <p className="font-semibold text-ink">Report quality</p>
              <p className="mt-2">Compare shared reports against won and lost records to improve pitch intelligence.</p>
            </div>
          </div>
        </Panel>
      </div>
    </ShellPage>
  );
}
