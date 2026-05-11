"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { FollowUp } from "@/lib/types";
import { Button, Panel, SectionTitle } from "./ui";

const channels: FollowUp["channel"][] = ["Call", "WhatsApp", "Email", "Meeting", "Proposal", "Other"];

export function FollowUpLogger({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [dueAt, setDueAt] = useState("");
  const [channel, setChannel] = useState<FollowUp["channel"]>("Call");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveFollowUp() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, dueAt, channel, nextAction })
    });

    if (!response.ok) {
      setMessage("Could not create follow-up.");
      setSaving(false);
      return;
    }

    setDueAt("");
    setNextAction("");
    setMessage("Follow-up added.");
    setSaving(false);
    router.refresh();
  }

  return (
    <Panel>
      <SectionTitle title="Log Follow-up" detail="Create the next action without leaving the lead record." />
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Due date</span>
          <input
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Channel</span>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as FollowUp["channel"])}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          >
            {channels.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Next action</span>
          <textarea
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            className="focus-ring min-h-24 w-full border border-stoneLine bg-paper p-3 text-sm text-ink"
            placeholder="What should happen next?"
          />
        </label>

        <Button type="button" className="w-full" onClick={() => void saveFollowUp()} disabled={saving || !dueAt}>
          <CalendarPlus size={16} /> {saving ? "Saving..." : "Add follow-up"}
        </Button>
        {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
      </div>
    </Panel>
  );
}
