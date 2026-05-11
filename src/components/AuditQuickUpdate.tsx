"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import type { AuditRun, AuditStatus } from "@/lib/types";
import { auditStatuses } from "@/lib/types";
import { Button, Panel, SectionTitle } from "./ui";

export function AuditQuickUpdate({ audit }: { audit: AuditRun }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuditStatus>(audit.auditStatus || "Draft");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(audit.nextFollowUpAt);
  const [assignedStrategist, setAssignedStrategist] = useState(audit.assignedStrategist);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveAudit() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/audits/${audit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditStatus: status, status, nextFollowUpAt, assignedStrategist })
    });

    if (!response.ok) {
      setMessage("Could not save audit update.");
      setSaving(false);
      return;
    }

    setMessage("Audit updated.");
    setSaving(false);
    router.refresh();
  }

  return (
    <Panel>
      <SectionTitle title="Audit Control" detail="Move the audit through research, review, approval, and sharing." />
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Audit status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AuditStatus)}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          >
            {auditStatuses.map((item: AuditStatus) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Reviewer</span>
          <input
            value={assignedStrategist}
            onChange={(event) => setAssignedStrategist(event.target.value)}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Next follow-up</span>
          <input
            type="date"
            value={nextFollowUpAt}
            onChange={(event) => setNextFollowUpAt(event.target.value)}
            className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
          />
        </label>

        <Button type="button" className="w-full" onClick={() => void saveAudit()} disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save audit update"}
        </Button>
        {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
      </div>
    </Panel>
  );
}
