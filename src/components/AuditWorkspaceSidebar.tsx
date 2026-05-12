import Link from "next/link";
import { Download, FileText, RotateCcw, Send, ShieldCheck, Target } from "lucide-react";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AuditQuickUpdate } from "@/components/AuditQuickUpdate";
import { AuditRunButton } from "@/components/AuditRunButton";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Panel, SectionTitle, buttonClassName } from "@/components/ui";
import type { ActivityLog, AuditRun } from "@/lib/types";

export function AuditWorkspaceSidebar({
  audit,
  activity = [],
  clientReportHref
}: {
  audit: AuditRun;
  activity?: ActivityLog[];
  clientReportHref: string;
}) {
  const hasCompletedResearch = audit.score > 0 && audit.auditStatus !== "Research Running";
  const generation = parseGeneration(audit.finalDataUsed?.generation);
  const salesBrief = parseSalesBrief(audit.finalDataUsed?.internalSalesBrief);

  return (
    <aside className="space-y-5">
      <AuditQuickUpdate audit={audit} />

      <Panel>
        <SectionTitle title="Actions" />
        <div className="space-y-2">
          <AuditRunButton auditId={audit.id} isRunning={audit.auditStatus === "Research Running"} generationStatus={generation?.status} />
          {hasCompletedResearch ? (
            <Link href={`/sales-audit/${audit.id}/pitch-pack`} className={buttonClassName("primary", "w-full")}>
              <Target size={16} /> Open Sales Playbook
            </Link>
          ) : (
            <Button className="w-full" disabled><Target size={16} /> Open Sales Playbook</Button>
          )}
          <PermissionGate permission="report:export">
            {hasCompletedResearch ? (
              <Link href={clientReportHref} className={buttonClassName("primary", "w-full")}>
                <Download size={16} /> Open Export Controls
              </Link>
            ) : (
              <Button className="w-full" disabled><Download size={16} /> Open Export Controls</Button>
            )}
          </PermissionGate>
          <Button className="w-full" variant="secondary"><Send size={16} /> Send for Review</Button>
          <Button className="w-full" variant="secondary" disabled={!hasCompletedResearch}><RotateCcw size={16} /> Regenerate Section</Button>
          {hasCompletedResearch ? (
            <Link href={clientReportHref} className={buttonClassName("secondary", "w-full")}>
              <FileText size={16} /> Open Report Editor
            </Link>
          ) : (
            <Button className="w-full" variant="secondary" disabled><FileText size={16} /> Open Report Editor</Button>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-sage" size={18} />
          <div>
            <h2 className="text-xl font-semibold text-ink">Review Gate</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Client sharing should stay locked until a strategist confirms facts, careful language, limitations, competitor claims, and review numbers.
            </p>
          </div>
        </div>
      </Panel>

      {salesBrief?.discoveryQuestions.length ? (
        <Panel>
          <SectionTitle title="Sales Call Questions" />
          <List items={salesBrief.discoveryQuestions.slice(0, 5)} />
        </Panel>
      ) : null}

      <Panel>
        <SectionTitle title="Ownership" />
        <div className="space-y-3 text-sm">
          <Fact label="Created by" value={audit.createdBy} />
          <Fact label="Assigned owner" value={audit.assignedTo} />
          <Fact label="Reviewer" value={audit.assignedStrategist} />
          <Fact label="Team" value={audit.teamId} />
          <Fact label="Visibility" value={audit.visibility} />
        </div>
      </Panel>

      <ActivityTimeline logs={activity} detail="Audit creation, status changes, review, export, and sharing events." />
    </aside>
  );
}

function parseGeneration(value: unknown) {
  const candidate = value as { status?: unknown } | null;
  if (!candidate || typeof candidate !== "object") return null;
  return {
    status: typeof candidate.status === "string" ? candidate.status : ""
  };
}

function parseSalesBrief(value: unknown) {
  const candidate = value as { discoveryQuestions?: unknown } | null;
  if (!candidate || typeof candidate !== "object") return null;
  return {
    discoveryQuestions: Array.isArray(candidate.discoveryQuestions)
      ? candidate.discoveryQuestions.filter((item): item is string => typeof item === "string")
      : []
  };
}

function List({ items }: { items: string[] }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-muted">
      {items.map((item) => (
        <p key={item} className="border-l-2 border-monk/40 pl-3">{item}</p>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] items-start gap-3 border-b border-stoneLine pb-2 last:border-0">
      <span className="min-w-0 text-muted">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-ink [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}
