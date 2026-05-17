import { LockKeyhole, ShieldCheck } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { PageHeader, Panel, SectionTitle, StatCard, StatusBadge, tableHeadClassName } from "@/components/ui";
import { roles } from "@/lib/rbac";

const visibilityRules = [
  ["Owner/Admin", "All teams", "All leads, audits, reports, users, system health, costs"],
  ["Sales Manager", "Team", "Records assigned to their team and report queue"],
  ["Sales Rep", "Own", "Records they created or were assigned"],
  ["Strategist", "Review", "Audits assigned for review or marked Needs Review"],
  ["Viewer", "Assigned", "Read-only access based on assignment"]
];

const permissionGroups = [
  ["MonkAudit", "audit:create", "audit:view", "audit:run", "audit:retry"],
  ["Leads", "leads:create", "leads:view_own", "leads:view_team", "leads:view_all", "leads:edit", "leads:assign"],
  ["Reports", "report:view", "report:review", "report:approve", "report:export", "report:delete", "reports:override_export"],
  ["Follow-ups", "followup:create", "followup:complete"],
  ["Admin", "users:manage", "ai_usage:view", "settings:manage"]
];

export default function RolesPage() {
  return (
    <ShellPage>
      <PageHeader
        eyebrow="RBAC"
        title="Role and permission design"
        description="Use permission strings for behavior and visibility. Roles are bundles; server queries should enforce the same scope the UI presents."
      />

      <div className="mb-6 grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Roles" value={String(roles.length)} detail="Sales and admin profiles" />
        <StatCard label="Pattern" value="Role + Permission" detail="Avoid hardcoded checks" />
        <StatCard label="Visibility" value="All / Team / Own" detail="Applied in Firestore queries" />
        <StatCard label="Audit trail" value="Required" detail="For role, export, and review changes" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionTitle title="Visibility Rules" detail="This is the core sales security model." />
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={tableHeadClassName}>
                <tr>{["Role", "Scope", "Visible Records"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {visibilityRules.map(([role, scope, visible]) => (
                  <tr key={role} className="border-b border-stoneLine last:border-0">
                    <td className="px-3 py-4 font-semibold text-ink">{role}</td>
                    <td className="px-3 py-4"><StatusBadge status={scope} /></td>
                    <td className="px-3 py-4 text-muted">{visible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Implementation Notes" />
          <div className="space-y-4 text-sm leading-6 text-muted">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-monk" size={18} />
              <p>UI gates improve clarity, but API routes must enforce permissions and record visibility.</p>
            </div>
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 shrink-0 text-monk" size={18} />
              <p>Exports, role changes, user disabling, and report approvals should create activity log entries.</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionTitle title="Permission Groups" detail="Use these groups to review role coverage and access boundaries." />
        <div className="grid gap-4 xl:grid-cols-2">
          {permissionGroups.map(([group, ...permissions]) => (
            <div key={group} className="border border-stoneLine bg-ivory p-4">
              <p className="text-sm font-semibold text-ink">{group}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span key={permission} className="border border-stoneLine bg-paper px-2 py-1 text-xs font-semibold text-muted">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {roles.map((role) => (
          <Panel key={role.id}>
            <SectionTitle title={role.name} detail={role.description} />
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <span key={permission} className="border border-stoneLine bg-ivory px-2 py-1 text-xs font-semibold text-muted">
                  {permission}
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </ShellPage>
  );
}
