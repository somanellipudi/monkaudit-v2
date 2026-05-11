"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { ShellPage } from "@/components/AppShell";
import { AuditModeSelector } from "@/components/AuditModeSelector";
import { LeadForm } from "@/components/LeadForm";
import { Button, PageHeader, Panel, SectionTitle } from "@/components/ui";

export function NewAuditClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [error, setError] = useState("");

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitMessage("Creating audit record...");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const googleMapsUrl = normalizeSourceLink(String(formData.get("googleMapsUrl") || ""));
    const website = normalizeSourceLink(String(formData.get("website") || ""));
    const instagramUrl = normalizeSourceLink(String(formData.get("instagramUrl") || ""));
    const facebookUrl = normalizeSourceLink(String(formData.get("facebookUrl") || ""));
    const otherPublicLink = normalizeSourceLink(String(formData.get("otherPublicLink") || ""));
    if (!leadId && !googleMapsUrl && !website && !instagramUrl && !facebookUrl && !otherPublicLink) {
      setError("Add at least one public source link. Google Maps or GBP is preferred.");
      setSubmitMessage("");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        googleMapsUrl,
        website,
        instagramUrl,
        facebookUrl,
        otherPublicLink,
        phone: String(formData.get("phone") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        contactName: String(formData.get("contactName") || "").trim(),
        contactRole: String(formData.get("contactRole") || "").trim(),
        salesContext: String(formData.get("salesContext") || "").trim(),
        auditMode: String(formData.get("auditMode") || "deep")
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "Audit could not be created. Check required prospect fields and source links.");
      setSubmitMessage("");
      setIsSubmitting(false);
      return;
    }

    const result = await response.json();
    setSubmitMessage("Opening audit workspace...");
    router.push(`/sales-audit/${result.audit.id}`);
  }

  return (
    <ShellPage>
      <PageHeader
        eyebrow="New Growth Audit"
        title={leadId ? "Start audit for existing lead" : "Start with one strong source link"}
        description={
          leadId
            ? "This audit will attach to the selected lead. Add stronger public links or contact details only if they improve the record."
            : "Paste the Google Maps profile, website, Instagram, or another public source link. Business details can be enriched from the source."
        }
      />
      <form onSubmit={submitAudit} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {leadId ? (
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Attached lead</p>
                  <p className="mt-1 text-sm text-muted">New audit will use lead record <span className="font-semibold text-ink">{leadId}</span>.</p>
                </div>
                <Link href={`/leads/${leadId}`} className="text-sm font-semibold text-monk">Open lead</Link>
              </div>
            </Panel>
          ) : null}
          <Panel>
            <Step number="1" title="Prospect sources" />
            <LeadForm />
          </Panel>
          <Panel>
            <Step number="2" title="Audit mode" />
            <AuditModeSelector />
          </Panel>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating audit..." : "Run audit"} <ArrowRight size={16} />
            </Button>
          </div>
          {submitMessage ? <p className="text-sm font-semibold text-muted">{submitMessage}</p> : null}
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        </div>
        <aside className="space-y-5">
          <Panel>
            <SectionTitle title="What happens next" detail="Keep intake light. MonkAudit can enrich the record after the first source is provided." />
            <div className="space-y-4">
              {["Create a lead and audit run", "Discover business details from public links", "Separate verified data from inference", "Prepare internal brief and client-safe report", "Send report to review before sharing"].map((item) => (
                <div key={item} className="flex gap-2 text-sm leading-6 text-muted">
                  <CheckCircle2 className="mt-1 shrink-0 text-sage" size={15} />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionTitle title="Best source order" />
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p><span className="font-semibold text-ink">Required:</span> at least one public source link.</p>
              <p><span className="font-semibold text-ink">1. Google Maps:</span> best for identity, reviews, rating, address, phone, category.</p>
              <p><span className="font-semibold text-ink">2. Website:</span> useful for services, CTAs, tracking gaps, contact flow.</p>
              <p><span className="font-semibold text-ink">3. Social:</span> useful for activity, content quality, trust signals.</p>
            </div>
          </Panel>
        </aside>
      </form>
    </ShellPage>
  );
}

function normalizeSourceLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function Step({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-stoneLine pb-4">
      <span className="grid h-8 w-8 place-items-center bg-ink text-sm font-semibold text-paper">{number}</span>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
    </div>
  );
}
