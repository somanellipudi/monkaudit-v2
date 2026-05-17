import type { Permission, Role } from "./types";

export const roles: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full platform control across users, records, reports, and system health.",
    permissions: [
      "leads:create",
      "leads:view_own",
      "leads:view_team",
      "leads:view_all",
      "leads:edit",
      "leads:assign",
      "audit:create",
      "audit:view",
      "audit:run",
      "audit:retry",
      "report:view",
      "report:review",
      "report:approve",
      "report:export",
      "report:delete",
      "followup:create",
      "followup:complete",
      "users:manage",
      "ai_usage:view",
      "settings:manage",
      "reports:override_export"
    ]
  },
  {
    id: "admin",
    name: "Admin",
    description: "Manages team access, report review, and operational health.",
    permissions: [
      "leads:create",
      "leads:view_own",
      "leads:view_team",
      "leads:view_all",
      "leads:edit",
      "leads:assign",
      "audit:create",
      "audit:view",
      "audit:run",
      "audit:retry",
      "report:view",
      "report:review",
      "report:approve",
      "report:export",
      "report:delete",
      "followup:create",
      "followup:complete",
      "users:manage",
      "ai_usage:view",
      "settings:manage",
      "reports:override_export"
    ]
  },
  {
    id: "sales_manager",
    name: "Sales Manager",
    description: "Assigns leads and manages the team sales loop.",
    permissions: [
      "leads:create",
      "leads:view_own",
      "leads:view_team",
      "leads:edit",
      "leads:assign",
      "audit:create",
      "audit:view",
      "audit:run",
      "audit:retry",
      "report:view",
      "report:review",
      "followup:create",
      "followup:complete",
      "ai_usage:view"
    ]
  },
  {
    id: "sales_rep",
    name: "Sales Rep",
    description: "Creates audits and manages assigned leads.",
    permissions: [
      "leads:create",
      "leads:view_own",
      "leads:edit",
      "audit:create",
      "audit:view",
      "audit:run",
      "followup:create",
      "followup:complete",
      "report:view",
      "ai_usage:view"
    ]
  },
  {
    id: "strategist",
    name: "Strategist",
    description: "Reviews strategy, scoring, client language, and report quality.",
    permissions: ["leads:view_team", "audit:view", "report:view", "report:review", "report:approve", "report:export"]
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to visible internal records.",
    permissions: ["leads:view_own", "audit:view", "report:view"]
  }
];

export function hasPermission(roleIds: string[], permission: Permission) {
  return roles
    .filter((role) => roleIds.includes(role.id))
    .some((role) => role.permissions.includes(permission));
}

export function canSeeRecord(
  roleIds: string[],
  user: { email: string; teamId: string },
  record: {
    createdBy: string;
    assignedTo: string;
    assignedStrategist?: string;
    assignedOwnerId?: string;
    assignedReviewerId?: string;
    teamId: string;
    visibility: string;
    status?: string;
    auditStatus?: string;
    reportStatus?: string;
  }
) {
  if (hasPermission(roleIds, "leads:view_all")) return true;
  if (roleIds.includes("sales_manager") && record.teamId === user.teamId) return true;
  if (
    roleIds.includes("strategist") &&
    (record.assignedStrategist === user.email ||
      record.assignedReviewerId === user.email ||
      record.auditStatus === "Needs Review" ||
      record.reportStatus === "Needs Review" ||
      record.status === "Needs Review")
  ) {
    return true;
  }
  if (record.visibility === "all") return true;
  if (record.visibility === "team" && record.teamId === user.teamId) return true;
  return record.createdBy === user.email || record.assignedTo === user.email || record.assignedOwnerId === user.email;
}
