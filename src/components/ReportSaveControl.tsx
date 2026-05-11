"use client";

import { useState } from "react";
import { Download, Printer, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function ReportSaveControl({ auditRunId, leadId, markdown }: { auditRunId: string; leadId: string; markdown: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveDraft() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditRunId,
        leadId,
        type: "client_growth_due_diligence",
        status: "Draft",
        markdown,
        clientReportMarkdown: markdown
      })
    });
    setSaving(false);
    setMessage(response.ok ? "Draft saved." : "Could not save draft.");
    router.refresh();
    return response.ok;
  }

  async function markReviewed() {
    setSaving(true);
    setMessage("");
    const saved = await saveDraft();
    if (!saved) {
      setSaving(false);
      return;
    }
    const response = await fetch("/api/reports/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditRunId,
        type: "client_growth_due_diligence"
      })
    });
    setSaving(false);
    setMessage(response.ok ? "Report marked reviewed." : "Save a draft before review.");
    router.refresh();
  }

  async function markShared() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/reports/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditRunId,
        type: "client_growth_due_diligence"
      })
    });
    setSaving(false);
    setMessage(response.ok ? "Report marked shared." : "Approve the report before sharing.");
    router.refresh();
  }

  async function exportPdf() {
    setSaving(true);
    setMessage("");
    const saved = await saveDraft();
    if (!saved) {
      setSaving(false);
      return;
    }
    const reviewed = await fetch("/api/reports/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditRunId,
        type: "client_growth_due_diligence"
      })
    });
    if (!reviewed.ok) {
      setSaving(false);
      setMessage("Could not approve the report before export.");
      router.refresh();
      return;
    }
    const response = await fetch("/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditRunId,
        type: "client_growth_due_diligence"
      })
    });
    setSaving(false);
    setMessage(response.ok ? "PDF export recorded." : "Could not export the approved report.");
    router.refresh();
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `growth-report-${auditRunId}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Report markdown downloaded.");
  }

  function printPdf() {
    window.print();
    setMessage("Print dialog opened. Choose Save as PDF to download a PDF.");
  }

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-6">
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={() => void saveDraft()} disabled={saving}>
        <Save size={16} /> {saving ? "Saving..." : "Save draft"}
      </Button>
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={() => void markReviewed()} disabled={saving}>
        Mark reviewed
      </Button>
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={() => void markShared()} disabled={saving}>
        <Send size={16} /> Record shared
      </Button>
      <Button type="button" className="w-full justify-center px-3" onClick={() => void exportPdf()} disabled={saving}>
        <Download size={16} /> Approve export
      </Button>
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={downloadMarkdown} disabled={saving}>
        <Download size={16} /> Download report
      </Button>
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={printPdf} disabled={saving}>
        <Printer size={16} /> Print / Save PDF
      </Button>
      {message ? <span className="text-sm font-semibold leading-5 text-muted sm:col-span-2 xl:col-span-6">{message}</span> : null}
    </div>
  );
}
