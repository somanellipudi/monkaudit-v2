"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { Button, PageHeader, Panel } from "@/components/ui";
import { salesStages, type SalesStage } from "@/lib/types";

const leadSources = ["Instagram DM", "Cold call", "Referral", "Walk-in", "LinkedIn", "Other"];

export default function NewLeadPage() {
  const router = useRouter();
  const [salesStage, setSalesStage] = useState<SalesStage>("Research Pending");
  const [leadSource, setLeadSource] = useState("Instagram DM");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: String(formData.get("businessName") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        country: String(formData.get("country") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        leadSource,
        assignedTo: String(formData.get("assignedTo") || "").trim(),
        salesStage,
        googleMapsUrl: String(formData.get("googleMapsUrl") || "").trim(),
        website: String(formData.get("website") || "").trim(),
        instagramUrl: String(formData.get("instagramUrl") || "").trim()
      })
    });

    if (!response.ok) {
      setError("Lead could not be created.");
      setSaving(false);
      return;
    }

    const payload = await response.json();
    router.push(payload.lead?.id ? `/leads/${payload.lead.id}` : "/leads");
  }

  return (
    <ShellPage>
      <PageHeader
        eyebrow="New lead"
        title="Add a new prospect"
        description="No source link required. Add public links when you have them."
      />
      <Panel>
        <form onSubmit={submitLead} className="grid gap-4 md:grid-cols-2">
          <Field label="Business name" name="businessName" required />
          <Field label="City" name="city" required />
          <Field label="Country" name="country" defaultValue="India" />
          <Field label="Category" name="category" placeholder="Salon / Beauty, Restaurant, Dental Clinic..." />
          <Field label="Phone / WhatsApp" name="phone" />
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Lead source</span>
            <select
              value={leadSource}
              onChange={(event) => setLeadSource(event.target.value)}
              className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
            >
              {leadSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </label>
          <Field label="Assigned to" name="assignedTo" />
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Sales stage</span>
            <select
              value={salesStage}
              onChange={(event) => setSalesStage(event.target.value as SalesStage)}
              className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
            >
              {salesStages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <Field label="Google Maps URL" name="googleMapsUrl" />
          <Field label="Website" name="website" />
          <Field label="Instagram URL" name="instagramUrl" />
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create prospect"} <ArrowRight size={16} />
            </Button>
            {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
          </div>
        </form>
      </Panel>
    </ShellPage>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  placeholder
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm font-semibold text-ink"
      />
    </label>
  );
}
