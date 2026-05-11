import Link from "next/link";
import { Chrome, LockKeyhole, ShieldCheck } from "lucide-react";
import { buttonClassName } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden border border-stoneLine bg-paper shadow-calm lg:grid-cols-[1fr_420px]">
        <div className="p-8 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-monk">GrowingMonk private workspace</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-ink">GrowingMonk MonkAudit</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Internal workspace for prospect intelligence, MonkAudit reports, follow-ups, and controlled AI usage.
          </p>
          <Link href="/" className={buttonClassName("primary", "mt-7")}>
            <Chrome size={18} /> Continue with Google
          </Link>
          <div className="mt-7 grid gap-3 border-t border-stoneLine pt-6 md:grid-cols-2">
            <div className="flex gap-3 text-sm leading-6 text-muted">
              <LockKeyhole className="mt-1 shrink-0 text-monk" size={17} />
              Access is checked against allowlisted Gmail users.
            </div>
            <div className="flex gap-3 text-sm leading-6 text-muted">
              <ShieldCheck className="mt-1 shrink-0 text-sage" size={17} />
              RBAC controls what each user can see and export.
            </div>
          </div>
        </div>
        <aside className="bg-[#211f1b] p-8 text-paper lg:p-10">
          <span className="flex items-center gap-2" aria-label="GrowingMonk">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/GrowingMonk_mark_transparent_orange.png" alt="" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold leading-none text-paper">GrowingMonk</span>
          </span>
          <p className="mt-10 text-2xl font-semibold leading-tight">Better marketing is not luck. It is a system.</p>
          <p className="mt-4 text-sm leading-7 text-paper/65">
            MonkAudit helps the team research prospects, prepare serious audit intelligence, and protect client-facing language.
          </p>
        </aside>
      </section>
    </main>
  );
}
