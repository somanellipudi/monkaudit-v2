"use client";

import { useState } from "react";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AuditMode, AuditRun } from "@/lib/types";
import { Button } from "./ui";

const inputClassName = "h-10 w-full border border-stoneLine bg-paper px-3 text-sm text-ink outline-none focus:border-monk";

export function AuditRerunControl({ audit }: { audit: AuditRun }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    businessName: audit.businessName,
    city: audit.city === "Unknown" ? "" : audit.city,
    area: audit.area,
    country: audit.country === "Unknown" ? "" : audit.country,
    category: audit.category === "Unknown" ? "" : audit.category,
    auditMode: audit.auditMode,
    googleMapsUrl: audit.sourceLinks?.googleMapsUrl || "",
    website: audit.sourceLinks?.website || "",
    instagramUrl: audit.sourceLinks?.instagramUrl || "",
    otherPublicLink: audit.sourceLinks?.otherPublicLink || ""
  });

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveInputs() {
    const response = await fetch(`/api/audits/${audit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not save updated inputs.");
  }

  async function rerun(requireGemini: boolean) {
    setRunning(true);
    setMessage("");
    try {
      await saveInputs();
      const response = await fetch(`/api/audits/${audit.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, requireGemini })
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok ? "Audit rerun completed with the latest inputs." : payload.error || "Audit rerun failed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Audit rerun failed.");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="mt-4 border-t border-stoneLine pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Rerun Audit</p>
        <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Hide inputs" : "Update inputs"}
        </Button>
      </div>
      {expanded ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Business" value={form.businessName} onChange={(value) => updateField("businessName", value)} />
          <Field label="Area" value={form.area} onChange={(value) => updateField("area", value)} />
          <Field label="City" value={form.city} onChange={(value) => updateField("city", value)} />
          <Field label="Country" value={form.country} onChange={(value) => updateField("country", value)} />
          <Field label="Category" value={form.category} onChange={(value) => updateField("category", value)} />
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Mode
            <select className={inputClassName} value={form.auditMode} onChange={(event) => updateField("auditMode", event.target.value as AuditMode)}>
              <option value="quick">Quick Audit</option>
              <option value="deep">Deep Audit</option>
              <option value="pre_proposal">Pre-Proposal Audit</option>
            </select>
          </label>
          <Field label="Google Maps URL" value={form.googleMapsUrl} onChange={(value) => updateField("googleMapsUrl", value)} />
          <Field label="Website" value={form.website} onChange={(value) => updateField("website", value)} />
          <Field label="Instagram" value={form.instagramUrl} onChange={(value) => updateField("instagramUrl", value)} />
          <Field label="Other source" value={form.otherPublicLink} onChange={(value) => updateField("otherPublicLink", value)} />
          <Button type="button" variant="secondary" className="w-full md:col-span-2 xl:col-span-1" onClick={() => void saveInputs()} disabled={running}>
            <Save size={16} /> Save inputs
          </Button>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button type="button" className="w-full" onClick={() => void rerun(true)} disabled={running || audit.auditStatus === "Research Running"}>
          <Sparkles size={16} /> {running ? "Rerunning..." : "Rerun with same inputs"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={() => void rerun(false)} disabled={running || audit.auditStatus === "Research Running"}>
          <RotateCcw size={16} /> Rerun fallback
        </Button>
      </div>
      {message ? <p className={`mt-2 text-sm font-semibold ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("could not") ? "text-red-700" : "text-muted"}`}>{message}</p> : null}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-muted">
      {label}
      <input className={inputClassName} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
