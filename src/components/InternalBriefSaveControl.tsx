"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Printer, Save } from "lucide-react";
import { Button } from "./ui";

export function InternalBriefSaveControl({ auditRunId, leadId, markdown }: { auditRunId: string; leadId: string; markdown: string }) {
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
        type: "internal_sales_brief",
        status: "Draft",
        markdown,
        internalBriefMarkdown: markdown
      })
    });
    setSaving(false);
    setMessage(response.ok ? "Internal brief saved." : "Could not save internal brief.");
    router.refresh();
    return response.ok;
  }

  async function exportBrief() {
    setSaving(true);
    setMessage("");
    const saved = await saveDraft();
    if (!saved) {
      setSaving(false);
      return;
    }
    const response = await fetch("/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditRunId,
        type: "internal_sales_brief"
      })
    });
    setSaving(false);
    setMessage(response.ok ? "Internal brief export recorded." : "Could not export internal brief.");
    router.refresh();
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `internal-brief-${auditRunId}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Internal brief downloaded.");
  }

  function printPdf() {
    window.print();
    setMessage("Print dialog opened. Choose Save as PDF to download a PDF.");
  }

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={() => void saveDraft()} disabled={saving}>
        <Save size={16} /> {saving ? "Saving..." : "Save internal brief"}
      </Button>
      <Button type="button" className="w-full justify-center px-3" onClick={() => void exportBrief()} disabled={saving}>
        <Download size={16} /> Record export
      </Button>
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={downloadMarkdown} disabled={saving}>
        <Download size={16} /> Download brief
      </Button>
      <Button type="button" variant="secondary" className="w-full justify-center px-3" onClick={printPdf} disabled={saving}>
        <Printer size={16} /> Print / Save PDF
      </Button>
      {message ? <span className="text-sm font-semibold leading-5 text-muted sm:col-span-2 xl:col-span-4">{message}</span> : null}
    </div>
  );
}
