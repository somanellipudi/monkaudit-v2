import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ActivityLog, AiUsage, AuditRun, ClientAccount, FollowUp, FraudRiskSignal, GuardrailCheck, Lead, Report, SalesFile } from "@/lib/types";
import { env } from "./env";
import { readFirestoreState, writeFirestoreState } from "./firestore-adapter";

const reportTypes = new Set<Report["type"]>(["client_growth_due_diligence", "internal_sales_brief", "sales_call_notes"]);

function normalizeLead(lead: Lead): Lead {
  const stageMap: Record<string, Lead["salesStage"]> = {
    "Audit Running": "Audit Requested",
    "Call Scheduled": "Follow-up Due",
    Negotiation: "Proposal Sent",
    "Report Shared": "Follow-up Due",
    Converted: "Won",
    Unqualified: "Lost"
  };
  const legacyStage = (stageMap[String(lead.status || lead.salesStage)] || lead.salesStage || "Research Pending") as Lead["salesStage"];
  const rawNextAction = lead.nextAction || "Confirm next sales action";
  const salesStage = legacyStage === "Audit Completed" && /report|client-safe/i.test(rawNextAction) ? "Report Ready" : legacyStage;
  const nextAction = salesStage === "Report Ready" && /^prepare client-safe report$/i.test(rawNextAction)
    ? "Review client-safe report"
    : rawNextAction;
  const leadStatus = lead.leadStatus === "New" || lead.leadStatus === "Assigned" || lead.leadStatus === "Archived" ? lead.leadStatus : "Active";
  return {
    ...lead,
    leadStatus,
    salesStage,
    nextAction,
    priority: lead.priority || "Medium",
    notes: lead.notes || "",
    assignedOwnerId: lead.assignedOwnerId || lead.assignedTo,
    assignedReviewerId: lead.assignedReviewerId || lead.assignedStrategist,
    status: salesStage
  };
}

function normalizeAudit(audit: AuditRun): AuditRun {
  const map: Record<string, AuditRun["auditStatus"]> = {
    draft: "Draft",
    queued: "Queued",
    research_running: "Research Running",
    research_completed: "Research Completed",
    needs_review: "Needs Review",
    approved: "Approved",
    failed: "Failed",
    Draft: "Draft",
    Queued: "Queued",
    "Research Running": "Research Running",
    "Research Completed": "Research Completed",
    "Needs Review": "Needs Review",
    Approved: "Approved",
    Failed: "Failed"
  };
  return {
    ...audit,
    auditStatus: audit.auditStatus || map[String(audit.status)] || "draft"
  };
}

function normalizeReport(report: Report): Report {
  const map: Record<string, Report["reportStatus"]> = {
    draft_not_generated: "Draft Not Generated",
    draft_generated: "Draft Generated",
    needs_review: "Needs Review",
    revision_needed: "Revision Needed",
    approved: "Approved",
    exported: "Exported",
    shared_with_prospect: "Shared With Prospect",
    Draft: "Draft Generated",
    "Needs Review": "Needs Review",
    Approved: "Approved",
    Exported: "Exported",
    Shared: "Shared With Prospect"
  };
  return {
    ...report,
    reportStatus: map[String(report.reportStatus)] || map[String(report.status)] || "Draft Not Generated"
  };
}

export type DbState = {
  meta: {
    version: number;
    provider: "local" | "firestore";
    createdAt: string;
    updatedAt: string;
  };
  users: WorkspaceUser[];
  leads: Lead[];
  audit_runs: AuditRun[];
  follow_ups: FollowUp[];
  reports: Report[];
  client_accounts: ClientAccount[];
  ai_usage: AiUsage[];
  files: SalesFile[];
  activity_logs: ActivityLog[];
  guardrail_checks: GuardrailCheck[];
  fraud_risk_signals: FraudRiskSignal[];
};

export type WorkspaceUser = {
  email: string;
  name: string;
  status: "active" | "disabled";
  roleIds: string[];
  allowedApps: string[];
  teamId: string;
  createdAt?: string;
  lastLoginAt?: string;
};

function seedFollowUps(sourceLeads: Lead[], now = new Date().toISOString()): FollowUp[] {
  return followUpCandidateLeads(sourceLeads).map((lead, index) => ({
    id: `follow_up_${index + 1}`,
    leadId: lead.id,
    assignedTo: lead.assignedTo,
    teamId: lead.teamId,
    visibility: lead.visibility,
    dueAt: lead.nextFollowUpAt || now.slice(0, 10),
    channel: index % 2 === 0 ? "Call" : "WhatsApp",
    status: "Pending",
    nextAction: "Call or WhatsApp follow-up",
    createdBy: lead.createdBy,
    createdAt: now,
    updatedAt: now
  }));
}

function followUpCandidateLeads(sourceLeads: Lead[]) {
  return sourceLeads.filter((lead) => {
    if (!lead.nextFollowUpAt) return false;
    if (lead.leadStatus === "Archived") return false;
    return lead.salesStage !== "Won" && lead.salesStage !== "Lost";
  });
}

function missingFollowUpsFromLeads(sourceLeads: Lead[], existingFollowUps: FollowUp[], now = new Date().toISOString()): FollowUp[] {
  const pendingLeadIds = new Set(existingFollowUps.filter((followUp) => followUp.status === "Pending").map((followUp) => followUp.leadId));
  return followUpCandidateLeads(sourceLeads)
    .filter((lead) => !pendingLeadIds.has(lead.id))
    .map((lead, index) => ({
      id: `follow_up_${Date.now().toString(36)}_${index}`,
      leadId: lead.id,
      assignedTo: lead.assignedTo,
      teamId: lead.teamId,
      visibility: lead.visibility,
      dueAt: lead.nextFollowUpAt,
      channel: "Call",
      status: "Pending",
      nextAction: lead.nextAction || "Follow up with prospect",
      createdBy: lead.updatedBy || lead.createdBy,
      createdAt: now,
      updatedAt: now
    }));
}

const initialState = (provider: DbState["meta"]["provider"] = "local"): DbState => {
  const now = new Date().toISOString();
  return {
    meta: { version: 1, provider, createdAt: now, updatedAt: now },
    users: seedUsers(now),
    leads: [],
    audit_runs: [],
    follow_ups: [],
    reports: [],
    client_accounts: [],
    ai_usage: [],
    files: [],
    activity_logs: [],
    guardrail_checks: [],
    fraud_risk_signals: []
  };
};

function seedUsers(now: string): WorkspaceUser[] {
  return env.allowlistEmails.map((email, index) => ({
    email,
    name: nameFromEmail(email),
    status: "active",
    roleIds: index === 0 ? ["owner", "sales_manager"] : ["sales_rep"],
    allowedApps: ["sales-audit"],
    teamId: "sales_india",
    createdAt: now,
    lastLoginAt: now
  }));
}

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "Team Member";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function resolveDbPath() {
  return path.resolve(process.cwd(), env.localDbPath);
}

async function ensureLocalDb() {
  const dbPath = resolveDbPath();
  await mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(initialState(), null, 2), "utf8");
  }
  return dbPath;
}

export async function readDb(): Promise<DbState> {
  if (env.dbProvider === "firestore") {
    const persisted = await readFirestoreState<DbState>();
    if (persisted) return normalizeDbState(persisted);
    const seeded = initialState("firestore");
    await writeFirestoreState(seeded);
    return seeded;
  }
  if (env.dbProvider !== "local") {
    return initialState();
  }
  const dbPath = await ensureLocalDb();
  const raw = await readFile(dbPath, "utf8");
  let parsed: DbState;
  try {
    parsed = raw.trim() ? (JSON.parse(raw) as DbState) : initialState();
  } catch {
    parsed = initialState();
    await writeFile(dbPath, JSON.stringify(parsed, null, 2), "utf8");
  }
  return normalizeDbState(parsed);
}

async function normalizeDbState(parsed: DbState): Promise<DbState> {
  if (!parsed.meta) {
    parsed.meta = { version: 1, provider: env.dbProvider === "firestore" ? "firestore" : "local", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  parsed.meta.provider = env.dbProvider === "firestore" ? "firestore" : "local";
  if (!Array.isArray(parsed.follow_ups)) {
    parsed.follow_ups = seedFollowUps(parsed.leads);
    await writeDb(parsed);
  }
  if (!Array.isArray(parsed.users)) {
    parsed.users = [];
    await writeDb(parsed);
  }
  const configuredUsers = seedUsers(parsed.meta.createdAt || new Date().toISOString());
  const existingEmails = new Set(parsed.users.map((user) => user.email.toLowerCase()));
  const missingUsers = configuredUsers.filter((user) => !existingEmails.has(user.email.toLowerCase()));
  if (missingUsers.length) {
    parsed.users = [...parsed.users, ...missingUsers];
    await writeDb(parsed);
  }
  if (!Array.isArray(parsed.reports)) {
    parsed.reports = [];
    await writeDb(parsed);
  }
  const validReports = parsed.reports.filter((report) => reportTypes.has(report.type));
  if (validReports.length !== parsed.reports.length) {
    parsed.reports = validReports;
    await writeDb(parsed);
  }
  parsed.leads = parsed.leads.map(normalizeLead);
  parsed.audit_runs = parsed.audit_runs.map(normalizeAudit);
  parsed.reports = parsed.reports.map(normalizeReport);
  const missingFollowUps = missingFollowUpsFromLeads(parsed.leads, parsed.follow_ups);
  if (missingFollowUps.length) {
    parsed.follow_ups = [...missingFollowUps, ...parsed.follow_ups];
    await writeDb(parsed);
  }
  if (!Array.isArray(parsed.client_accounts)) {
    parsed.client_accounts = [];
    await writeDb(parsed);
  }
  if (!Array.isArray(parsed.ai_usage)) {
    parsed.ai_usage = [];
    await writeDb(parsed);
  }
  if (!Array.isArray(parsed.guardrail_checks)) {
    parsed.guardrail_checks = [];
    await writeDb(parsed);
  }
  if (!Array.isArray(parsed.fraud_risk_signals)) {
    parsed.fraud_risk_signals = [];
    await writeDb(parsed);
  }
  parsed.files = parsed.files.map((file, index) => ({
    id: file.id || `file_legacy_${index + 1}`,
    name: file.name,
    category: file.category,
    owner: file.owner,
    updated: file.updated,
    storagePath: file.storagePath || "",
    access: file.access || (file.category === "Client PDFs" ? "Client-safe after review" : "Internal only"),
    portalHandoff: file.portalHandoff || (file.category === "Client PDFs" ? "Reference allowed" : "Blocked"),
    createdAt: file.createdAt || parsed.meta.createdAt
  }));
  return parsed;
}

export async function writeDb(nextState: DbState) {
  if (env.dbProvider === "firestore") {
    const state = {
      ...nextState,
      meta: {
        ...nextState.meta,
        provider: "firestore" as const,
        updatedAt: new Date().toISOString()
      }
    };
    await writeFirestoreState(state);
    return;
  }
  if (env.dbProvider !== "local") {
    return;
  }
  const dbPath = await ensureLocalDb();
  const state = {
    ...nextState,
    meta: {
      ...nextState.meta,
      updatedAt: new Date().toISOString()
    }
  };
  await writeFile(dbPath, JSON.stringify(state, null, 2), "utf8");
}

export async function resetDb() {
  const state = initialState();
  await writeDb(state);
  return state;
}
