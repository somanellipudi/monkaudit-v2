import { ShieldCheck } from "lucide-react";
import { reportCoverageChecks } from "@/lib/mock-data";
import { MarkdownDocument } from "./MarkdownDocument";
import { Panel, SectionTitle, StatusBadge } from "./ui";

export function ReportSectionEditor({ markdown, businessName, preparedDate }: { markdown: string; businessName?: string; preparedDate?: string }) {
  return (
    <div className="grid min-w-0 gap-5">
      <div>
        <div className="mb-5 border border-stoneLine bg-paper p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk">Prepared by GrowingMonk</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">{businessName || "Growth Intelligence Report"}</h2>
            {preparedDate ? <p className="mt-2 text-sm text-muted">Prepared {preparedDate}</p> : null}
          </div>
        </div>
        <MarkdownDocument markdown={markdown} />
        <div className="mt-6">
          <div className="border border-stoneLine bg-paper p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-sage" size={18} />
              <h3 className="font-semibold text-ink">Client-Safe Language Guardrails</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Separate verified public data from strategic inference.</li>
              <li>Do not estimate missing values or invent competitor numbers.</li>
              <li>Use careful wording: appears to, may be, publicly visible signals suggest.</li>
              <li>State limitations and access required before any performance claims.</li>
            </ul>
          </div>
        </div>
      </div>
      <Panel>
        <div className="mb-5 grid gap-4 border-b border-stoneLine pb-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk">Pre-export checklist</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Everything to check before the PDF goes out</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Each client report should pass these coverage and safety checks before export.
            </p>
          </div>
          <div className="border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Export status</p>
            <p className="mt-2 text-lg font-semibold">Needs Review</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {reportCoverageChecks.map((check) => (
            <div key={check.label} className="border border-stoneLine bg-ivory p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-ink">{check.label}</h3>
                <StatusBadge status={check.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{check.detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
