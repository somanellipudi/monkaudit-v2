"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw, RotateCcw } from "lucide-react";
import { Button, Panel, SectionTitle, StatusBadge } from "./ui";

type DbSummary = {
  provider: string;
  counts: Record<string, number>;
  updatedAt: string;
};

type HealthResponse = {
  ok: boolean;
  env: string;
  authRequired: boolean;
  cloud: {
    project: string;
    location: string;
    gcsBucket: string;
    geminiModel: string;
    geminiApiKey: string;
    googleMapsApiKey: string;
  };
  adapters: {
    firestore: {
      enabled: boolean;
      ready: boolean;
      mode: string;
    };
  };
  db: DbSummary;
};

type LoadState = "idle" | "loading" | "ready" | "error";

export function DbControlPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  async function loadHealth() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Health check failed.");
      setHealth((await response.json()) as HealthResponse);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not check system health.");
    }
  }

  async function resetLocalDb() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/db/reset", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reset failed.");
      setConfirmReset(false);
      setMessage("Local demo data has been reset.");
      await loadHealth();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not reset local data.");
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const counts = health?.db.counts;
  const isProduction = health?.env === "production";

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle title="System Health" detail="Quick check for local data and API status." />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void loadHealth()} disabled={state === "loading"}>
            <RefreshCcw size={16} /> Refresh
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)} disabled={state === "loading" || isProduction}>
            <RotateCcw size={16} /> Reset demo data
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <HealthTile label="Status" value={health?.ok ? "Healthy" : state === "error" ? "Issue" : "Checking"} badge />
        <HealthTile label="Data mode" value={health?.db.provider ?? "..."} />
        <HealthTile label="Audits" value={String(counts?.audit_runs ?? "...")} />
        <HealthTile label="Reports" value={String(counts?.reports ?? "...")} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReadinessRow label="Auth gate" value={health?.authRequired ? "Required" : "Local bypass"} />
        <ReadinessRow label="Firestore" value={health?.adapters.firestore.ready ? "Ready" : health?.adapters.firestore.mode || "Not configured"} />
        <ReadinessRow label="Storage bucket" value={health?.cloud.gcsBucket || "Not configured"} />
        <ReadinessRow label="Gemini model" value={health?.cloud.geminiModel || "Not configured"} />
        <ReadinessRow label="Gemini key" value={health?.cloud.geminiApiKey || "Not configured"} />
        <ReadinessRow label="Maps key" value={health?.cloud.googleMapsApiKey || "Not configured"} />
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">
        Last checked: {health?.db.updatedAt ? new Date(health.db.updatedAt).toLocaleString() : "waiting for response"}.
      </p>

      {message ? <p className="mt-3 text-sm font-semibold text-ink">{message}</p> : null}

      {confirmReset ? (
        <div className="mt-5 border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-monk" size={18} />
            <div>
              <p className="text-sm font-semibold text-ink">Reset local demo data?</p>
              <p className="mt-1 text-sm leading-6 text-muted">This only affects the local test database. Production reset is disabled.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void resetLocalDb()} disabled={state === "loading"}>Confirm reset</Button>
                <Button type="button" variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stoneLine bg-paper p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function HealthTile({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-4">
        {badge ? <StatusBadge status={value} /> : <p className="text-2xl font-semibold capitalize text-ink">{value}</p>}
      </div>
    </div>
  );
}
