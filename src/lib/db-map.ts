import type { FirestoreCollection } from "./types";

export type CollectionMapItem = {
  collection: FirestoreCollection;
  purpose: string;
  ownerField?: string;
  requiredFields: string[];
  primaryIndexes: string[];
  retention: string;
};

export const firestoreCollections: CollectionMapItem[] = [
  {
    collection: "users",
    purpose: "Allowlisted Gmail users, profile, status, roles, app access, and team membership.",
    requiredFields: ["email", "name", "status", "roleIds", "allowedApps", "teamId", "createdAt", "lastLoginAt"],
    primaryIndexes: ["email", "status + teamId", "roleIds"],
    retention: "Keep active and disabled users for audit trail."
  },
  {
    collection: "roles",
    purpose: "Shared RBAC roles that map to permission strings across the sales workspace.",
    requiredFields: ["id", "name", "description", "permissions"],
    primaryIndexes: ["id"],
    retention: "Version role changes through activity_logs."
  },
  {
    collection: "teams",
    purpose: "Sales India, Sales USA, strategist groups, and future client success teams.",
    requiredFields: ["name", "market", "managerIds", "memberIds", "createdAt"],
    primaryIndexes: ["market", "managerIds", "memberIds"],
    retention: "Permanent operational structure."
  },
  {
    collection: "leads",
    purpose: "Prospect record created from Google Maps, social links, website, and salesperson context.",
    ownerField: "assignedTo",
    requiredFields: [
      "businessName",
      "city",
      "country",
      "category",
      "leadSource",
      "leadStatus",
      "salesStage",
      "assignedOwnerId",
      "assignedReviewerId",
      "teamId",
      "visibility",
      "createdBy",
      "createdAt",
      "updatedAt"
    ],
    primaryIndexes: [
      "assignedOwnerId + salesStage",
      "teamId + salesStage",
      "createdBy + createdAt",
      "city + category",
      "nextFollowUpAt + assignedTo"
    ],
    retention: "Archive lost/old prospects, do not delete by default."
  },
  {
    collection: "audit_runs",
    purpose: "Every research job, source payload, final data used, scores, status, cost, and report pointers.",
    ownerField: "assignedTo",
    requiredFields: [
      "leadId",
      "createdBy",
      "assignedTo",
      "assignedStrategist",
      "teamId",
      "visibility",
      "auditMode",
      "auditStatus",
      "discoveredData",
      "manualOverrides",
      "finalDataUsed",
      "createdAt",
      "updatedAt"
    ],
    primaryIndexes: ["leadId", "assignedTo + auditStatus", "assignedStrategist + auditStatus", "teamId + auditStatus", "auditMode + createdAt"],
    retention: "Keep raw research JSON and final data for future sales history."
  },
  {
    collection: "client_accounts",
    purpose: "Converted clients linked back to source lead/audit, with portal, ownership, plan, and lifecycle status.",
    ownerField: "clientSuccessId",
    requiredFields: ["businessName", "sourceLeadId", "ownerId", "strategistId", "teamId", "status", "portalEnabled", "createdAt", "updatedAt"],
    primaryIndexes: ["status + teamId", "ownerId + status", "clientSuccessId + status", "sourceLeadId"],
    retention: "Permanent client account history."
  },
  {
    collection: "client_users",
    purpose: "External client portal users with limited access to reports, invoices, requests, and onboarding tasks.",
    requiredFields: ["clientAccountId", "email", "name", "role", "status", "createdAt"],
    primaryIndexes: ["clientAccountId + status", "email", "status + createdAt"],
    retention: "Keep disabled users for account access audit."
  },
  {
    collection: "onboarding_projects",
    purpose: "Post-conversion access collection, kickoff, tracking setup, brand assets, offers, and launch readiness.",
    requiredFields: ["clientAccountId", "status", "accessChecklist", "createdAt", "updatedAt"],
    primaryIndexes: ["clientAccountId", "status + updatedAt"],
    retention: "Keep onboarding history for delivery context."
  },
  {
    collection: "subscriptions",
    purpose: "Retainer, sprint, or project plan terms, billing cadence, start/end dates, and renewal state.",
    requiredFields: ["clientAccountId", "planName", "status", "currency", "amount", "billingCadence", "createdAt"],
    primaryIndexes: ["clientAccountId + status", "status + renewalAt"],
    retention: "Permanent commercial history."
  },
  {
    collection: "invoices",
    purpose: "Invoice metadata for Razorpay, Stripe, or manual payments with due dates and payment status.",
    requiredFields: ["clientAccountId", "amount", "currency", "status", "dueAt", "createdAt"],
    primaryIndexes: ["clientAccountId + status", "status + dueAt", "paymentProvider + status"],
    retention: "Keep financial records according to accounting policy."
  },
  {
    collection: "payments",
    purpose: "Payment provider transaction records, receipts, failed payments, and reconciliation state.",
    requiredFields: ["clientAccountId", "invoiceId", "amount", "currency", "status", "provider", "createdAt"],
    primaryIndexes: ["invoiceId", "clientAccountId + createdAt", "status + createdAt"],
    retention: "Keep financial records according to accounting policy."
  },
  {
    collection: "growth_sprints",
    purpose: "Delivery work after conversion: SEO, GBP, ads, content, landing pages, WhatsApp, tracking, and reporting tasks.",
    ownerField: "strategistId",
    requiredFields: ["clientAccountId", "name", "status", "strategistId", "clientSuccessId", "startAt", "endAt", "createdAt"],
    primaryIndexes: ["clientAccountId + status", "strategistId + status", "clientSuccessId + status"],
    retention: "Keep delivery history for reporting and renewals."
  },
  {
    collection: "client_reports",
    purpose: "Monthly reports, strategy updates, wins, blockers, next-month plan, and client portal visibility.",
    requiredFields: ["clientAccountId", "period", "status", "visibility", "createdBy", "createdAt", "updatedAt"],
    primaryIndexes: ["clientAccountId + period", "status + updatedAt", "visibility + updatedAt"],
    retention: "Permanent client reporting archive."
  },
  {
    collection: "support_threads",
    purpose: "Client requests, access issues, approvals, content feedback, and delivery communication in the portal.",
    requiredFields: ["clientAccountId", "createdBy", "assignedTo", "status", "priority", "createdAt", "updatedAt"],
    primaryIndexes: ["clientAccountId + status", "assignedTo + status", "priority + updatedAt"],
    retention: "Keep support context while client account is active."
  },
  {
    collection: "follow_ups",
    purpose: "Next-action discipline for calls, WhatsApp, email, meetings, overdue prospects, and post-report follow-up.",
    ownerField: "assignedTo",
    requiredFields: ["leadId", "assignedTo", "teamId", "visibility", "dueAt", "channel", "status", "nextAction", "createdBy", "createdAt"],
    primaryIndexes: ["assignedTo + dueAt", "teamId + dueAt", "leadId", "status + dueAt"],
    retention: "Keep completed follow-ups as sales history."
  },
  {
    collection: "reports",
    purpose: "Client Growth Due Diligence PDFs, internal briefs, review gates, exports, and sharing status.",
    requiredFields: ["auditRunId", "leadId", "type", "reportStatus", "createdBy", "createdAt", "updatedAt"],
    primaryIndexes: ["auditRunId", "leadId", "reportStatus + updatedAt", "type + reportStatus"],
    retention: "Keep report metadata permanently; files live in Cloud Storage."
  },
  {
    collection: "files",
    purpose: "Cloud Storage metadata for PDFs, raw research JSON, screenshots, exports, and internal briefs.",
    requiredFields: ["leadId", "auditRunId", "category", "storagePath", "createdBy", "createdAt"],
    primaryIndexes: ["leadId", "auditRunId", "category + createdAt"],
    retention: "Cloud Storage is source of truth."
  },
  {
    collection: "ai_usage",
    purpose: "Gemini token usage, external API calls, estimated cost, failed jobs, and cost by user/mode.",
    ownerField: "userId",
    requiredFields: ["userId", "model", "inputTokens", "outputTokens", "externalApiCalls", "estimatedUsd", "status", "createdAt"],
    primaryIndexes: ["userId + createdAt", "auditRunId", "status + createdAt"],
    retention: "Keep cost history for operational control."
  },
  {
    collection: "activity_logs",
    purpose: "Audit trail for access changes, role edits, report export, approval, and lead ownership changes.",
    requiredFields: ["actorId", "action", "entityType", "entityId", "createdAt"],
    primaryIndexes: ["actorId + createdAt", "entityType + entityId", "action + createdAt"],
    retention: "Append-only audit trail."
  }
];

export const auditPipelineStages = [
  "Normalize source links",
  "Resolve GBP identity",
  "Discover website and contact flow",
  "Read public social signals",
  "Compare nearby competitors",
  "Generate scores",
  "Generate internal brief",
  "Generate client-safe report",
  "Run language cleanup",
  "Create review-ready files"
];

export const platformLifecycleStages = [
  {
    stage: "Prospect",
    owner: "Sales",
    system: "Lead, audit, internal brief, client-safe report, follow-up, and sales outcome progress."
  },
  {
    stage: "Won",
    owner: "Sales Manager",
    system: "Track sales outcome only. Client account, onboarding, billing, and portal handoff stay outside the sales workspace."
  },
  {
    stage: "Onboarding",
    owner: "Client Success",
    system: "Collect access, brand assets, tracking setup, kickoff notes, first sprint scope."
  },
  {
    stage: "Active Client",
    owner: "Strategist",
    system: "Growth sprints, tasks, approvals, files, monthly reports, AI-supported workflows."
  },
  {
    stage: "Billing",
    owner: "Admin / Finance",
    system: "Subscriptions, invoices, Razorpay/Stripe/manual payments, receipts, overdue controls."
  },
  {
    stage: "Portal",
    owner: "Client Success",
    system: "Client-facing reports, invoices, requests, approvals, files, and meeting notes."
  },
  {
    stage: "Renewal / Churn",
    owner: "Founder / Manager",
    system: "Health score, outcomes, renewal offers, pause/churn reason, historical archive."
  }
];

export const performancePrinciples = [
  "Read list pages from indexed summary fields, not large raw research payloads.",
  "Keep raw research JSON in Cloud Storage or a nested document only opened on demand.",
  "Paginate leads, audits, files, and activity logs.",
  "Use server-side filtering for owner, team, status, follow-up date, and review queue.",
  "Load report editor sections lazily so PDF markdown does not block dashboards.",
  "Cache static RBAC metadata."
];
