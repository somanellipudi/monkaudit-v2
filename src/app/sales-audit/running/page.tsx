import Link from "next/link";
import { ShellPage } from "@/components/AppShell";
import { ResearchProgress } from "@/components/ResearchProgress";
import { PageHeader, Panel, buttonClassName } from "@/components/ui";

export default function RunningPage() {
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Research running"
        title="Audit in progress"
        description="Growth Audit is checking public signals and preparing the internal brief and client-safe report."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <ResearchProgress />
        <Panel>
          <h2 className="text-xl font-semibold text-ink">Queue details</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <Row label="Mode" value="Deep Audit" />
            <Row label="Cost level" value="Medium" />
            <Row label="Worker" value="monkaudit-worker" />
            <Row label="Storage" value="Repository metadata" />
          </dl>
          <Link href="/sales-audit" className={buttonClassName("primary", "mt-6 w-full")}>Open audits</Link>
        </Panel>
      </div>
    </ShellPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stoneLine pb-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
