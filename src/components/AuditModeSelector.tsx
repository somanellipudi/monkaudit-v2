import { CheckCircle2 } from "lucide-react";
import { Panel } from "./ui";

const modes = [
  {
    name: "Quick Audit",
    value: "quick",
    cost: "Low cost",
    time: "Fast research",
    body: "Basic public research for cold leads and first-pass qualification."
  },
  {
    name: "Deep Audit",
    value: "deep",
    cost: "Medium cost",
    time: "More complete",
    body: "Better prospect context, competitor review, and a stronger client report."
  },
  {
    name: "Pre-Proposal Audit",
    value: "pre_proposal",
    cost: "Higher detail",
    time: "Review required",
    body: "Designed for serious opportunities before a strategy or proposal call."
  }
];

export function AuditModeSelector() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {modes.map((mode, index) => (
        <Panel key={mode.name} className={index === 1 ? "border-monk" : ""}>
          <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="radio"
              name="auditMode"
              value={mode.value}
              defaultChecked={index === 1}
              className="h-4 w-4 accent-[#B96324]"
            />
            Select mode
          </label>
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold text-ink">{mode.name}</h3>
            {index === 1 ? <CheckCircle2 className="text-monk" size={20} /> : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{mode.body}</p>
          <div className="mt-5 flex gap-2">
            <span className="border border-stoneLine bg-ivory px-2 py-1 text-xs font-semibold text-muted">{mode.cost}</span>
            <span className="border border-stoneLine bg-ivory px-2 py-1 text-xs font-semibold text-muted">{mode.time}</span>
          </div>
        </Panel>
      ))}
    </div>
  );
}
