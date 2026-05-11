import dynamic from "next/dynamic";

const NewAuditClient = dynamic(() => import("@/components/NewAuditClient").then((mod) => mod.NewAuditClient), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-ivory px-5 py-8">
      <div className="mx-auto w-full max-w-[960px] border border-stoneLine bg-paper p-6 shadow-calm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-monk">New Growth Audit</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Preparing MonkAudit intake</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Loading the source-link form and audit controls.</p>
      </div>
    </main>
  )
});

export default function NewAuditPage() {
  return <NewAuditClient />;
}
