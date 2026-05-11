import clsx from "clsx";
import Link from "next/link";
import type { AuditStatus, Score } from "@/lib/types";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={clsx(buttonClassName(variant, className), "disabled:cursor-not-allowed disabled:opacity-50")}
      {...props}
    >
      {children}
    </button>
  );
}

export function buttonClassName(variant: "primary" | "secondary" | "ghost" = "primary", className?: string) {
  return clsx(
    "focus-ring inline-flex h-10 items-center justify-center gap-2 border px-4 text-[13px] font-semibold transition",
    variant === "primary" && "border-monk bg-ink text-paper hover:bg-[#2a2722]",
    variant === "secondary" && "border-stoneLine bg-paper text-ink hover:border-monk",
    variant === "ghost" && "border-transparent bg-transparent text-muted hover:text-ink",
    className
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 grid min-w-0 gap-5 border-b border-stoneLine pb-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-monk">{eyebrow}</p> : null}
        <h1 className="max-w-4xl text-3xl font-semibold leading-[1.12] text-ink md:text-[34px]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap items-start gap-2 lg:justify-end">{action}</div> : null}
    </div>
  );
}

export function Panel({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={clsx("min-w-0 border border-stoneLine bg-paper p-5 shadow-[0_12px_34px_rgba(29,27,24,0.035)]", className)}>{children}</section>;
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Panel className="min-h-[112px] overflow-hidden p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-3 text-xs leading-5 text-muted">{detail}</p>
    </Panel>
  );
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-4 flex min-w-0 items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {detail ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{detail}</p> : null}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: AuditStatus | string }) {
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  const tone =
    status === "Failed" || status === "Lost" || status === "Overdue"
      ? "border-red-200 bg-red-50 text-red-800"
      : status === "Won" || status === "Approved" || status === "Completed"
        ? "border-green-200 bg-green-50 text-green-800"
        : status === "Needs Review" || status === "Queued" || status === "Research Running" || status === "Pending" || status === "Audit Requested"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-stoneLine bg-ivory text-muted";
  return <span className={clsx("inline-flex whitespace-nowrap border px-2.5 py-1 text-[11px] font-semibold", tone)}>{label}</span>;
}

function scoreLanguage(score: Score) {
  if (score.tone === "strong") return "Strong foundation";
  if (score.tone === "good") return "Good base with visible gaps";
  if (score.tone === "gap") return "Major improvement opportunity";
  return "Foundational work needed";
}

export function ScoreCard({ score }: { score: Score }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold leading-5 text-ink">{score.label}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{scoreLanguage(score)}</p>
        </div>
        <p className="text-2xl font-semibold text-ink">{score.value}</p>
      </div>
      <div className="mt-5 h-2 bg-ivory">
        <div className="h-2 bg-monk" style={{ width: `${score.value}%` }} />
      </div>
    </Panel>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Panel className="flex min-h-72 flex-col items-center justify-center text-center">
      <div className="mb-5 h-12 w-12 border border-stoneLine bg-ivory" />
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Panel>
  );
}

export function CostUsageCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Panel>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="mt-4 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-muted">{helper}</p>
    </Panel>
  );
}

export function UserRoleBadge({ role }: { role: string }) {
  return <span className="border border-stoneLine bg-ivory px-2 py-1 text-xs font-semibold text-muted">{role}</span>;
}

export function PageTabs({ items }: { items: Array<{ label: string; href: string; active?: boolean }> }) {
  return (
    <div className="mb-5 border-b border-stoneLine">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "whitespace-nowrap border-x border-t border-stoneLine px-4 py-2.5 text-sm font-semibold transition",
              item.active ? "bg-paper text-ink" : "bg-transparent text-muted hover:bg-paper hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export const tableHeadClassName = "border-b border-stoneLine bg-[#fbf8f2] text-[11px] uppercase tracking-[0.12em] text-muted";
