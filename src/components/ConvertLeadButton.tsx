"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "./ui";

export function ConvertLeadButton({ leadId, auditRunId }: { leadId: string; auditRunId?: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function convert() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesStage: "Won", nextAction: "Closed won", auditRunId })
    });
    setSaving(false);
    setMessage(response.ok ? "Lead marked won." : "Could not update lead.");
    router.refresh();
  }

  return (
    <div>
      {confirmed ? (
        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={() => void convert()} disabled={saving}>
            <BadgeCheck size={16} /> {saving ? "Saving..." : "Confirm: mark won"}
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={() => setConfirmed(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" className="w-full" onClick={() => setConfirmed(true)} disabled={saving}>
          <BadgeCheck size={16} /> Mark lead won
        </Button>
      )}
      {message ? <p className="mt-2 text-sm font-semibold text-muted">{message}</p> : null}
    </div>
  );
}
