import { ExternalLink, FileDown, Globe2, Instagram, MapPin } from "lucide-react";
import { AuditWorkspaceBody } from "@/components/AuditWorkspaceBody";
import { AuditRerunControl } from "@/components/AuditRerunControl";
import { AuditWorkspaceTabs } from "@/components/AuditWorkspaceTabs";
import { ReportSaveControl } from "@/components/ReportSaveControl";
import { Panel, StatusBadge, buttonClassName } from "@/components/ui";
import { auditModeLabel, type ActivityLog, type AuditRun, type Report } from "@/lib/types";

export function AuditWorkspaceShell({
  audit,
  activity = [],
  reports = [],
  children
}: {
  audit: AuditRun;
  activity?: ActivityLog[];
  reports?: Report[];
  children: React.ReactNode;
}) {
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "Market pending";
  const rating = audit.rating ? `${audit.rating} rating` : "Not verified";
  const reviewCount = audit.reviewCount ? `${audit.reviewCount} visible reviews` : "Review count needs verification";
  const structure = textOrEmpty(audit.finalDataUsed?.business_structure) || textOrEmpty(audit.manualOverrides?.business_structure) || "Single location/store";
  const clientReport = reports.filter((r) => r.type === "client_growth_due_diligence").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const reportMarkdown = clientReport?.clientReportMarkdown || clientReport?.markdown || "";

  return (
    <>
      <Panel className="mb-5 overflow-hidden p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={audit.auditStatus} />
              <span className="border border-stoneLine bg-ivory px-2.5 py-1 text-xs font-semibold text-muted">{auditModeLabel(audit.auditMode)}</span>
              <span className="border border-stoneLine bg-ivory px-2.5 py-1 text-xs font-semibold text-muted">{structure}</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold leading-tight text-ink md:text-3xl">{audit.businessName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Deal review workspace for {market}, Google trust proof, competitor pressure, contact flow, and the safest close path.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SourceButton href={audit.sourceLinks?.googleMapsUrl} icon={<MapPin size={15} />} label="Google Maps" />
              <SourceButton href={audit.sourceLinks?.website} icon={<Globe2 size={15} />} label="Website" />
              <SourceButton href={audit.sourceLinks?.instagramUrl} icon={<Instagram size={15} />} label="Instagram" />
              <SourceButton href={audit.sourceLinks?.facebookUrl || audit.sourceLinks?.otherPublicLink} icon={<ExternalLink size={15} />} label="Other source" />
            </div>
            <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {audit.score > 0 ? (
                <>
                  <a href={`/api/audits/${audit.id}/export/client`} target="_blank" rel="noreferrer" className={buttonClassName("secondary")}>
                    <FileDown size={15} /> Export Client PDF
                  </a>
                  <a href={`/api/audits/${audit.id}/export/internal`} target="_blank" rel="noreferrer" className={buttonClassName("secondary")}>
                    <FileDown size={15} /> Export Internal Brief
                  </a>
                </>
              ) : (
                <span className="inline-flex h-10 items-center justify-center border border-stoneLine bg-ivory px-4 text-[13px] font-semibold text-muted opacity-70">
                  Complete research to export
                </span>
              )}
            </div>
            <AuditRerunControl audit={audit} />
            {audit.score > 0 && audit.leadId ? (
              <div className="mt-4 border-t border-stoneLine pt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Review Controls</p>
                <ReportSaveControl auditRunId={audit.id} leadId={audit.leadId} markdown={reportMarkdown} />
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Metric label="Growth readiness" value={audit.score ? `${audit.score}/100` : "Pending"} detail={audit.score ? "Sales priority signal" : "Research still running"} />
            <Metric label="Google trust" value={rating} detail={reviewCount} />
          </div>
        </div>
        {audit.errorSummary ? (
          <p className="mt-4 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{audit.errorSummary}</p>
        ) : null}
      </Panel>

      <AuditWorkspaceTabs auditId={audit.id} />
      <AuditWorkspaceBody audit={audit} activity={activity}>{children}</AuditWorkspaceBody>
    </>
  );
}

function SourceButton({ href, icon, label }: { href?: string; icon: React.ReactNode; label: string }) {
  if (!href) {
    return (
      <span className="inline-flex h-9 items-center gap-2 border border-stoneLine bg-ivory px-3 text-sm font-semibold text-muted">
        {icon} {label}: missing
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink hover:border-monk">
      {icon} {label}
    </a>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold leading-tight text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function textOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}
