"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button, Panel, SectionTitle } from "./ui";

export function AutoRunAudit({
  auditId,
  shouldRun,
  generationStatus,
  isRunning
}: {
  auditId: string;
  shouldRun: boolean;
  generationStatus?: string;
  isRunning: boolean;
}) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "failed">(shouldRun ? "running" : "idle");
  const [message, setMessage] = useState(shouldRun ? "Starting Gemini audit generation..." : "");

  const generateAudit = useCallback(async () => {
    setStatus("running");
    setMessage("Generating Gemini report from the submitted public sources. This can take a little while.");
    const response = await fetch(`/api/audits/${auditId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requireGemini: true })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("failed");
      setMessage(payload.error || "Gemini audit generation failed.");
      router.refresh();
      return;
    }
    setStatus("done");
    setMessage("Gemini audit generated. Refreshing report...");
    router.refresh();
  }, [auditId, router]);

  useEffect(() => {
    if (!shouldRun || startedRef.current) return;
    startedRef.current = true;
    void generateAudit();
  }, [generateAudit, shouldRun]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 20000);
    return () => clearInterval(interval);
  }, [isRunning, router]);

  if (!shouldRun && generationStatus === "gemini_generated") return null;

  return (
    <Panel className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {status === "running" ? <Loader2 className="mt-0.5 animate-spin text-monk" size={20} /> : <Sparkles className="mt-0.5 text-monk" size={20} />}
          <div>
            <SectionTitle
              title={status === "failed" ? "Gemini Generation Needs Attention" : "Gemini Audit Generation"}
              detail={message || "Generate the consultant-grade report from the collected source data."}
            />
          </div>
        </div>
        <Button type="button" onClick={() => void generateAudit()} disabled={status === "running"}>
          <Sparkles size={16} /> {status === "running" ? "Generating..." : "Generate Gemini audit"}
        </Button>
      </div>
    </Panel>
  );
}
