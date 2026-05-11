import Link from "next/link";
import { Plus } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader, Panel, SectionTitle, StatCard, StatusBadge, buttonClassName, tableHeadClassName } from "@/components/ui";
import { canSeeRecord } from "@/lib/rbac";
import { getSession, listLeads } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, session] = await Promise.all([listLeads(), getSession()]);
  const currentUser = session.user;
  const visibleLeads = currentUser ? leads.filter((lead) => canSeeRecord(currentUser.roleIds, currentUser, lead)) : [];
  const followUpDue = visibleLeads.filter((lead) => lead.salesStage === "Follow-up Due").length;
  const proposalSent = visibleLeads.filter((lead) => lead.salesStage === "Proposal Sent").length;
  const today = new Date();

  function daysSince(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return Math.floor((today.getTime() - d.getTime()) / 86400000);
  }

  function lastContactLabel(days: number | null) {
    if (days === null) return "Unknown";
    if (days === 0) return "Today";
    return `${days}d ago`;
  }

  function lastContactClass(days: number | null) {
    if (days === null) return "text-muted";
    if (days <= 3) return "text-emerald-700";
    if (days <= 7) return "text-amber-700";
    return "font-semibold text-red-700";
  }

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Leads"
        title="Prospect database"
        description="A clean, permission-aware list of sales records. Use this page for searching, ownership checks, follow-up planning, and audit handoff."
        action={
          <>
            <Link href="/leads/new" className={buttonClassName()}>
              <Plus size={16} /> New lead
            </Link>
            <Link href="/sales-audit/new" className={buttonClassName("secondary")}>New audit</Link>
          </>
        }
      />

      <div className="mb-5 grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Visible leads" value={String(visibleLeads.length)} detail="After RBAC visibility rules" />
        <StatCard label="Follow-up due" value={String(followUpDue)} detail="Owner action required" />
        <StatCard label="Proposal sent" value={String(proposalSent)} detail="Potential conversion stage" />
        <StatCard label="Team" value={currentUser?.teamId || "Not signed in"} detail="Current workspace scope" />
      </div>

      <FilterBar context="leads" />

      <Panel>
        <div className="mb-4 flex items-center justify-between gap-4">
          <SectionTitle title="Lead Records" detail="Tables scroll inside this panel when columns exceed the viewport." />
          <span className="shrink-0 text-sm font-semibold text-muted">{visibleLeads.length} records</span>
        </div>
        <div className="grid gap-3 md:hidden">
          {visibleLeads.map((lead) => {
            const days = daysSince(lead.updatedAt);
            return (
              <Link key={`mobile-${lead.id}`} href={`/leads/${lead.id}`} className="border border-stoneLine bg-ivory p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{lead.businessName}</p>
                    <p className="mt-1 text-sm text-muted">{lead.city} - {lead.category}</p>
                  </div>
                  <StatusBadge status={lead.salesStage} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>Owner: {lead.assignedTo}</span>
                  <span>Due: {lead.nextFollowUpAt || "Not set"}</span>
                  <span className={lastContactClass(days)}>Last contact: {lastContactLabel(days)}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{lead.nextAction}</p>
              </Link>
            );
          })}
        </div>
        <div className="hidden max-w-full overflow-x-auto md:block">
          <table className="w-full min-w-[1220px] text-left text-sm">
            <thead className={tableHeadClassName}>
              <tr>
                {[
                  "Business",
                  "Market",
                  "Category",
                  "Lead Status",
                  "Sales Stage",
                  "Next Action",
                  "Assigned Owner",
                  "Reviewer",
                  "Source",
                  "Next Follow-up",
                  "Visibility",
                  "Updated",
                  "Last contact",
                  "Action"
                ].map((heading) => (
                  <th key={heading} className="px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => {
                const days = daysSince(lead.updatedAt);
                return (
                  <tr key={lead.id} className="border-b border-stoneLine last:border-0">
                    <td className="px-3 py-4">
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-ink hover:text-monk">{lead.businessName}</Link>
                      <p className="mt-1 text-xs text-muted">Created by {lead.createdBy}</p>
                    </td>
                    <td className="px-3 py-4 text-muted">{lead.city}, {lead.country}<br /><span className="text-xs">{lead.area}</span></td>
                    <td className="px-3 py-4 text-muted">{lead.category}</td>
                    <td className="px-3 py-4"><StatusBadge status={lead.leadStatus} /></td>
                    <td className="px-3 py-4"><StatusBadge status={lead.salesStage} /></td>
                    <td className="px-3 py-4 text-muted">{lead.nextAction}</td>
                    <td className="px-3 py-4 text-muted">{lead.assignedTo}</td>
                    <td className="px-3 py-4 text-muted">{lead.assignedStrategist}</td>
                    <td className="px-3 py-4 text-muted">{lead.leadSource}</td>
                    <td className="px-3 py-4 font-semibold text-ink">{lead.nextFollowUpAt || "Not set"}</td>
                    <td className="px-3 py-4 text-muted">{lead.visibility}</td>
                    <td className="px-3 py-4 text-muted">{lead.updatedAt}</td>
                    <td className={`px-3 py-4 ${lastContactClass(days)}`}>{lastContactLabel(days)}</td>
                    <td className="px-3 py-4">
                      <div className="flex gap-3">
                        <Link className="font-semibold text-monk" href={`/leads/${lead.id}`}>Open</Link>
                        <Link className="font-semibold text-monk" href={`/sales-audit/new?leadId=${lead.id}`}>Research</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </ShellPage>
  );
}
