"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Button } from "./ui";

export function ReportDeleteButton({ reportId, reportName }: { reportId: string; reportName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteReport() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not delete report.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete report.");
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
        <span className="text-xs font-semibold text-red-700">Delete?</span>
        <Button type="button" variant="ghost" className="h-8 px-2 text-red-700 hover:text-red-800" onClick={() => void deleteReport()} disabled={loading} aria-label={`Confirm delete ${reportName}`}>
          <Trash2 size={14} /> {loading ? "Deleting" : "Yes"}
        </Button>
        <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setConfirming(false)} disabled={loading} aria-label="Cancel delete">
          <X size={14} /> No
        </Button>
        {message ? <p className="basis-full text-right text-xs font-semibold text-red-700">{message}</p> : null}
      </div>
    );
  }

  return (
    <Button type="button" variant="ghost" className="h-8 px-2 text-red-700 hover:text-red-800" onClick={() => setConfirming(true)} aria-label={`Delete ${reportName}`}>
      <Trash2 size={14} /> Delete
    </Button>
  );
}
