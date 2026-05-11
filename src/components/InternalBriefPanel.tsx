import { MarkdownDocument } from "./MarkdownDocument";
import { Panel } from "./ui";

export function InternalBriefPanel({ markdown }: { markdown: string }) {
  return (
    <div className="min-w-0 space-y-5">
      <MarkdownDocument markdown={markdown} />
    </div>
  );
}
