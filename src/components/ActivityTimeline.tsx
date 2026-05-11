import type { ActivityLog } from "@/lib/types";
import { EmptyState, Panel, SectionTitle } from "./ui";

const labels: Record<string, string> = {
  "lead.created": "Lead created",
  "lead.updated": "Lead updated",
  "audit.created": "Audit created",
  "audit.updated": "Audit updated",
  "follow_up.created": "Follow-up created",
  "follow_up.updated": "Follow-up updated",
  "report.saved": "Report saved",
  "report.reviewed": "Report reviewed",
  "report.exported": "Client PDF export recorded",
  "report.shared": "Report shared with prospect",
  "client_account.created": "Client handoff created"
};

export function ActivityTimeline({ logs, title = "Activity", detail }: { logs: ActivityLog[]; title?: string; detail?: string }) {
  return (
    <Panel>
      <SectionTitle title={title} detail={detail || "Recent system and user actions for this record."} />
      {logs.length ? (
        <div className="space-y-3 text-sm">
          {logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-3 border-b border-stoneLine pb-3 last:border-0">
              <span className="mt-2 h-2 w-2 bg-monk" />
              <div className="min-w-0">
                <p className="font-semibold text-ink">{labels[log.action] || log.action}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {log.actorId} - {formatDate(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No activity yet" body="Activity will appear here after updates, audit creation, review, export, and sharing events." />
      )}
    </Panel>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
