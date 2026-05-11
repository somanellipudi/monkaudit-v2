import Link from "next/link";
import { CalendarCheck, ExternalLink, Mail, MapPinned, Phone, Sparkles } from "lucide-react";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { FollowUpLogger } from "@/components/FollowUpLogger";
import { ConvertLeadButton } from "@/components/ConvertLeadButton";
import { ShellPage } from "@/components/AppShell";
import { LeadQuickUpdate } from "@/components/LeadQuickUpdate";
import { WhatsAppDraft } from "@/components/WhatsAppDraft";
import { Button, EmptyState, PageHeader, Panel, SectionTitle, StatusBadge, buttonClassName } from "@/components/ui";
import { getLead, listAuditsForLead, listFollowUpsForLead, listLeadActivity } from "@/lib/server/repositories";
import { auditModeLabel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  const audits = await listAuditsForLead(params.id);
  const followUps = await listFollowUpsForLead(params.id);
  const activity = await listLeadActivity(params.id);

  if (!lead) {
    return (
      <ShellPage>
        <PageHeader
          eyebrow="Lead record"
          title="Lead not found"
          description="The lead may have been archived, deleted from local demo data, or not yet synced."
        />
        <EmptyState title="No lead record" body="Open the Leads page or create a new MonkAudit from a public source link." />
      </ShellPage>
    );
  }

  const latestAudit = audits[0];

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Lead record"
        title={lead.businessName}
        description={`${lead.city}, ${lead.country} - ${lead.category}. Assigned to ${lead.assignedTo}.`}
        action={
          <Link href={`/sales-audit/new?leadId=${lead.id}`} className={buttonClassName()}>
            <Sparkles size={16} /> New MonkAudit
          </Link>
        }
      />

      <Panel className="mb-6">
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
          <Summary label="Lead status" value={<StatusBadge status={lead.leadStatus} />} />
          <Summary label="Sales stage" value={<StatusBadge status={lead.salesStage} />} />
          <Summary label="Next follow-up" value={lead.nextFollowUpAt || "Not set"} />
          <Summary label="Owner" value={lead.assignedTo} />
          <Summary label="Reviewer" value={lead.assignedStrategist} />
          <Summary label="Visibility" value={lead.visibility} />
          <Summary label="Updated" value={lead.updatedAt} />
        </div>
      </Panel>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel>
            <SectionTitle title="Prospect Snapshot" detail="Core information the salesperson needs before research or follow-up." />
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Business" value={lead.businessName} />
              <Info label="Category" value={lead.category} />
              <Info label="Market" value={`${lead.city}, ${lead.country}`} />
              <Info label="Area" value={lead.area || "Not set"} />
              <Info label="Lead source" value={lead.leadSource} />
              <Info label="Created by" value={lead.createdBy} />
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Source Links" detail="Public sources used for discovery and audit matching." />
            <div className="grid gap-3 md:grid-cols-2">
              <SourceLink icon={<MapPinned size={16} />} label="Google Maps" href={lead.googleMapsUrl} />
              <SourceLink icon={<ExternalLink size={16} />} label="Website" href={lead.website} />
              <SourceLink icon={<ExternalLink size={16} />} label="Instagram" href={lead.instagramUrl} />
              <SourceLink icon={<Phone size={16} />} label="Phone / WhatsApp" href={lead.phone ? `tel:${lead.phone}` : ""} value={lead.phone} />
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Audit History" detail="MonkAudit records connected to this lead." />
            {audits.length ? (
              <div className="space-y-3">
                {audits.map((audit) => (
                  <div key={audit.id} className="grid gap-3 border-b border-stoneLine pb-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{auditModeLabel(audit.auditMode)}</p>
                      <p className="mt-1 text-sm text-muted">Score: {audit.score || "Pending"} - Updated {audit.lastUpdated}</p>
                    </div>
                    <StatusBadge status={audit.auditStatus} />
                    <Link href={`/sales-audit/${audit.id}`} className="text-sm font-semibold text-monk">Open</Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No audit yet" body="Start MonkAudit when you have at least one useful public source link." />
            )}
          </Panel>

          <Panel>
            <SectionTitle title="Follow-up History" detail="Next actions and completed sales touchpoints for this lead." />
            {followUps.length ? (
              <div className="space-y-3">
                {followUps.map((followUp) => (
                  <div key={followUp.id} className="grid gap-3 border-b border-stoneLine pb-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{followUp.nextAction}</p>
                      <p className="mt-1 text-sm text-muted">{followUp.channel} - Owner: {followUp.assignedTo}</p>
                    </div>
                    <StatusBadge status={followUp.status} />
                    <span className="text-sm font-semibold text-muted">{followUp.dueAt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No follow-ups yet" body="Create a follow-up after a call, WhatsApp conversation, report share, or proposal discussion." />
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <LeadQuickUpdate lead={lead} />
          <FollowUpLogger leadId={lead.id} />

          <Panel>
            <SectionTitle title="Next Action" />
            <div className="space-y-4 text-sm leading-6 text-muted">
              <div className="flex gap-3">
                <CalendarCheck className="mt-0.5 shrink-0 text-monk" size={18} />
                <p>
                  Follow up on <span className="font-semibold text-ink">{lead.nextFollowUpAt || "a date to be set"}</span>.
                </p>
              </div>
              <p>Suggested action: review the latest audit, confirm contact path, then call or WhatsApp with one clear next step.</p>
            </div>
            <div className="mt-5 grid gap-2">
              {latestAudit ? (
                <Link href={`/sales-audit/${latestAudit.id}`} className={buttonClassName("secondary", "w-full")}>Open latest audit</Link>
              ) : null}
              <Link href="/sales-workspace/follow-ups" className={buttonClassName("secondary", "w-full")}>Open follow-ups</Link>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Won/Lost Tracking" detail="Phase 1 records the sales outcome here. Client portal and billing handoff stay disabled." />
            <ConvertLeadButton leadId={lead.id} auditRunId={latestAudit?.id} />
          </Panel>

          <Panel>
            <SectionTitle title="Point of Contact" />
            <div className="space-y-3 text-sm">
              <Info label="Name" value={lead.contactName || "Unknown"} />
              <Info label="Role" value={lead.contactRole || "Unknown"} />
              <Info label="Phone" value={lead.phone || "Unknown"} />
              <Info label="Email" value={lead.email || "Unknown"} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary"><Phone size={15} /> Call</Button>
              <Button variant="ghost"><Mail size={15} /> Email</Button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="WhatsApp Opener" detail="Copy this before calling or messaging." />
            <WhatsAppDraft lead={lead} auditScore={latestAudit?.score} />
          </Panel>

          <Panel>
            <SectionTitle title="Sales Notes" />
            <p className="text-sm leading-6 text-muted">
              {lead.salesContext || "No sales context added yet. Add referral context, urgency, service interest, or call notes when available."}
            </p>
          </Panel>

          <ActivityTimeline logs={activity} detail="Lead updates and connected MonkAudit events." />
        </aside>
      </div>
    </ShellPage>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-2 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stoneLine pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function SourceLink({ icon, label, href, value }: { icon: React.ReactNode; label: string; href: string; value?: string }) {
  const display = value || href || "Not available";
  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <div className="flex items-center gap-2 text-monk">{icon}<span className="text-sm font-semibold text-ink">{label}</span></div>
      {href ? (
        <a href={href} className="mt-3 block truncate text-sm font-semibold text-monk" target="_blank" rel="noreferrer">
          {display}
        </a>
      ) : (
        <p className="mt-3 text-sm text-muted">{display}</p>
      )}
    </div>
  );
}
