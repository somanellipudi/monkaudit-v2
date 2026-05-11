import { CheckCircle2 } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { DbControlPanel } from "@/components/DbControlPanel";
import { PageHeader, Panel, SectionTitle, StatCard } from "@/components/ui";
import { env } from "@/lib/server/env";

const rules = [
  "Only active allowlisted team members should have access.",
  "Client reports must be reviewed before export or sharing.",
  "Internal briefs stay separate from client-facing reports.",
  "Local reset is for development data only."
];

export default function SettingsPage() {
  const dataMode = env.dbProvider === "firestore" ? "Firestore" : "Local";

  return (
    <ShellPage>
      <PageHeader
        eyebrow="System"
        title="System health"
        description="Check data mode, API readiness, keys, and local database controls."
      />

      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Workspace" value="MonkAudit" detail="Audits and reports" />
        <StatCard label="Data mode" value={dataMode} detail={env.dbProvider === "firestore" ? "GCP persistence" : "Local JSON"} />
        <StatCard label="Report rule" value="Review first" detail="Before export/share" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DbControlPanel />
        <Panel>
          <SectionTitle title="Workspace Rules" detail="The few rules that keep Phase 1 clean." />
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule} className="flex gap-2 text-sm leading-6 text-muted">
                <CheckCircle2 className="mt-1 shrink-0 text-sage" size={15} />
                <p>{rule}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </ShellPage>
  );
}
