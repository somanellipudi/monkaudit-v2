import Link from "next/link";
import { MailPlus, ShieldCheck, UserPlus } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { Button, PageHeader, Panel, SectionTitle, StatCard, StatusBadge, UserRoleBadge, buttonClassName, tableHeadClassName } from "@/components/ui";
import { listUsers } from "@/lib/server/repositories";

const inviteChecklist = [
  ["Allowlisted Gmail", "User document exists with active status."],
  ["Role bundle", "Role IDs map to permission strings, not page-specific role checks."],
  ["Team ownership", "Team ID controls manager visibility and target reporting."],
  ["App access", "MonkAudit access can be disabled without deleting history."]
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function roleLabel(roleIds: string[]) {
  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    sales_manager: "Sales Manager",
    sales_rep: "Sales Rep",
    strategist: "Strategist",
    client_success: "Client Success",
    viewer: "Viewer"
  };
  return roleIds.map((role) => labels[role] || role).join(", ");
}

function teamLabel(teamId: string) {
  const labels: Record<string, string> = {
    sales_india: "Sales India",
    sales_usa: "Sales USA",
    strategy: "Strategy"
  };
  return labels[teamId] || teamId;
}

function scopeFor(roleIds: string[]) {
  if (roleIds.includes("owner") || roleIds.includes("admin")) return "All records";
  if (roleIds.includes("sales_manager")) return "Team records";
  if (roleIds.includes("strategist")) return "Review queue";
  return "Assigned records";
}

function accessFor(roleIds: string[]) {
  if (roleIds.includes("owner") || roleIds.includes("admin")) return "System health, costs, exports";
  if (roleIds.includes("sales_manager")) return "Team pipeline and reports";
  if (roleIds.includes("strategist")) return "Needs Review and assigned audits";
  return "Own leads and audits";
}

export default async function TeamPage() {
  const users = await listUsers();
  const activeUsers = users.filter((user) => user.status === "active");
  const reviewers = users.filter((user) => user.roleIds.includes("strategist")).length;
  const disabledUsers = users.filter((user) => user.status !== "active").length;
  const teams = new Set(users.map((user) => user.teamId)).size;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Team"
        title="Allowlisted sales workspace access"
        description="Manage Gmail allowlisting, team ownership, role visibility, and active or disabled access for MonkAudit."
        action={
          <>
            <Button variant="secondary"><MailPlus size={16} /> Invite user</Button>
            <Link href="/team/roles" className={buttonClassName()}>
              <UserPlus size={16} /> Roles & permissions
            </Link>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Active users" value={String(activeUsers.length)} detail="Allowlisted Gmail accounts" />
        <StatCard label="Teams" value={String(teams)} detail="Sales ownership groups" />
        <StatCard label="Reviewers" value={String(reviewers)} detail="Strategist review capacity" />
        <StatCard label="Disabled" value={String(disabledUsers)} detail="Blocked or inactive users" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionTitle title="Team Members" detail="Every user needs a role, team, status, app access, and visibility scope." />
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className={tableHeadClassName}>
                <tr>
                  {["Name", "Email", "Role", "Team", "Status", "Scope", "Primary Access"].map((h) => (
                    <th key={h} className="px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email} className="border-b border-stoneLine last:border-0">
                    <td className="px-3 py-4 font-semibold text-ink">{user.name}</td>
                    <td className="px-3 py-4 text-muted">{user.email}</td>
                    <td className="px-3 py-4"><UserRoleBadge role={roleLabel(user.roleIds)} /></td>
                    <td className="px-3 py-4 text-muted">{teamLabel(user.teamId)}</td>
                    <td className="px-3 py-4"><StatusBadge status={user.status} /></td>
                    <td className="px-3 py-4 text-muted">{scopeFor(user.roleIds)}</td>
                    <td className="px-3 py-4 text-muted">{accessFor(user.roleIds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Invite Checklist" detail="Access should be explicit before first login." />
          <div className="space-y-4">
            {inviteChecklist.map(([title, detail]) => (
              <div key={title} className="flex gap-3 border-b border-stoneLine pb-4 last:border-0 last:pb-0">
                <ShieldCheck className="mt-0.5 shrink-0 text-monk" size={18} />
                <p className="text-sm leading-6 text-muted">
                  <span className="font-semibold text-ink">{title}:</span> {detail}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionTitle title="Visibility Model" detail="The UI should show only records the server is prepared to return." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Owner/Admin", "All leads, audits, reports, users, system health, costs"],
            ["Sales Manager", "Team leads, audits, follow-ups, and reports"],
            ["Sales Rep", "Assigned or created records only"],
            ["Strategist", "Assigned reviews and Needs Review audits"]
          ].map(([title, detail]) => (
            <div key={title} className="border border-stoneLine bg-ivory p-4">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </ShellPage>
  );
}
