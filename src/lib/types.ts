export const leadStatuses = ["New", "Assigned", "Active", "Archived"] as const;
export const salesStages = [
  "Research Pending",
  "Audit Requested",
  "Audit Completed",
  "Report Ready",
  "Follow-up Due",
  "Proposal Sent",
  "Won",
  "Lost"
] as const;
export const auditStatuses = ["Draft", "Queued", "Research Running", "Research Completed", "Needs Review", "Approved", "Failed"] as const;
export const reportStatuses = [
  "Draft Not Generated",
  "Draft Generated",
  "Needs Review",
  "Revision Needed",
  "Approved",
  "Exported",
  "Shared With Prospect"
] as const;
export const followUpStatuses = ["Pending", "Completed", "Overdue", "Cancelled"] as const;

export type AuditStatus = (typeof auditStatuses)[number];

export type AuditMode = "quick" | "deep" | "pre_proposal";

export const auditModeLabels: Record<AuditMode, string> = {
  quick: "Quick Audit",
  deep: "Deep Audit",
  pre_proposal: "Pre-Proposal Audit"
};

export function auditModeLabel(mode?: AuditMode | string) {
  return mode && mode in auditModeLabels ? auditModeLabels[mode as AuditMode] : mode || "Unknown";
}

export type LeadStatus = (typeof leadStatuses)[number];

export type SalesStage = (typeof salesStages)[number];

export type ReportStatus = (typeof reportStatuses)[number];

export type FollowUpStatus = (typeof followUpStatuses)[number];

export type Visibility = "private" | "team" | "all";

export type TimestampString = string;

export type FirestoreCollection =
  | "users"
  | "roles"
  | "permissions"
  | "teams"
  | "leads"
  | "audit_runs"
  | "client_accounts"
  | "client_users"
  | "onboarding_projects"
  | "subscriptions"
  | "invoices"
  | "payments"
  | "growth_sprints"
  | "client_reports"
  | "support_threads"
  | "follow_ups"
  | "reports"
  | "files"
  | "ai_usage"
  | "activity_logs"
  | "guardrail_checks"
  | "fraud_risk_signals"
  | "app_settings";

export type Permission =
  | "leads:create"
  | "leads:view_own"
  | "leads:view_team"
  | "leads:view_all"
  | "leads:edit"
  | "leads:assign"
  | "audit:create"
  | "audit:view"
  | "audit:run"
  | "audit:retry"
  | "report:view"
  | "report:review"
  | "report:approve"
  | "report:export"
  | "report:delete"
  | "followup:create"
  | "followup:complete"
  | "users:manage"
  | "ai_usage:view"
  | "settings:manage"
  | "reports:override_export";

export type ClientAccountStatus = "Prospect Converted" | "Onboarding" | "Active" | "Paused" | "At Risk" | "Churned";

export type ClientAccount = {
  id: string;
  businessName: string;
  sourceLeadId: string;
  sourceAuditRunId?: string;
  ownerId: string;
  strategistId: string;
  clientSuccessId?: string;
  teamId: string;
  status: ClientAccountStatus;
  planId?: string;
  billingCustomerId?: string;
  portalEnabled: boolean;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type ClientUser = {
  id: string;
  clientAccountId: string;
  email: string;
  name: string;
  role: "Owner" | "Marketing" | "Finance" | "Viewer";
  status: "Invited" | "Active" | "Disabled";
  lastLoginAt?: TimestampString;
  createdAt: TimestampString;
};

export type OnboardingProject = {
  id: string;
  clientAccountId: string;
  status: "Not Started" | "In Progress" | "Blocked" | "Completed";
  accessChecklist: string[];
  kickoffDate?: TimestampString;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type Invoice = {
  id: string;
  clientAccountId: string;
  amount: number;
  currency: "INR" | "USD";
  status: "Draft" | "Issued" | "Paid" | "Overdue" | "Void";
  dueAt: TimestampString;
  paymentProvider?: "Razorpay" | "Stripe" | "Manual";
  createdAt: TimestampString;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
};

export type AuditRun = {
  id: string;
  leadId: string;
  businessName: string;
  city: string;
  country: string;
  area: string;
  category: string;
  createdBy: string;
  assignedTo: string;
  assignedStrategist: string;
  teamId: string;
  visibility: Visibility;
  auditMode: AuditMode;
  score: number;
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  hasWhatsApp: boolean;
  hasInstagram: boolean;
  hasGoogleBusinessProfile: boolean;
  sourceLinks?: {
    googleMapsUrl?: string;
    website?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    otherPublicLink?: string;
  };
  discoveredData?: Record<string, unknown>;
  manualOverrides?: Record<string, unknown>;
  finalDataUsed?: Record<string, unknown>;
  costEstimate?: {
    aiTokensInput: number;
    aiTokensOutput: number;
    externalApiCalls: number;
    estimatedUsd: number;
  };
  leadSource: string;
  auditStatus: AuditStatus;
  status: string;
  rawResearchFileId?: string;
  errorSummary?: string;
  nextFollowUpAt: string;
  lastUpdated: string;
};

export type Lead = {
  id: string;
  businessName: string;
  city: string;
  country: string;
  area: string;
  category: string;
  website: string;
  googleMapsUrl: string;
  instagramUrl: string;
  facebookUrl?: string;
  otherPublicLink?: string;
  phone: string;
  email?: string;
  contactName?: string;
  contactRole?: string;
  salesContext?: string;
  leadSource: string;
  leadStatus: LeadStatus;
  salesStage: SalesStage;
  nextAction: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  growthReadinessScore?: number;
  notes?: string;
  lostReason?: string;
  wonNotes?: string;
  status: LeadStatus | SalesStage | string;
  assignedTo: string;
  assignedStrategist: string;
  assignedOwnerId?: string;
  assignedReviewerId?: string;
  teamId: string;
  visibility: Visibility;
  nextFollowUpAt: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: TimestampString;
  updatedAt: TimestampString;
  archivedAt?: TimestampString;
};

export type Team = {
  id: string;
  name: string;
  market: "India" | "USA" | "Global";
  managerIds: string[];
  memberIds: string[];
  createdAt: TimestampString;
};

export type FollowUp = {
  id: string;
  leadId: string;
  auditRunId?: string;
  assignedTo: string;
  teamId: string;
  visibility: Visibility;
  dueAt: TimestampString;
  channel: "Call" | "WhatsApp" | "Email" | "Meeting" | "Proposal" | "Other";
  type?: "call" | "whatsapp" | "email" | "meeting" | "proposal" | "other";
  status: FollowUpStatus;
  nextAction: string;
  completedAt?: TimestampString;
  notes?: string;
  createdBy: string;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type Report = {
  id: string;
  auditRunId: string;
  leadId: string;
  type: "client_growth_due_diligence" | "internal_sales_brief" | "sales_call_notes";
  reportStatus: ReportStatus;
  status: "Draft" | "Needs Review" | "Approved" | "Exported" | "Shared";
  clientReportMarkdown?: string;
  internalBriefMarkdown?: string;
  salesCallNotesMarkdown?: string;
  markdownStoragePath?: string;
  pdfStoragePath?: string;
  pdfFileId?: string;
  driveFileUrl?: string;
  markdown?: string;
  approvedBy?: string;
  approvedAt?: TimestampString;
  exportedBy?: string;
  exportedAt?: TimestampString;
  sharedBy?: string;
  sharedAt?: TimestampString;
  guardrailCheckStatus?: "pending" | "passed" | "failed" | "override_used";
  reviewedBy?: string;
  reviewedAt?: TimestampString;
  createdBy: string;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type SalesFile = {
  id: string;
  name: string;
  category: "Client PDFs" | "Internal briefs" | "Raw research JSON" | "Screenshots" | "Exports";
  owner: string;
  updated: string;
  leadId?: string;
  auditRunId?: string;
  reportId?: string;
  storagePath?: string;
  access: "Client-safe after review" | "Internal only" | "System archive" | "Copy only";
  portalHandoff: "Reference allowed" | "Blocked" | "Copy only";
  createdAt: TimestampString;
};

export type AiUsage = {
  id: string;
  auditRunId?: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  externalApiCalls: number;
  estimatedUsd: number;
  status: "Succeeded" | "Failed";
  createdAt: TimestampString;
};

export type ActivityLog = {
  id: string;
  actorId?: string;
  actorUserId?: string;
  action: string;
  entityType: FirestoreCollection | string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: TimestampString;
};

export type Score = {
  label: string;
  value: number;
  tone: "strong" | "good" | "gap" | "foundational";
  detail?: string;
};

export type GuardrailCheck = {
  id: string;
  reportId: string;
  auditRunId: string;
  leadId: string;
  status: "pending" | "passed" | "failed" | "override_used";
  checks: Array<{ rule: string; passed: boolean; detail: string }>;
  createdBy: string;
  createdAt: TimestampString;
  reviewedBy?: string;
  reviewedAt?: TimestampString;
};

export type FraudRiskSignal = {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  signalType:
    | "audit_rate_spike"
    | "failed_audit_spike"
    | "unapproved_export_attempt"
    | "unauthorized_access_attempt"
    | "manual_override_before_export"
    | "unapproved_share_attempt"
    | "high_ai_usage"
    | "duplicate_lead"
    | "repeated_owner_change"
    | "disabled_user_access";
  severity: "low" | "medium" | "high";
  description: string;
  metadata?: Record<string, unknown>;
  resolvedBy?: string;
  resolvedAt?: TimestampString;
  createdAt: TimestampString;
};
