import { hasPermission } from "@/lib/rbac";
import type { Permission } from "@/lib/types";

export function PermissionGate({
  permission,
  children,
  roleIds = []
}: {
  permission: Permission;
  children: React.ReactNode;
  roleIds?: string[];
}) {
  if (!hasPermission(roleIds, permission)) return null;
  return <>{children}</>;
}
