import Link from "next/link";
import { canSeeRecord } from "@/lib/rbac";
import { auditModeLabel, type AuditRun } from "@/lib/types";
import { StatusBadge } from "./ui";

type VisibilityUser = {
  email: string;
  teamId: string;
  roleIds: string[];
};

function isReportOpenable(audit: AuditRun) {
  return ["Research Completed", "Needs Review", "Approved"].includes(audit.auditStatus);
}

function auditHref(audit: AuditRun) {
  return isReportOpenable(audit) ? `/sales-audit/${audit.id}/client-report` : `/sales-audit/${audit.id}`;
}

function auditAction(audit: AuditRun) {
  if (audit.auditStatus === "Research Completed") return "Open report";
  if (audit.auditStatus === "Needs Review") return "Review report";
  if (audit.auditStatus === "Approved") return "Open report";
  return "Open audit";
}

function scoreChip(score: number) {
  if (score === 0) return { className: "border-stoneLine bg-ivory text-muted", label: "—" };
  if (score <= 39) return { className: "border-red-200 bg-red-50 text-red-800", label: String(score) };
  if (score <= 64) return { className: "border-amber-200 bg-amber-50 text-amber-800", label: String(score) };
  if (score <= 79) return { className: "border-green-200 bg-green-50 text-green-800", label: String(score) };
  return { className: "border-emerald-300 bg-emerald-50 text-emerald-900", label: String(score) };
}

export function AuditTable({ audits, user }: { audits: AuditRun[]; user?: VisibilityUser }) {
  const visibleAudits = user ? audits.filter((audit) => canSeeRecord(user.roleIds, user, audit)) : [];
  return (
    <div className="max-w-full overflow-x-auto border border-stoneLine bg-paper">
      <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
        <thead className="border-b border-stoneLine bg-[#fbf8f2] text-[11px] uppercase tracking-[0.12em] text-muted">
          <tr>
            {[
              "Business",
              "City",
              "Area",
              "Category",
              "Assigned Owner",
              "Reviewer",
              "Team",
              "Visibility",
              "Audit Mode",
              "Score",
              "Audit Status",
              "Next Follow-up",
              "Last Updated",
              "Action"
            ].map(
              (heading) => (
                <th key={heading} className="px-4 py-3 font-bold">
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {visibleAudits.map((audit) => {
            const href = auditHref(audit);
            const score = scoreChip(audit.score);
            return (
              <tr key={audit.id} className="border-b border-stoneLine last:border-0 hover:bg-[#fbf8f2]">
                <td className="px-4 py-3">
                  <Link className="font-semibold text-ink hover:text-monk" href={href}>
                    {audit.businessName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{audit.city}</td>
                <td className="px-4 py-3 text-muted">{audit.area}</td>
                <td className="px-4 py-3 text-muted">{audit.category}</td>
                <td className="px-4 py-3 text-muted">{audit.assignedTo}</td>
                <td className="px-4 py-3 text-muted">{audit.assignedStrategist}</td>
                <td className="px-4 py-3 text-muted">{audit.teamId}</td>
                <td className="px-4 py-3 text-muted">{audit.visibility}</td>
                <td className="px-4 py-3 text-muted">{auditModeLabel(audit.auditMode)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex min-w-10 justify-center border px-2.5 py-1 text-xs font-semibold ${score.className}`}>{score.label}</span>
                </td>
                <td className="px-4 py-3">
                  <Link href={href} className="inline-flex">
                    <StatusBadge status={audit.auditStatus} />
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{audit.nextFollowUpAt}</td>
                <td className="px-4 py-3 text-muted">{audit.lastUpdated}</td>
                <td className="px-4 py-3">
                  <Link className="font-semibold text-monk" href={href}>
                    {auditAction(audit)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
