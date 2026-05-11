import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Panel } from "./ui";

const quickFilters = [
  "City",
  "Country",
  "Area/locality",
  "Radius",
  "Category",
  "Owner",
  "Reviewer",
  "Team",
  "Lead source",
  "Lead status",
  "Sales stage",
  "Audit status",
  "Report status",
  "Next action"
];

const advancedFilters = [
  "Score range",
  "Rating range",
  "Review count range",
  "Has website",
  "Has WhatsApp",
  "Has Instagram",
  "Has Google Business Profile",
  "Created date",
  "Last updated",
  "Next follow-up date",
  "My leads only",
  "Needs review",
  "Overdue",
  "Has phone",
  "Has email",
  "Has WhatsApp",
  "Has Google Business Profile",
  "Visibility",
  "Shared with prospect",
  "Won",
  "Lost",
  "Archived"
];

export function FilterBar({ context = "prospects" }: { context?: string }) {
  return (
    <Panel className="mb-5 bg-[#fbf8f2] p-4">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(280px,1fr)_auto]">
        <label className="relative block min-w-0">
          <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={17} />
          <input
            aria-label={`Search ${context}`}
            className="focus-ring h-10 w-full min-w-0 border border-stoneLine bg-paper pl-10 pr-3 text-sm text-ink"
            placeholder="Search business, owner, city, or category"
          />
        </label>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          {quickFilters.slice(0, 5).map((filter) => (
            <button key={filter} data-filter-field={filter.toLowerCase().replaceAll(" ", "_")} className="focus-ring border border-stoneLine bg-paper px-3 py-2 text-xs font-semibold text-muted hover:border-monk hover:text-ink">
              {filter}
            </button>
          ))}
          <Button variant="secondary"><SlidersHorizontal size={16} /> Advanced Filters</Button>
          <Button variant="ghost"><X size={16} /> Clear filters</Button>
        </div>
      </div>
      <details className="mt-3 border-t border-stoneLine pt-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
          Advanced filter fields
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {advancedFilters.map((filter) => (
            <span key={filter} className="border border-stoneLine bg-ivory px-2.5 py-1 text-xs font-semibold text-muted">
              {filter}
            </span>
          ))}
        </div>
      </details>
    </Panel>
  );
}
