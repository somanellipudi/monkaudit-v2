import { CheckCircle2, CircleDashed } from "lucide-react";
import { Panel } from "./ui";

const steps = [
  ["Audit record created", true],
  ["Business identity resolving", false],
  ["Website and source links checking", false],
  ["Google profile and reviews analyzing", false],
  ["Competitors reviewed", false],
  ["Contact funnel checked", false],
  ["Gemini report generating", false],
  ["Internal sales brief generating", false]
] as const;

export function ResearchProgress() {
  return (
    <Panel>
      <div className="space-y-4">
        {steps.map(([label, done]) => (
          <div key={label} className="flex items-center gap-3 border-b border-stoneLine pb-4 last:border-0 last:pb-0">
            {done ? <CheckCircle2 className="text-sage" size={20} /> : <CircleDashed className="text-monk" size={20} />}
            <span className="text-sm font-semibold text-ink">{label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
