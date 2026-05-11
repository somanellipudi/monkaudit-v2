"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  CalendarCheck,
  Columns2,
  FileText,
  Home,
  LayoutGrid,
  Plus,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";

type ShellUser = {
  email: string;
  name: string;
  teamId: string;
  roleIds: string[];
};

type AiUsageRecord = {
  estimatedUsd: number;
};

const navItems = [
  { href: "/", label: "MonkAudit Home", icon: Home },
  { href: "/sales-audit/new", label: "New Audit", icon: Plus },
  { href: "/sales-audit", label: "Audits", icon: Sparkles },
  { href: "/sales-workspace/reports", label: "Reports", icon: FileText },
  { href: "/sales-workspace/follow-ups", label: "Follow-ups", icon: CalendarCheck },
  { href: "/sales-workspace/pipeline", label: "Pipeline", icon: Columns2 },
  { href: "/sales-workspace/won-lost", label: "Won/Lost", icon: Trophy },
  { href: "/leads", label: "Leads", icon: LayoutGrid },
  { href: "/settings", label: "System", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ShellUser>({
    email: "Not signed in",
    name: "GrowingMonk Team",
    teamId: "workspace",
    roleIds: []
  });
  const [monthCost, setMonthCost] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadShellData() {
      try {
        const [sessionResponse, usageResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/ai-usage", { cache: "no-store" })
        ]);
        if (!mounted) return;

        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          if (session.user) setUser(session.user);
        }
        if (usageResponse.ok) {
          const usagePayload = await usageResponse.json();
          const usage = Array.isArray(usagePayload.usage) ? (usagePayload.usage as AiUsageRecord[]) : [];
          setMonthCost(usage.reduce((sum, item) => sum + (Number(item.estimatedUsd) || 0), 0));
        }
      } catch {
        // Keep the seed user and static shell if local APIs are unavailable.
      }
    }

    void loadShellData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden w-full border-r border-[#2f2b24] bg-[#211f1b] text-paper lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[232px]">
        <div className="flex h-full min-h-screen flex-col overflow-x-hidden px-3 py-4">
          <Link href="/" className="mb-4 block border-b border-white/10 px-2 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <BrandLogo tone="dark" />
            <p className="mt-3 text-[18px] font-semibold leading-tight">MonkAudit</p>
            <p className="mt-1 text-xs text-paper/45">Audit and report workspace</p>
          </Link>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex min-w-0 items-center gap-3 border border-transparent px-3 py-2.5 text-sm font-semibold transition",
                    active ? "border-white/12 bg-paper text-ink" : "text-paper/68 hover:border-white/10 hover:bg-white/[0.06] hover:text-paper"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-white/10 px-2 pt-4">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="mt-1 truncate text-xs text-paper/55">{user.email}</p>
            <p className="mt-2 truncate text-[11px] uppercase tracking-[0.16em] text-paper/35">{user.teamId}</p>
          </div>
        </div>
      </aside>
      <main className="min-w-0 pb-20 lg:col-start-2 lg:w-[calc(100vw-232px)] lg:pb-0">
        <Topbar monthCost={monthCost} />
        <div className="mx-auto w-full max-w-[1280px] min-w-0 px-4 py-6 sm:px-5 lg:px-7">{children}</div>
      </main>
      <MobileNav pathname={pathname} />
    </div>
  );
}

function Topbar({ monthCost }: { monthCost: number | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center justify-between gap-4 overflow-hidden border-b border-stoneLine bg-[#f8f5ef]/95 px-4 backdrop-blur sm:px-5 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-[150px] shrink-0 items-center">
          <BrandLogo tone="light" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">MonkAudit</p>
          <p className="truncate text-xs text-muted">Audits, client reports, follow-ups.</p>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <BarChart3 size={17} className="text-monk" />
        <span className="whitespace-nowrap text-sm text-muted">
          Estimated AI cost: {monthCost === null ? "checking..." : `$${monthCost.toFixed(2)}`}
        </span>
      </div>
    </header>
  );
}

function BrandLogo({ tone }: { tone: "dark" | "light" }) {
  return (
    <span className="flex min-w-0 items-center gap-2" aria-label="GrowingMonk">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/GrowingMonk_mark_transparent_orange.png" alt="" className="h-[24px] w-[24px] object-contain" />
      <span className={clsx("whitespace-nowrap text-sm font-bold leading-none", tone === "dark" ? "text-paper" : "text-ink")}>GrowingMonk</span>
    </span>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const mobileItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/sales-audit/new", label: "New", icon: Plus },
    { href: "/sales-audit", label: "Audits", icon: Sparkles },
    { href: "/sales-workspace/reports", label: "Reports", icon: FileText },
    { href: "/sales-workspace/follow-ups", label: "Follow-ups", icon: CalendarCheck }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stoneLine bg-[#211f1b] text-paper shadow-2xl lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px]", active ? "text-saffron" : "text-paper/62")}
          >
            <Icon size={17} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ShellPage({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
