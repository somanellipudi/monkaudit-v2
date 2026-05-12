"use client";

import { useState } from "react";
import { Clipboard, Mail, MessageCircle, Phone, ShieldCheck, Target, TrendingUp } from "lucide-react";
import type { PitchPack } from "@/lib/sales-pitch";
import { MarkdownDocument } from "@/components/MarkdownDocument";
import { Button, Panel, SectionTitle, StatusBadge, buttonClassName } from "@/components/ui";

export function PitchPackWorkspace({ pitch, callNotesMarkdown }: { pitch: PitchPack; callNotesMarkdown?: string }) {
  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={pitch.opportunity.temperature} />
              <span className="border border-stoneLine bg-ivory px-2.5 py-1 text-xs font-semibold text-muted">{pitch.suggestedOffer}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-ink">Sales Playbook</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{pitch.pitchAngle}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Signal label="Urgency" value={pitch.opportunity.urgency} />
              <Signal label="Revenue potential" value={pitch.opportunity.revenuePotential} />
              <Signal label="Likelihood" value={pitch.opportunity.conversionLikelihood} />
            </div>
          </div>
          <div className="border border-stoneLine bg-ivory p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Opportunity Score</p>
            <p className="mt-3 text-5xl font-semibold leading-none text-ink">{pitch.opportunity.score}</p>
            <div className="mt-5 h-2 bg-paper">
              <div className="h-2 bg-monk" style={{ width: `${pitch.opportunity.score}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{pitch.opportunity.reason}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <SectionTitle title="Proof Cards" detail="Use these as quick, evidence-led moments in the call." />
            <div className="grid gap-3 md:grid-cols-2">
              {pitch.proofCards.map((card) => (
                <ProofCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Pain Points" detail="Translate the audit into business problems the prospect will recognize." />
            <NumberedList items={pitch.painPoints} />
          </Panel>

          <Panel>
            <SectionTitle title="Objection Handling" detail="Keep responses consultative and tied to the audit evidence." />
            <div className="grid gap-3">
              {pitch.objections.map((item) => (
                <div key={item.objection} className="border border-stoneLine bg-ivory p-4">
                  <p className="text-sm font-semibold text-ink">{item.objection}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.response}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel>
            <SectionTitle title="Next Ask" />
            <div className="flex gap-3">
              <Target className="mt-0.5 shrink-0 text-monk" size={18} />
              <p className="text-sm leading-6 text-muted">{pitch.nextAsk}</p>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Discovery Questions" />
            <NumberedList items={pitch.discoveryQuestions} />
          </Panel>

          <Panel>
            <SectionTitle title="Claim Guardrails" />
            <div className="space-y-3">
              {pitch.guardrails.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-muted">
                  <ShieldCheck className="mt-0.5 shrink-0 text-sage" size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>

      <Panel>
        <SectionTitle title="Helpful Outreach" detail="Specific, evidence-led copy that opens a repair conversation instead of a hard sell." />
        <div className="grid gap-4 xl:grid-cols-2">
          <DraftCard icon={<Phone size={17} />} title="Call Opener" value={pitch.outreach.callOpener} />
          <DraftCard icon={<MessageCircle size={17} />} title="WhatsApp" value={pitch.outreach.whatsapp} />
          <DraftCard icon={<Mail size={17} />} title={pitch.outreach.emailSubject} value={pitch.outreach.emailBody} />
          <DraftCard icon={<TrendingUp size={17} />} title="Follow-up" value={pitch.outreach.followUp} />
        </div>
      </Panel>

      {callNotesMarkdown ? (
        <Panel>
          <SectionTitle title="Call Notes" detail="Use this during the discovery call, then update the lead with the real outcome." />
          <MarkdownDocument markdown={callNotesMarkdown} />
        </Panel>
      ) : null}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function ProofCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold leading-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-6 text-muted">
          <span className="flex h-7 w-7 items-center justify-center border border-stoneLine bg-ivory text-xs font-semibold text-ink">{index + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function DraftCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copyDraft() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-monk">{icon}</span>
          <h3 className="min-w-0 truncate text-sm font-semibold text-ink">{title}</h3>
        </div>
        <Button type="button" variant="secondary" className="h-8 shrink-0 px-2.5" onClick={copyDraft} aria-label={`Copy ${title}`}>
          <Clipboard size={15} />
        </Button>
      </div>
      <textarea
        readOnly
        value={value}
        className="mt-3 min-h-[190px] w-full resize-y border border-stoneLine bg-paper p-3 text-sm leading-6 text-ink"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" className={buttonClassName("ghost", "h-auto px-0 py-0")} onClick={copyDraft}>
          Copy draft
        </button>
        {copied ? <span className="text-xs font-semibold text-sage">Copied</span> : null}
      </div>
    </div>
  );
}
