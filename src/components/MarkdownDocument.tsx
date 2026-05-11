import { Panel } from "./ui";

export function MarkdownDocument({ markdown }: { markdown: string }) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <Panel className="p-5 md:p-6">
      <article className="space-y-5 text-sm leading-6 text-muted">
        {blocks.map((block, index) => renderBlock(block, index))}
      </article>
    </Panel>
  );
}

function renderBlock(block: string, index: number) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const rest = lines.slice(1).join("\n");
  if (isTableBlock(block)) {
    return renderTable(block, index);
  }
  if (firstLine.startsWith("# ")) {
    return (
      <div key={index} className="space-y-3">
        <h1 className="text-2xl font-semibold leading-tight text-ink">{renderInline(firstLine.slice(2))}</h1>
        {rest ? renderBlock(rest, index + 10000) : null}
      </div>
    );
  }
  if (firstLine.startsWith("## ")) {
    return (
      <div key={index} className="space-y-3 border-t border-stoneLine pt-6">
        <h2 className="text-lg font-semibold leading-snug text-ink">{renderInline(firstLine.slice(3))}</h2>
        {rest ? renderBlock(rest, index + 10000) : null}
      </div>
    );
  }
  if (firstLine.startsWith("### ")) {
    return (
      <div key={index} className="space-y-2">
        <h3 className="text-base font-semibold text-ink">{renderInline(firstLine.slice(4))}</h3>
        {rest ? renderBlock(rest, index + 10000) : null}
      </div>
    );
  }
  if (isListBlock(block)) {
    const lines = block.split("\n").filter(Boolean);
    const intro = lines.find((line) => !isListItem(line));
    const items = lines.filter(isListItem).map(stripListMarker);
    const ordered = lines.some((line) => /^\d+\.\s+/.test(line));
    const ListTag = ordered ? "ol" : "ul";
    return (
      <div key={index} className="space-y-3">
        {intro ? <p>{renderInline(intro)}</p> : null}
        <ListTag className={ordered ? "list-decimal space-y-2 pl-5" : "space-y-2"}>
          {items.map((item) => (
            <li key={item} className={ordered ? "pl-1" : "border-l-2 border-monk/40 pl-3"}>{renderInline(item)}</li>
          ))}
        </ListTag>
      </div>
    );
  }
  return <p key={index}>{renderInline(block)}</p>;
}

function isTableBlock(block: string) {
  const lines = block.split("\n").map((line) => line.trim());
  return lines.length >= 2 && lines[0].startsWith("|") && lines[1].includes("---");
}

function renderTable(block: string, index: number) {
  const rows = block.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("|"));
  const header = splitTableRow(rows[0]);
  const body = rows.slice(2).map(splitTableRow);
  return (
    <div key={index} className="overflow-x-auto border border-stoneLine">
      <table className="w-full min-w-[720px] border-collapse bg-paper text-left text-sm">
        <thead className="bg-ivory text-xs uppercase tracking-[0.12em] text-muted">
          <tr>{header.map((cell) => <th key={cell} className="border-b border-stoneLine px-4 py-3 font-bold">{renderInline(cell)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`} className="border-b border-stoneLine last:border-0">
              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="px-4 py-3 align-top text-muted">{renderInline(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function splitTableRow(row: string) {
  return row.split("|").slice(1, -1).map((cell) => cell.trim());
}

function isListBlock(block: string) {
  return block.split("\n").some(isListItem);
}

function isListItem(line: string) {
  return /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);
}

function stripListMarker(line: string) {
  return line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
}

function renderInline(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
