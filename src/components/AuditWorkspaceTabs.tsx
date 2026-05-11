"use client";

import { usePathname } from "next/navigation";
import { PageTabs } from "@/components/ui";

export function AuditWorkspaceTabs({ auditId }: { auditId: string }) {
  const pathname = usePathname();
  const base = `/sales-audit/${auditId}`;
  return (
    <PageTabs
      items={[
        { label: "Overview", href: base, active: pathname === base },
        { label: "Internal Brief", href: `${base}/internal-brief`, active: pathname === `${base}/internal-brief` },
        { label: "Client Report", href: `${base}/client-report`, active: pathname === `${base}/client-report` },
        { label: "Call Notes", href: `${base}/sales-call-notes`, active: pathname === `${base}/sales-call-notes` }
      ]}
    />
  );
}
