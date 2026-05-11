import { AlertTriangle, CheckCircle2, Gauge, RotateCcw, ShieldCheck } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { CostUsageCard, PageHeader, Panel, SectionTitle, StatusBadge, tableHeadClassName } from "@/components/ui";
import { listAiUsage, listAudits, listReports } from "@/lib/server/repositories";
import { auditModeLabel } from "@/lib/types";

const controls = [
  ["Mode discipline", "Quick for cold prospects, Deep for qualified leads, Pre-Proposal for serious opportunities.", CheckCircle2],
  ["Review gate", "Pre-Proposal reports and regenerated client sections should require strategist approval.", ShieldCheck],
  ["Retry policy", "Failed discovery jobs should retry once, then require manual review before more spend.", RotateCcw],
  ["Cost alert", "Flag repeated regeneration, missing source URLs, and unusually high API call counts.", AlertTriangle]
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AiUsagePage() {
  const [usage, audits, reports] = await Promise.all([listAiUsage(), listAudits(), listReports()]);
  const inputTokens = usage.reduce((sum, item) => sum + item.inputTokens, 0);
  const outputTokens = usage.reduce((sum, item) => sum + item.outputTokens, 0);
  const apiCalls = usage.reduce((sum, item) => sum + item.externalApiCalls, 0);
  const estimatedCost = usage.reduce((sum, item) => sum + item.estimatedUsd, 0);
  const failedJobs = usage.filter((item) => item.status === "Failed").length;
  const reportsNeedingReview = reports.filter((report) => report.reportStatus === "Needs Review").length;
  const byUser = usage.reduce<Record<string, { count: number; cost: number }>>((acc, item) => {
    acc[item.userId] = acc[item.userId] || { count: 0, cost: 0 };
    acc[item.userId].count += 1;
    acc[item.userId].cost += item.estimatedUsd;
    return acc;
  }, {});

  return (
    <ShellPage>
      <PageHeader
        eyebrow="AI Usage"
        title="Cost-aware audit operations"
        description="Track Gemini usage, external API calls, failed jobs, and audit-mode discipline before scaling the sales workflow."
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <CostUsageCard label="Audits tracked" value={String(audits.length)} helper="Repository audit runs" />
        <CostUsageCard label="Gemini input tokens" value={inputTokens.toLocaleString()} helper="Recorded local usage" />
        <CostUsageCard label="Gemini output tokens" value={outputTokens.toLocaleString()} helper="Reports, briefs, cleanup" />
        <CostUsageCard label="External API calls" value={String(apiCalls)} helper="Places, PageSpeed, search" />
        <CostUsageCard label="Estimated spend" value={`$${estimatedCost.toFixed(2)}`} helper="Local estimate" />
        <CostUsageCard label="Failed jobs" value={String(failedJobs)} helper="Requires retry or review" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionTitle title="Most Expensive Audits" detail="Spot runaway discovery, repeated regeneration, and audits using the wrong mode." />
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={tableHeadClassName}>
                <tr>
                  {["Audit", "Mode", "Owner", "API calls", "Estimated cost", "Status"].map((h) => (
                    <th key={h} className="px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usage.slice(0, 6).map((item) => {
                  const audit = audits.find((candidate) => candidate.id === item.auditRunId);
                  return (
                  <tr key={item.id} className="border-b border-stoneLine last:border-0">
                    <td className="px-3 py-4 font-semibold text-ink">{audit?.businessName || item.auditRunId || "Unlinked usage"}</td>
                    <td className="px-3 py-4 text-muted">{auditModeLabel(audit?.auditMode)}</td>
                    <td className="px-3 py-4 text-muted">{item.userId}</td>
                    <td className="px-3 py-4 text-muted">{item.externalApiCalls}</td>
                    <td className="px-3 py-4 font-semibold text-ink">${item.estimatedUsd.toFixed(2)}</td>
                    <td className="px-3 py-4"><StatusBadge status={item.status} /></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Cost by Audit Mode" detail="Pre-Proposal should stay limited and reviewed." />
          <div className="space-y-5">
            {[["Quick Audit", 28, "Low-cost prospect scan"], ["Deep Audit", 54, "Qualified lead research"], ["Pre-Proposal Audit", 18, "High-detail review required"]].map(([mode, value, detail]) => (
              <div key={mode as string}>
                <div className="mb-2 flex justify-between gap-4 text-sm">
                  <span className="font-semibold text-ink">{mode}</span>
                  <span className="text-muted">{value}%</span>
                </div>
                <div className="h-2 bg-ivory"><div className="h-2 bg-monk" style={{ width: `${value}%` }} /></div>
                <p className="mt-2 text-xs text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionTitle title="Cost by User" detail="Managers should see spend alongside audit volume and review quality." />
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className={tableHeadClassName}>
                <tr>{["User", "Volume", "Estimated cost", "Control"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(byUser).map(([user, value]) => (
                  <tr key={user} className="border-b border-stoneLine last:border-0">
                    <td className="px-3 py-4 font-semibold text-ink">{user}</td>
                    <td className="px-3 py-4 text-muted">{value.count} runs</td>
                    <td className="px-3 py-4 font-semibold text-ink">${value.cost.toFixed(2)}</td>
                    <td className="px-3 py-4"><StatusBadge status="Good" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Operating Controls" />
          <div className="space-y-4 text-sm leading-6 text-muted">
            {controls.map(([title, detail, Icon]) => (
              <div key={title as string} className="flex gap-3">
                <Icon className="mt-0.5 shrink-0 text-monk" size={18} />
                <p><span className="font-semibold text-ink">{title as string}:</span> {detail as string}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionTitle title="Worker Health" detail="Current queue and review signals from repository data." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Discovery worker", "Healthy", "Average job time 2m 40s"],
            ["Report generation", "Healthy", "Client-language cleanup enabled"],
            ["Export worker", reportsNeedingReview ? "Review" : "Healthy", `${reportsNeedingReview} reports need approval before export`]
          ].map(([label, status, detail]) => (
            <div key={label} className="border border-stoneLine bg-ivory p-4">
              <Gauge className="text-monk" size={18} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <StatusBadge status={status} />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </ShellPage>
  );
}
