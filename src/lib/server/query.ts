import type { AuditRun, Lead, Report } from "@/lib/types";

export type PageRequest = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

export type LeadFilters = {
  q?: string;
  city?: string;
  country?: string;
  area?: string;
  category?: string;
  owner?: string;
  reviewer?: string;
  teamId?: string;
  leadSource?: string;
  leadStatus?: string;
  salesStage?: string;
  nextAction?: string;
  visibility?: string;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasInstagram?: boolean;
};

export type AuditFilters = Pick<LeadFilters, "q" | "city" | "country" | "area" | "category" | "owner" | "reviewer" | "teamId" | "visibility"> & {
  auditStatus?: string;
  auditMode?: string;
};

export type ReportFilters = {
  q?: string;
  leadId?: string;
  auditRunId?: string;
  reportStatus?: string;
  type?: string;
};

export function paginate<T>(records: T[], request: PageRequest = {}) {
  const page = Math.max(1, Number(request.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(request.pageSize || 25)));
  const offset = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total: records.length,
    records: records.slice(offset, offset + pageSize)
  };
}

export function filterLeads(records: Lead[], filters: LeadFilters = {}) {
  const q = filters.q?.toLowerCase().trim();
  return records.filter((lead) => {
    if (q && ![lead.businessName, lead.city, lead.area, lead.category, lead.assignedTo].join(" ").toLowerCase().includes(q)) return false;
    if (filters.city && lead.city !== filters.city) return false;
    if (filters.country && lead.country !== filters.country) return false;
    if (filters.area && lead.area !== filters.area) return false;
    if (filters.category && lead.category !== filters.category) return false;
    if (filters.owner && lead.assignedTo !== filters.owner) return false;
    if (filters.reviewer && lead.assignedStrategist !== filters.reviewer) return false;
    if (filters.teamId && lead.teamId !== filters.teamId) return false;
    if (filters.leadSource && lead.leadSource !== filters.leadSource) return false;
    if (filters.leadStatus && lead.leadStatus !== filters.leadStatus) return false;
    if (filters.salesStage && lead.salesStage !== filters.salesStage) return false;
    if (filters.nextAction && lead.nextAction !== filters.nextAction) return false;
    if (filters.visibility && lead.visibility !== filters.visibility) return false;
    if (filters.hasWebsite !== undefined && Boolean(lead.website) !== filters.hasWebsite) return false;
    if (filters.hasPhone !== undefined && Boolean(lead.phone) !== filters.hasPhone) return false;
    if (filters.hasEmail !== undefined && Boolean(lead.email) !== filters.hasEmail) return false;
    if (filters.hasInstagram !== undefined && Boolean(lead.instagramUrl) !== filters.hasInstagram) return false;
    return true;
  });
}

export function filterAudits(records: AuditRun[], filters: AuditFilters = {}) {
  const q = filters.q?.toLowerCase().trim();
  return records.filter((audit) => {
    if (q && ![audit.businessName, audit.city, audit.area, audit.category, audit.assignedTo].join(" ").toLowerCase().includes(q)) return false;
    if (filters.city && audit.city !== filters.city) return false;
    if (filters.country && audit.country !== filters.country) return false;
    if (filters.area && audit.area !== filters.area) return false;
    if (filters.category && audit.category !== filters.category) return false;
    if (filters.owner && audit.assignedTo !== filters.owner) return false;
    if (filters.reviewer && audit.assignedStrategist !== filters.reviewer) return false;
    if (filters.teamId && audit.teamId !== filters.teamId) return false;
    if (filters.visibility && audit.visibility !== filters.visibility) return false;
    if (filters.auditStatus && audit.auditStatus !== filters.auditStatus) return false;
    if (filters.auditMode && audit.auditMode !== filters.auditMode) return false;
    return true;
  });
}

export function filterReports(records: Report[], filters: ReportFilters = {}) {
  return records.filter((report) => {
    if (filters.leadId && report.leadId !== filters.leadId) return false;
    if (filters.auditRunId && report.auditRunId !== filters.auditRunId) return false;
    if (filters.reportStatus && report.reportStatus !== filters.reportStatus) return false;
    if (filters.type && report.type !== filters.type) return false;
    return true;
  });
}
