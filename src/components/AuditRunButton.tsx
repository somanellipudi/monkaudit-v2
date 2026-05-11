"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "./ui";

export function AuditRunButton({ auditId, isRunning, generationStatus }: { auditId: string; isRunning: boolean; generationStatus?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runAudit(force = false, requireGemini = false) {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/audits/${auditId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force, requireGemini })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(response.ok ? (requireGemini ? "Gemini report generated." : "Research completed.") : payload.error || "Research could not run.");
    router.refresh();
  }

  return (
    <div>
      <Button type="button" className="w-full" onClick={() => void runAudit(true, true)} disabled={loading || isRunning}>
        <Sparkles size={16} /> {loading ? "Generating..." : isRunning ? "Research running" : generationStatus === "gemini_generated" ? "Regenerate Gemini audit" : "Generate Gemini audit"}
      </Button>
      <Button type="button" className="mt-2 w-full" variant="secondary" onClick={() => void runAudit(false, false)} disabled={loading || isRunning}>
        <Play size={16} /> Run research fallback
      </Button>
      {isRunning ? (
        <Button type="button" className="mt-2 w-full" variant="ghost" onClick={() => void runAudit(true, false)} disabled={loading}>
          <RotateCcw size={16} /> Force retry
        </Button>
      ) : null}
      {message ? <p className={`mt-2 text-sm font-semibold ${message.includes("failed") || message.includes("not generated") || message.includes("GEMINI") ? "text-red-700" : "text-muted"}`}>{message}</p> : null}
    </div>
  );
}
