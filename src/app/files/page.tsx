import type { LucideIcon } from "lucide-react";
import { Archive, FileJson, FileText, FolderOpen, Image, LockKeyhole, UploadCloud } from "lucide-react";
import { ShellPage } from "@/components/AppShell";
import { Button, EmptyState, PageHeader, Panel, SectionTitle, StatCard, StatusBadge, tableHeadClassName } from "@/components/ui";
import { listFiles } from "@/lib/server/repositories";

const categories: Array<{ category: string; detail: string; Icon: LucideIcon; rule: string }> = [
  {
    category: "Client PDFs",
    detail: "Reviewed Growth Due Diligence reports and client-safe exports.",
    Icon: FileText,
    rule: "Requires approval"
  },
  {
    category: "Internal briefs",
    detail: "Sales-only call prep, pitch angles, objections, and cautions.",
    Icon: Archive,
    rule: "Internal only"
  },
  {
    category: "Raw research JSON",
    detail: "Evidence packs, source snapshots, normalized discovery data.",
    Icon: FileJson,
    rule: "System archive"
  },
  {
    category: "Screenshots",
    detail: "Website, GBP, SERP, social profile, and funnel evidence.",
    Icon: Image,
    rule: "Evidence only"
  },
  {
    category: "Exports",
    detail: "Convenience copies for Google Drive or manual sales sharing.",
    Icon: UploadCloud,
    rule: "Copy only"
  }
];

const storageRules = [
  ["Source of truth", "Cloud Storage path and Firestore file metadata"],
  ["Client sharing", "Only reviewed PDFs and approved exports"],
  ["Internal protection", "Briefs, raw JSON, screenshots stay internal"],
  ["Future portal handoff", "Create references; do not expose sales files directly"]
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const files = await listFiles();
  const clientPdfs = files.filter((file) => file.category === "Client PDFs").length;
  const internalBriefs = files.filter((file) => file.category === "Internal briefs").length;
  const rawEvidence = files.filter((file) => file.category === "Raw research JSON" || file.category === "Screenshots").length;
  const exports = files.filter((file) => file.category === "Exports").length;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Files"
        title="Research evidence and report storage"
        description="Keep sales evidence, internal intelligence, and client-safe reports separated for clean handoffs."
        action={
          <Button variant="secondary">
            <FolderOpen size={16} /> Storage map
          </Button>
        }
      />

      <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="Client PDFs" value={String(clientPdfs)} detail="Reviewed or queued for review" />
        <StatCard label="Raw evidence" value={String(rawEvidence)} detail="JSON, screenshots, source notes" />
        <StatCard label="Internal briefs" value={String(internalBriefs)} detail="Protected sales-only files" />
        <StatCard label="Exports" value={String(exports)} detail="Convenience copies only" />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionTitle title="Storage Categories" detail="Each file type has a clear owner, access rule, and handoff boundary." />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {categories.map(({ category, detail, Icon, rule }) => (
              <div key={category} className="border border-stoneLine bg-ivory p-4">
                <div className="flex items-start justify-between gap-3">
                  <Icon className="text-monk" size={18} />
                  <StatusBadge status={rule} />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink">{category}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Governance" detail="Simple rules keep client-facing and internal files separate." />
          <div className="space-y-4">
            {storageRules.map(([label, detail]) => (
              <div key={label} className="border-b border-stoneLine pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionTitle title="Recent Files" detail="Exported reports and internal briefs appear here as file metadata." />
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className={tableHeadClassName}>
              <tr>
                {["File", "Category", "Owner", "Updated", "Canonical Storage", "Access", "Portal Handoff"].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const isClientSafe = file.category === "Client PDFs";
                return (
                  <tr key={file.id} className="border-b border-stoneLine last:border-0">
                    <td className="px-3 py-4 font-semibold text-ink">{file.name}</td>
                    <td className="px-3 py-4"><StatusBadge status={file.category} /></td>
                    <td className="px-3 py-4 text-muted">{file.owner}</td>
                    <td className="px-3 py-4 text-muted">{file.updated}</td>
                    <td className="px-3 py-4 text-muted">{file.storagePath || "Repository metadata"}</td>
                    <td className="px-3 py-4 text-muted">{file.access || (isClientSafe ? "Client-safe after review" : "Internal only")}</td>
                    <td className="px-3 py-4 text-muted">{file.portalHandoff || (isClientSafe ? "Reference allowed" : "Blocked")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6">
        <EmptyState
          title="Drive export is not the archive"
          body="MonkAudit can create convenience Drive copies, but Cloud Storage and Firestore metadata remain the operational record."
          action={
            <Button variant="ghost">
              <LockKeyhole size={16} /> Review access policy
            </Button>
          }
        />
      </div>
    </ShellPage>
  );
}
