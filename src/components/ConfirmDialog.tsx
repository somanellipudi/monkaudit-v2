import { AlertTriangle } from "lucide-react";
import { Button, Panel } from "./ui";

export function ConfirmDialog() {
  return (
    <Panel className="max-w-lg">
      <AlertTriangle className="text-monk" size={22} />
      <h2 className="mt-4 text-xl font-semibold text-ink">Confirm client report export</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Export only after the report has been reviewed for factual accuracy, client-safe language, and unsupported claims.
      </p>
      <div className="mt-5 flex gap-2">
        <Button>Confirm export</Button>
        <Button variant="secondary">Cancel</Button>
      </div>
    </Panel>
  );
}
