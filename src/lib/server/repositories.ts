import "server-only";

import type { AiUsage, AuditMode, AuditRun, AuditStatus, ClientAccount, FollowUp, Lead, LeadStatus, Report, ReportStatus, SalesFile, SalesStage, Visibility } from "@/lib/types";
import { env } from "./env";
import { readDb, resetDb, writeDb } from "./db";

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEmail(email?: string) {
  return (email || currentActorEmail()).trim().toLowerCase();
}

function currentActorEmail() {
  return env.allowlistEmails[0] || "system@growingmonk.com";
}

function defaultReviewerEmail() {
  return env.allowlistEmails[1] || currentActorEmail();
}

function deriveBusinessName(input: { businessName?: string; googleMapsUrl?: string; website?: string; instagramUrl?: string; otherPublicLink?: string }) {
  if (input.businessName?.trim()) return input.businessName.trim();
  const googleName = nameFromGoogleMaps(input.googleMapsUrl);
  if (googleName) return googleName;
  const websiteName = nameFromUrl(input.website || input.instagramUrl || input.otherPublicLink);
  return websiteName || "Prospect from public source";
}

function nameFromGoogleMaps(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const queryName = url.searchParams.get("q") || url.searchParams.get("query");
    if (queryName) return prettifyName(queryName);
    const placeIndex = url.pathname.toLowerCase().indexOf("/place/");
    if (placeIndex >= 0) return prettifyName(decodeURIComponent(url.pathname.slice(placeIndex + 7).split("/")[0] || ""));
  } catch {
    return "";
  }
  return "";
}

function nameFromUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname.includes("instagram.com")) {
      const handle = url.pathname.split("/").filter(Boolean)[0];
      if (handle) return prettifyName(handle);
    }
    const base = hostname.split(".")[0] || "";
    return prettifyName(base);
  } catch {
    return "";
  }
}

function prettifyName(value: string) {
  return value
    .replace(/[+_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function legacyAuditStatus(status?: string): AuditStatus {
  const map: Record<string, AuditStatus> = {
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
  return status && map[status] ? map[status] : "Draft";
}

function legacyReportStatus(status?: string): ReportStatus {
  const map: Record<string, ReportStatus> = {
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
  return status && map[status] ? map[status] : "Draft Not Generated";
}

function displayReportStatus(reportStatus: ReportStatus): NonNullable<Report["status"]> {
  const map: Record<ReportStatus, NonNullable<Report["status"]>> = {
    "Draft Not Generated": "Draft",
    "Draft Generated": "Draft",
    "Needs Review": "Needs Review",
    "Revision Needed": "Needs Review",
    Approved: "Approved",
    Exported: "Exported",
    "Shared With Prospect": "Shared"
  };
  return map[reportStatus];
}

export async function getSession(email?: string) {
  const requestedEmail = normalizeEmail(email);
  const db = await readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === requestedEmail);
  const active = Boolean(user && user.status === "active" && env.allowlistEmails.includes(requestedEmail));
  return {
    authenticated: active,
    accessDeniedReason: active ? null : "Email is not active or allowlisted.",
    user: active ? user : null
  };
}

export async function listLeads() {
  const db = await readDb();
  return db.leads;
}

export async function getLead(leadId: string) {
  const db = await readDb();
  return db.leads.find((lead) => lead.id === leadId) ?? null;
}

export async function updateLead(
  leadId: string,
  input: Partial<Pick<Lead, "businessName" | "city" | "country" | "area" | "category" | "website" | "googleMapsUrl" | "instagramUrl" | "facebookUrl" | "otherPublicLink" | "phone" | "email" | "leadStatus" | "salesStage" | "status" | "nextAction" | "nextFollowUpAt" | "salesContext" | "lostReason" | "wonNotes" | "assignedTo" | "assignedStrategist" | "visibility" | "updatedBy">>
) {
  const db = await readDb();
  const index = db.leads.findIndex((lead) => lead.id === leadId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const current = db.leads[index];
  const nextLeadStatus = (input.leadStatus as LeadStatus) || current.leadStatus || "Active";
  const nextSalesStage = (input.salesStage as SalesStage) || (input.status as SalesStage) || current.salesStage || "Research Pending";
  const next: Lead = {
    ...current,
    ...input,
    leadStatus: nextLeadStatus,
    salesStage: nextSalesStage,
    status: nextSalesStage,
    visibility: (input.visibility as Visibility) || current.visibility,
    updatedBy: input.updatedBy || current.updatedBy,
    updatedAt: now
  };

  db.leads[index] = next;
  syncPendingFollowUp(db, next, input.updatedBy || currentActorEmail());
  db.activity_logs.unshift({
    id: id("log"),
    actorId: input.updatedBy || currentActorEmail(),
    action: current.salesStage !== next.salesStage ? `sales_stage.changed.${next.salesStage.toLowerCase().replaceAll(" ", "_")}` : "lead.updated",
    entityType: "leads",
    entityId: leadId,
    before: { leadStatus: current.leadStatus, salesStage: current.salesStage, assignedTo: current.assignedTo, assignedStrategist: current.assignedStrategist },
    after: { leadStatus: next.leadStatus, salesStage: next.salesStage, assignedTo: next.assignedTo, assignedStrategist: next.assignedStrategist },
    createdAt: now
  });
  await writeDb(db);
  return next;
}

function syncPendingFollowUp(db: Awaited<ReturnType<typeof readDb>>, lead: Lead, actorEmail: string) {
  if (!lead.nextFollowUpAt) return;

  const now = new Date().toISOString();
  const existingIndex = db.follow_ups.findIndex((followUp) => followUp.leadId === lead.id && followUp.status === "Pending");
  const nextAction = lead.nextAction || "Follow up with prospect";

  if (existingIndex >= 0) {
    db.follow_ups[existingIndex] = {
      ...db.follow_ups[existingIndex],
      assignedTo: lead.assignedTo,
      teamId: lead.teamId,
      visibility: lead.visibility,
      dueAt: lead.nextFollowUpAt,
      nextAction,
      updatedAt: now
    };
    return;
  }

  db.follow_ups.unshift({
    id: id("follow_up"),
    leadId: lead.id,
    assignedTo: lead.assignedTo,
    teamId: lead.teamId,
    visibility: lead.visibility,
    dueAt: lead.nextFollowUpAt,
    channel: "Call",
    status: "Pending",
    nextAction,
    createdBy: actorEmail,
    createdAt: now,
    updatedAt: now
  });
}

export async function listAuditsForLead(leadId: string) {
  const db = await readDb();
  return db.audit_runs.filter((audit) => audit.leadId === leadId);
}

export async function listActivityForEntity(entityType: string, entityId: string) {
  const db = await readDb();
  return db.activity_logs
    .filter((log) => log.entityType === entityType && log.entityId === entityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listLeadActivity(leadId: string) {
  const db = await readDb();
  const auditIds = db.audit_runs.filter((audit) => audit.leadId === leadId).map((audit) => audit.id);
  return db.activity_logs
    .filter((log) => (log.entityType === "leads" && log.entityId === leadId) || (log.entityType === "audit_runs" && auditIds.includes(log.entityId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listFollowUps() {
  const db = await readDb();
  return db.follow_ups.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function listUsers() {
  const db = await readDb();
  return db.users;
}

export async function listFiles() {
  const db = await readDb();
  return db.files;
}

export async function listFollowUpsForLead(leadId: string) {
  const db = await readDb();
  return db.follow_ups
    .filter((followUp) => followUp.leadId === leadId)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function createFollowUp(input: Partial<FollowUp> & { leadId: string }) {
  const db = await readDb();
  const lead = db.leads.find((item) => item.id === input.leadId);
  if (!lead) return null;

  const now = new Date().toISOString();
  const followUp: FollowUp = {
    id: id("follow_up"),
    leadId: lead.id,
    auditRunId: input.auditRunId,
    assignedTo: input.assignedTo || lead.assignedTo,
    teamId: input.teamId || lead.teamId,
    visibility: (input.visibility as Visibility) || lead.visibility,
    dueAt: input.dueAt || lead.nextFollowUpAt || now.slice(0, 10),
    channel: input.channel || "Call",
    status: input.status || "Pending",
    nextAction: input.nextAction || "Follow up with prospect",
    createdBy: input.createdBy || currentActorEmail(),
    createdAt: now,
    updatedAt: now
  };

  db.follow_ups.unshift(followUp);
  const leadIndex = db.leads.findIndex((item) => item.id === lead.id);
  if (leadIndex >= 0) {
    db.leads[leadIndex] = {
      ...db.leads[leadIndex],
      leadStatus: "Active",
      salesStage: "Follow-up Due",
      status: "Follow-up Due",
      nextFollowUpAt: followUp.dueAt,
      nextAction: followUp.nextAction,
      updatedAt: now
    };
  }
  db.activity_logs.unshift({
    id: id("log"),
    actorId: followUp.createdBy,
    action: "follow_up.created",
    entityType: "leads",
    entityId: lead.id,
    createdAt: now
  });
  await writeDb(db);
  return followUp;
}

export async function updateFollowUp(followUpId: string, input: Partial<Pick<FollowUp, "status" | "dueAt" | "nextAction" | "channel">>) {
  const db = await readDb();
  const index = db.follow_ups.findIndex((followUp) => followUp.id === followUpId);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const current = db.follow_ups[index];
  const next: FollowUp = {
    ...current,
    ...input,
    updatedAt: now
  };
  db.follow_ups[index] = next;
  db.activity_logs.unshift({
    id: id("log"),
    actorId: currentActorEmail(),
    action: "follow_up.updated",
    entityType: "leads",
    entityId: next.leadId,
    createdAt: now
  });
  await writeDb(db);
  return next;
}

export async function createClientAccountFromLead(leadId: string, auditRunId?: string) {
  const db = await readDb();
  const lead = db.leads.find((item) => item.id === leadId);
  if (!lead) return null;
  const existing = db.client_accounts.find((account) => account.sourceLeadId === leadId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const account: ClientAccount = {
    id: id("client"),
    businessName: lead.businessName,
    sourceLeadId: lead.id,
    sourceAuditRunId: auditRunId,
    ownerId: lead.assignedTo,
    strategistId: lead.assignedStrategist,
    teamId: lead.teamId,
    status: "Prospect Converted",
    portalEnabled: false,
    createdAt: now,
    updatedAt: now
  };
  db.client_accounts.unshift(account);
  const leadIndex = db.leads.findIndex((item) => item.id === leadId);
  if (leadIndex >= 0) {
    db.leads[leadIndex] = { ...db.leads[leadIndex], leadStatus: "Active", salesStage: "Won", status: "Won", updatedAt: now };
  }
  db.activity_logs.unshift({
    id: id("log"),
    actorId: currentActorEmail(),
    action: "client_account.created",
    entityType: "client_accounts",
    entityId: account.id,
    createdAt: now
  });
  await writeDb(db);
  return account;
}

export async function listClientAccounts() {
  const db = await readDb();
  return db.client_accounts;
}

export async function getReport(reportId: string) {
  const db = await readDb();
  return db.reports.find((report) => report.id === reportId) ?? null;
}

export async function listReports() {
  const db = await readDb();
  return db.reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listReportsForAudit(auditRunId: string) {
  const db = await readDb();
  return db.reports.filter((report) => report.auditRunId === auditRunId);
}

export async function saveReport(input: Partial<Report> & { auditRunId: string; leadId: string; type: Report["type"] }) {
  const db = await readDb();
  const now = new Date().toISOString();
  const existingIndex = db.reports.findIndex((report) => report.auditRunId === input.auditRunId && report.type === input.type);
  const reportStatus = input.reportStatus || legacyReportStatus(input.status);
  const report: Report = {
    id: existingIndex >= 0 ? db.reports[existingIndex].id : id("report"),
    auditRunId: input.auditRunId,
    leadId: input.leadId,
    type: input.type,
    reportStatus,
    status: displayReportStatus(reportStatus),
    clientReportMarkdown: input.clientReportMarkdown,
    internalBriefMarkdown: input.internalBriefMarkdown,
    salesCallNotesMarkdown: input.salesCallNotesMarkdown,
    markdown: input.markdown || "",
    markdownStoragePath: input.markdownStoragePath,
    pdfStoragePath: input.pdfStoragePath,
    driveFileUrl: input.driveFileUrl,
    reviewedBy: input.reviewedBy,
    reviewedAt: input.reviewedAt,
    createdBy: input.createdBy || currentActorEmail(),
    createdAt: existingIndex >= 0 ? db.reports[existingIndex].createdAt : now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    db.reports = db.reports.filter((item) => item.auditRunId !== input.auditRunId || item.type !== input.type);
    db.reports.unshift(report);
  } else {
    db.reports.unshift(report);
  }

  db.activity_logs.unshift({
    id: id("log"),
    actorId: report.createdBy,
    action: "report.saved",
    entityType: "reports",
    entityId: report.id,
    createdAt: now
  });
  await writeDb(db);
  return report;
}

export async function reviewReport(auditRunId: string, type: Report["type"], reviewedBy = currentActorEmail()) {
  const db = await readDb();
  const index = db.reports.findIndex((report) => report.auditRunId === auditRunId && report.type === type);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const report: Report = {
    ...db.reports[index],
    reportStatus: "Approved",
    status: "Approved",
    approvedBy: reviewedBy,
    approvedAt: now,
    reviewedBy,
    reviewedAt: now,
    updatedAt: now
  };
  db.reports[index] = report;

  const auditIndex = db.audit_runs.findIndex((audit) => audit.id === auditRunId);
  if (auditIndex >= 0 && type === "client_growth_due_diligence") {
    db.audit_runs[auditIndex] = {
      ...db.audit_runs[auditIndex],
      auditStatus: "Approved",
      status: "Approved",
      lastUpdated: now
    };
    const leadIndex = db.leads.findIndex((lead) => lead.id === db.audit_runs[auditIndex].leadId);
    if (leadIndex >= 0) {
      db.leads[leadIndex] = {
        ...db.leads[leadIndex],
        leadStatus: "Active",
        salesStage: "Report Ready",
        status: "Report Ready",
        nextAction: "Share approved client-safe report",
        updatedAt: now
      };
    }
  }

  db.activity_logs.unshift({
    id: id("log"),
    actorId: reviewedBy,
    action: "report.reviewed",
    entityType: "reports",
    entityId: report.id,
    createdAt: now
  });
  await writeDb(db);
  return report;
}

export async function shareReport(auditRunId: string, type: Report["type"], actorId = currentActorEmail()) {
  const db = await readDb();
  const index = db.reports.findIndex((report) => report.auditRunId === auditRunId && report.type === type);
  if (index === -1) return null;
  const currentStatus = db.reports[index].reportStatus || legacyReportStatus(db.reports[index].status);
  if (currentStatus !== "Approved" && currentStatus !== "Shared With Prospect") return null;
  const now = new Date().toISOString();
  const report: Report = {
    ...db.reports[index],
    reportStatus: "Shared With Prospect",
    status: "Shared",
    sharedBy: actorId,
    sharedAt: now,
    updatedAt: now
  };
  db.reports[index] = report;

  const auditIndex = db.audit_runs.findIndex((audit) => audit.id === auditRunId);
  if (auditIndex >= 0 && type === "client_growth_due_diligence") {
    db.audit_runs[auditIndex] = {
      ...db.audit_runs[auditIndex],
      auditStatus: db.audit_runs[auditIndex].auditStatus || "Approved",
      status: "Shared With Prospect",
      lastUpdated: now
    };
    const leadIndex = db.leads.findIndex((lead) => lead.id === db.audit_runs[auditIndex].leadId);
    if (leadIndex >= 0) {
      db.leads[leadIndex] = {
        ...db.leads[leadIndex],
        leadStatus: "Active",
        salesStage: "Follow-up Due",
        status: "Report Shared",
        updatedAt: now
      };
    }
  }

  db.activity_logs.unshift({
    id: id("log"),
    actorId,
    action: "report.shared",
    entityType: "reports",
    entityId: report.id,
    createdAt: now
  });
  await writeDb(db);
  return report;
}

export async function exportReport(auditRunId: string, type: Report["type"], actorId = currentActorEmail()) {
  const db = await readDb();
  const index = db.reports.findIndex((report) => report.auditRunId === auditRunId && report.type === type);
  if (index === -1) return null;
  const isClientReport = type === "client_growth_due_diligence";
  const reportStatus = db.reports[index].reportStatus || legacyReportStatus(db.reports[index].status);
  const allowedStatus = isClientReport ? ["Approved", "Shared With Prospect", "Exported"] : ["Draft Generated", "Approved", "Exported"];
  if (!allowedStatus.includes(reportStatus)) {
    db.activity_logs.unshift({
      id: id("log"),
      actorId,
      actorUserId: actorId,
      action: "report.export_blocked_unapproved",
      entityType: "reports",
      entityId: db.reports[index].id,
      metadata: { reportStatus, overrideRequired: true },
      createdAt: new Date().toISOString()
    });
    await writeDb(db);
    return null;
  }

  const now = new Date().toISOString();
  const audit = db.audit_runs.find((item) => item.id === auditRunId);
  const baseName = (audit?.businessName || db.reports[index].leadId).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const storagePath = isClientReport
    ? `client-pdfs/${baseName || auditRunId}-${Date.now().toString(36)}.pdf`
    : `internal-briefs/${baseName || auditRunId}-${Date.now().toString(36)}.md`;
  const file: SalesFile = {
    id: id("file"),
    name: isClientReport
      ? `${audit?.businessName || "Prospect"} Client Growth Due Diligence.pdf`
      : `${audit?.businessName || "Prospect"} Internal Sales Brief.md`,
    category: isClientReport ? "Client PDFs" : "Internal briefs",
    owner: actorId,
    updated: "Just now",
    leadId: db.reports[index].leadId,
    auditRunId,
    reportId: db.reports[index].id,
    storagePath,
    access: isClientReport ? "Client-safe after review" : "Internal only",
    portalHandoff: isClientReport ? "Reference allowed" : "Blocked",
    createdAt: now
  };

  const report: Report = {
    ...db.reports[index],
    reportStatus: "Exported",
    status: "Exported",
    pdfStoragePath: storagePath,
    exportedBy: actorId,
    exportedAt: now,
    updatedAt: now
  };
  db.reports[index] = report;
  db.files.unshift(file);
  db.activity_logs.unshift({
    id: id("log"),
    actorId,
    action: "report.exported",
    entityType: "reports",
    entityId: report.id,
    createdAt: now
  });
  await writeDb(db);
  return { report, file };
}

export async function recordAiUsage(input: Partial<AiUsage> & { userId: string }) {
  const db = await readDb();
  const usage: AiUsage = {
    id: id("ai"),
    auditRunId: input.auditRunId,
    userId: input.userId,
    model: input.model || env.geminiModel,
    inputTokens: input.inputTokens || 0,
    outputTokens: input.outputTokens || 0,
    externalApiCalls: input.externalApiCalls || 0,
    estimatedUsd: input.estimatedUsd || 0,
    status: input.status || "Succeeded",
    createdAt: new Date().toISOString()
  };
  db.ai_usage.unshift(usage);
  await writeDb(db);
  return usage;
}

export async function listAiUsage() {
  const db = await readDb();
  return db.ai_usage;
}

export async function createLead(input: Partial<Lead> & { googleMapsUrl?: string; businessName?: string }) {
  const db = await readDb();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: id("lead"),
    businessName: deriveBusinessName(input),
    city: input.city || "Unknown",
    country: input.country || "Unknown",
    area: input.area || "",
    category: input.category || "Unknown",
    website: input.website || "",
    googleMapsUrl: input.googleMapsUrl || "",
    instagramUrl: input.instagramUrl || "",
    facebookUrl: input.facebookUrl || "",
    otherPublicLink: input.otherPublicLink || "",
    phone: input.phone || "",
    email: input.email || "",
    contactName: input.contactName || "",
    contactRole: input.contactRole || "",
    salesContext: input.salesContext || "",
    leadSource: input.leadSource || "Manual",
    leadStatus: (input.leadStatus as LeadStatus) || "Active",
    salesStage: (input.salesStage as SalesStage) || (input.status as SalesStage) || "Research Pending",
    nextAction: input.nextAction || "Run MonkAudit research",
    priority: input.priority || "Medium",
    growthReadinessScore: input.growthReadinessScore,
    notes: input.notes || "",
    lostReason: input.lostReason || "",
    wonNotes: input.wonNotes || "",
    status: (input.salesStage as SalesStage) || (input.status as SalesStage) || "Research Pending",
    assignedTo: input.assignedTo || currentActorEmail(),
    assignedStrategist: input.assignedStrategist || defaultReviewerEmail(),
    teamId: input.teamId || "sales_india",
    visibility: (input.visibility as Visibility) || "team",
    nextFollowUpAt: input.nextFollowUpAt || "",
    createdBy: input.createdBy || currentActorEmail(),
    createdAt: now,
    updatedAt: now
  };
  db.leads.unshift(lead);
  db.activity_logs.unshift({
    id: id("log"),
    actorId: lead.createdBy,
    action: "lead.created",
    entityType: "leads",
    entityId: lead.id,
    createdAt: now
  });
  await writeDb(db);
  return lead;
}

export async function listAudits() {
  const db = await readDb();
  return db.audit_runs;
}

export async function getAudit(auditId: string) {
  const db = await readDb();
  return db.audit_runs.find((audit) => audit.id === auditId) ?? null;
}

export async function updateAudit(
  auditId: string,
  input: Partial<Pick<AuditRun, "businessName" | "city" | "country" | "area" | "category" | "sourceLinks" | "auditStatus" | "status" | "assignedStrategist" | "nextFollowUpAt" | "score" | "rating" | "reviewCount" | "hasWebsite" | "hasWhatsApp" | "hasInstagram" | "hasGoogleBusinessProfile" | "discoveredData" | "finalDataUsed" | "rawResearchFileId" | "errorSummary">>
) {
  const db = await readDb();
  const index = db.audit_runs.findIndex((audit) => audit.id === auditId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const current = db.audit_runs[index];
  const auditStatus = (input.auditStatus as AuditStatus) || legacyAuditStatus(input.status) || current.auditStatus || legacyAuditStatus(current.status);
  const completingResearch = auditStatus !== "Research Running" && current.score === 0;
  const next: AuditRun = {
    ...current,
    ...input,
    auditStatus,
    status: input.status || current.status,
    score: input.score ?? (completingResearch ? 62 : current.score),
    rating: input.rating ?? (completingResearch ? 4.3 : current.rating),
    reviewCount: input.reviewCount ?? (completingResearch ? 86 : current.reviewCount),
    lastUpdated: now
  };

  db.audit_runs[index] = next;

  const leadIndex = db.leads.findIndex((lead) => lead.id === next.leadId);
  if (leadIndex >= 0) {
    const salesStage: SalesStage =
      auditStatus === "Research Running"
        ? "Audit Requested"
        : auditStatus === "Research Completed" || auditStatus === "Needs Review" || auditStatus === "Approved"
          ? "Report Ready"
          : db.leads[leadIndex].salesStage || "Research Pending";
    db.leads[leadIndex] = {
      ...db.leads[leadIndex],
      leadStatus: db.leads[leadIndex].leadStatus || "Active",
      salesStage,
      status: salesStage,
      nextAction: salesStage === "Report Ready" ? "Review client-safe report" : db.leads[leadIndex].nextAction,
      nextFollowUpAt: input.nextFollowUpAt ?? db.leads[leadIndex].nextFollowUpAt,
      updatedAt: now
    };
  }

  db.activity_logs.unshift({
    id: id("log"),
    actorId: currentActorEmail(),
    action: "audit.updated",
    entityType: "audit_runs",
    entityId: auditId,
    createdAt: now
  });
  await writeDb(db);
  return next;
}

export async function createAudit(input: {
  leadId?: string;
  googleMapsUrl?: string;
  website?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  otherPublicLink?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  contactRole?: string;
  salesContext?: string;
  businessName?: string;
  city?: string;
  country?: string;
  area?: string;
  category?: string;
  auditMode?: AuditMode;
  createdBy?: string;
}) {
  const db = await readDb();
  const now = new Date().toISOString();
  let lead = input.leadId ? db.leads.find((item) => item.id === input.leadId) : undefined;

  if (!lead) {
    lead = await createLead({
      googleMapsUrl: input.googleMapsUrl,
      website: input.website,
      instagramUrl: input.instagramUrl,
      facebookUrl: input.facebookUrl,
      otherPublicLink: input.otherPublicLink,
      phone: input.phone,
      email: input.email,
      contactName: input.contactName,
      contactRole: input.contactRole,
      salesContext: input.salesContext,
      businessName: deriveBusinessName(input),
      city: input.city,
      country: input.country,
      area: input.area,
      category: input.category,
      createdBy: input.createdBy
    });
    const refreshed = await readDb();
    db.leads = refreshed.leads;
    db.activity_logs = refreshed.activity_logs;
  }

  const audit: AuditRun = {
    id: id("audit"),
    leadId: lead.id,
    businessName: lead.businessName,
    city: lead.city,
    country: lead.country,
    area: lead.area,
    category: lead.category,
    createdBy: input.createdBy || currentActorEmail(),
    assignedTo: lead.assignedTo,
    assignedStrategist: lead.assignedStrategist,
    teamId: lead.teamId,
    visibility: lead.visibility,
    auditMode: input.auditMode || "quick",
    score: 0,
    rating: 0,
    reviewCount: 0,
    hasWebsite: Boolean(lead.website),
    hasWhatsApp: false,
    hasInstagram: Boolean(lead.instagramUrl),
    hasGoogleBusinessProfile: Boolean(lead.googleMapsUrl || input.googleMapsUrl),
    sourceLinks: {
      googleMapsUrl: lead.googleMapsUrl || input.googleMapsUrl || "",
      website: lead.website || input.website || "",
      instagramUrl: lead.instagramUrl || input.instagramUrl || "",
      facebookUrl: lead.facebookUrl || input.facebookUrl || "",
      otherPublicLink: lead.otherPublicLink || input.otherPublicLink || ""
    },
    auditStatus: "Queued",
    status: "Queued",
    leadSource: lead.leadSource,
    nextFollowUpAt: lead.nextFollowUpAt,
    lastUpdated: now
  };

  db.audit_runs.unshift(audit);
  db.activity_logs.unshift({
    id: id("log"),
    actorId: audit.createdBy,
    action: "audit.created",
    entityType: "audit_runs",
    entityId: audit.id,
    createdAt: now
  });
  await writeDb(db);
  return audit;
}

export async function getDbSummary() {
  const db = await readDb();
  return {
    provider: env.dbProvider,
    counts: {
      users: db.users.length,
      leads: db.leads.length,
      audit_runs: db.audit_runs.length,
      follow_ups: db.follow_ups.length,
      reports: db.reports.length,
      client_accounts: db.client_accounts.length,
      ai_usage: db.ai_usage.length,
      files: db.files.length,
      activity_logs: db.activity_logs.length,
      guardrail_checks: db.guardrail_checks.length,
      fraud_risk_signals: db.fraud_risk_signals.length
    },
    updatedAt: db.meta.updatedAt
  };
}

export { resetDb };
