import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonClassName } from "@/components/ui";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-xl border border-stoneLine bg-paper p-8 text-center shadow-calm">
        <Lock className="mx-auto text-monk" size={30} />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-monk">Private workspace</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Access not approved</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Access not approved. This workspace is private to the GrowingMonk team.
        </p>
        <Link href="/login" className={buttonClassName("secondary", "mt-7")}>Return to login</Link>
      </section>
    </main>
  );
}
