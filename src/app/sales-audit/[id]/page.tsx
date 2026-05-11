import { AuditDetailView } from "@/components/AuditDetailView";
import { getAudit } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GenericAuditPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  if (!audit) return null;
  return <AuditDetailView audit={audit} />;
}
