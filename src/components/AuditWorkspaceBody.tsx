"use client";

import { usePathname } from "next/navigation";
import { AuditWorkspaceSidebar } from "@/components/AuditWorkspaceSidebar";
import type { ActivityLog, AuditRun } from "@/lib/types";

export function AuditWorkspaceBody({
  audit,
  activity = [],
  children
}: {
  audit: AuditRun;
  activity?: ActivityLog[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = pathname.endsWith("/client-report");

  return (
    <div className={hideSidebar ? "min-w-0" : "grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"}>
      <div className="min-w-0 animate-[fadeIn_180ms_ease-out]">{children}</div>
      {hideSidebar ? null : (
        <AuditWorkspaceSidebar audit={audit} activity={activity} clientReportHref={`/sales-audit/${audit.id}/client-report`} />
      )}
    </div>
  );
}
