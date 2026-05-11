import { ShellPage } from "@/components/AppShell";
import { AuditWorkspaceShell } from "@/components/AuditWorkspaceShell";
import { EmptyState, PageHeader } from "@/components/ui";
import { getAudit, listActivityForEntity, listReportsForAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AuditWorkspaceLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const audit = await getAudit(params.id);

  if (!audit) {
    return (
      <ShellPage>
        <PageHeader
          eyebrow="Audit detail"
          title="Audit not found"
          description="The audit may have been archived, deleted, or not yet synced."
        />
        <EmptyState title="No audit record" body="Open the Audits page or create a new MonkAudit from a public source link." />
      </ShellPage>
    );
  }

  const [activity, reports] = await Promise.all([
    listActivityForEntity("audit_runs", params.id),
    listReportsForAudit(params.id)
  ]);

  return (
    <ShellPage>
      <AuditWorkspaceShell audit={audit} activity={activity} reports={reports}>{children}</AuditWorkspaceShell>
    </ShellPage>
  );
}
