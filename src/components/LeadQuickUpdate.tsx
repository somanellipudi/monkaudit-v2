"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import type { Lead, SalesStage } from "@/lib/types";
import { salesStages } from "@/lib/types";
import { Button, Panel, SectionTitle } from "./ui";

export function LeadQuickUpdate({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [salesStage, setSalesStage] = useState<SalesStage>((lead.salesStage || lead.status || "Research Pending") as SalesStage);
  const [nextFollowUpAt, setNextFollowUpAt] = useState(lead.nextFollowUpAt);
  const [salesContext, setSalesContext] = useState(lead.salesContext || "");
  const [lostReason, setLostReason] = useState(lead.lostReason || "");
  const [wonNotes, setWonNotes] = useState(lead.wonNotes || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveLead() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesStage, nextFollowUpAt, salesContext, lostReason, wonNotes })
    });

    if (!response.ok) {
      setMessage("Could not save update.");
      setSaving(false);
      return;
    }

    setMessage("Lead updated.");
    setSaving(false);
    router.refresh();
  }

  return (
    <Panel>
      <SectionTitle title="Quick Update" detail="Keep status, follow-up, and notes current after each sales action." />
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Sales stage</span>
          <select
            value={salesStage}
            onChange={(event) => setSalesStage(event.target.value as SalesStage)}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          >
            {salesStages.map((item: SalesStage) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        {salesStage === "Lost" ? (
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Lost reason</span>
            <textarea
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              className="focus-ring min-h-24 w-full border border-stoneLine bg-paper p-3 text-sm text-ink"
              placeholder="Why did we lose this? (fit, budget, timing, trust, offer)"
            />
          </label>
        ) : null}

        {salesStage === "Won" ? (
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Won notes</span>
            <textarea
              value={wonNotes}
              onChange={(event) => setWonNotes(event.target.value)}
              className="focus-ring min-h-24 w-full border border-stoneLine bg-paper p-3 text-sm text-ink"
              placeholder="What helped close this deal?"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Next follow-up</span>
          <input
            type="date"
            value={nextFollowUpAt}
            onChange={(event) => setNextFollowUpAt(event.target.value)}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Sales notes</span>
          <textarea
            value={salesContext}
            onChange={(event) => setSalesContext(event.target.value)}
            className="focus-ring min-h-28 w-full border border-stoneLine bg-paper p-3 text-sm text-ink"
            placeholder="Call outcome, decision context, objection, or next step."
          />
        </label>

        <Button type="button" className="w-full" onClick={() => void saveLead()} disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save lead update"}
        </Button>
        {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
      </div>
    </Panel>
  );
}
