import path from "node:path";
import { getAudit, listReportsForAudit } from "@/lib/server/repositories";
import { normalizePageSize, pdfFileName, scoreColor, SimplePdf } from "@/lib/server/simple-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScoreItem = { label: string; value: number; tone?: string; detail?: string };
type Finding = { title: string; detail: string; action: string };
type GoogleReviews = {
  rating?: number;
  reviewCount?: number;
  positiveSignals: string[];
  riskSignals: string[];
  staffSignals: string[];
  loyaltySignals: string[];
  pricingSignals: string[];
  bookingSignals: string[];
  sampleReviews: Array<{ author?: string; rating?: number; relativeTime?: string; text?: string; ownerResponse?: string }>;
  reviewHealthSummary?: string;
  latestReviewDate?: string;
};
type Competitor = { name: string; rating?: number; reviewCount?: number; winningFactors: string[]; possibleWeaknesses: string[] };

const MARK_PATH = path.join(process.cwd(), "public", "GrowingMonk_mark_transparent_orange.png");

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  if (!audit) return new Response("Not found", { status: 404 });

  const reports = await listReportsForAudit(params.id);
  const clientReport = reports
    .filter((r) => r.type === "client_growth_due_diligence")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const finalData = audit.finalDataUsed || {};
  const discoveredData = audit.discoveredData || {};
  const scoreBreakdown = parseScoreBreakdown(finalData.scoreBreakdown);
  const executiveSummary = parseText(finalData.executiveSummary);
  const priorityFindings = parseFindings(finalData.priorityFindings);
  const recommendations = parseList(finalData.recommendations);
  const quickWins = parseList(finalData.quickWins);
  const growthPlan90 = parseList(finalData.growthPlan90);
  const googleReviewAnalysis = parseText(finalData.googleReviewAnalysis);
  const competitorAnalysis = parseText(finalData.competitorAnalysis);
  const instagramAnalysis = parseText(finalData.instagramAnalysis);
  const pricingAnalysis = parseText(finalData.pricingAnalysis);
  const verifiedFacts = parseList(finalData.verifiedFacts);
  const limitations = parseList(finalData.limitations);
  const suggestedOffer = parseText(parseRecord(finalData.internalSalesBrief).suggestedOffer);
  const googleReviews = parseGoogleReviews(discoveredData.googleReviews);
  const competitors = parseCompetitors(discoveredData.competitors);
  const markdown = clientReport?.clientReportMarkdown || clientReport?.markdown || "";
  const preparedDate = formatDate(clientReport?.updatedAt || audit.lastUpdated);
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || audit.city;
  const gapGroups = buildGapGroups(markdown, priorityFindings);
  const planColumns = splitPlan(growthPlan90);
  const systemText = extractSection(markdown, "Recommended GrowingMonk Growth System");
  const paper = normalizePageSize(new URL(req.url).searchParams.get("paper"));
  const pdf = await buildClientPdf({
    audit,
    scoreBreakdown,
    executiveSummary,
    priorityFindings,
    recommendations,
    quickWins,
    growthPlan90,
    googleReviewAnalysis,
    competitorAnalysis,
    instagramAnalysis,
    pricingAnalysis,
    verifiedFacts,
    limitations,
    suggestedOffer,
    googleReviews,
    competitors,
    preparedDate,
    market,
    gapGroups,
    planColumns,
    systemText,
    paper,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName(audit.businessName, "client-growth-report")}"`,
      "Cache-Control": "no-store",
    },
  });
}

type ClientPdfInput = {
  audit: NonNullable<Awaited<ReturnType<typeof getAudit>>>;
  scoreBreakdown: ScoreItem[];
  executiveSummary: string;
  priorityFindings: Finding[];
  recommendations: string[];
  quickWins: string[];
  growthPlan90: string[];
  googleReviewAnalysis: string;
  competitorAnalysis: string;
  instagramAnalysis: string;
  pricingAnalysis: string;
  verifiedFacts: string[];
  limitations: string[];
  suggestedOffer: string;
  googleReviews: GoogleReviews | null;
  competitors: Competitor[];
  preparedDate: string;
  market: string;
  gapGroups: Array<{ title: string; items: string[] }>;
  planColumns: string[][];
  systemText: string;
  paper: ReturnType<typeof normalizePageSize>;
};

async function buildClientPdf(input: ClientPdfInput) {
  const pdf = new SimplePdf(input.paper);
  const audit = input.audit;
  const score = audit.score || 0;
  const monk: [number, number, number] = [185, 99, 36];
  const muted: [number, number, number] = [107, 98, 87];
  const ink: [number, number, number] = [29, 27, 24];

  pdf.rect(0, pdf.height - 8, pdf.width, 8, { fill: monk });
  pdf.text("GROWTH INTELLIGENCE REPORT", pdf.margin, pdf.height - 112, { size: 8, font: "bold", color: monk });
  pdf.text(audit.businessName, pdf.margin, pdf.height - 142, { size: 26, font: "bold", color: ink });
  pdf.text(`${input.market} - ${audit.category || "Business"}`, pdf.margin, pdf.height - 162, { size: 11, color: muted });
  drawPdfWordmark(pdf, pdf.width - pdf.margin - 230, pdf.height - 142, ink, muted);
  pdf.line(pdf.margin, pdf.height - 192, pdf.width - pdf.margin, pdf.height - 192, [228, 217, 200], 0.8);
  pdf.text("Growth Readiness Score", pdf.margin, pdf.height - 218, { size: 8, color: muted });
  pdf.text(score ? `${score}/100` : "-", pdf.margin + 128, pdf.height - 218, { size: 14, font: "bold", color: scoreColor(score) });
  pdf.text(`Prepared: ${input.preparedDate}`, pdf.margin + 235, pdf.height - 218, { size: 8, color: muted });
  pdf.text("Confidential - GrowingMonk", pdf.width - pdf.margin - 118, pdf.height - 218, { size: 8, color: muted });
  pdf.rect(pdf.margin, pdf.height - 234, pdf.width - pdf.margin * 2, 4, { fill: [228, 217, 200] });
  pdf.rect(pdf.margin, pdf.height - 234, (pdf.width - pdf.margin * 2) * clamp(score) / 100, 4, { fill: monk });
  pdf.setY(pdf.height - 268);

  pdf.heading("Executive Summary");
  pdf.points(input.executiveSummary || "Research completed. See detailed sections below.", { size: 10, lineHeight: 13, color: ink, maxItems: 5 });
  pdf.moveDown(8);
  pdf.heading("Priority Findings");
  (input.priorityFindings.length ? input.priorityFindings : fallbackFindings()).slice(0, 4).forEach((finding) => {
    pdf.card(finding.title, `${finding.detail}. Recommended: ${finding.action}`);
  });

  pdf.heading("Growth Readiness Score");
  const scores = input.scoreBreakdown.length ? input.scoreBreakdown : [{ label: "Overall Growth Readiness", value: score, detail: "Weighted score from public-source evidence." }];
  scores.forEach((item) => {
    pdf.ensureSpace(30);
    const y = pdf.currentY();
    pdf.text(item.label, pdf.margin, y, { size: 9, color: ink });
    pdf.text(`${item.value}/100`, pdf.width - pdf.margin - 40, y, { size: 9, font: "bold", color: scoreColor(item.value) });
    pdf.rect(pdf.margin, y - 10, pdf.width - pdf.margin * 2, 4, { fill: [228, 217, 200] });
    pdf.rect(pdf.margin, y - 10, (pdf.width - pdf.margin * 2) * clamp(item.value) / 100, 4, { fill: monk });
    pdf.setY(y - 25);
    if (item.detail) pdf.points(item.detail, { size: 8, color: muted, lineHeight: 10, maxItems: 2 });
  });

  if (pdf.currentY() < 260) pdf.addPage(); else pdf.moveDown(8);
  pdf.heading("Public Data Verified");
  [
    `Google / GBP: ${audit.hasGoogleBusinessProfile ? "Provided" : "Not confirmed"}`,
    `Website: ${audit.hasWebsite ? "Detected" : "Not detected"}`,
    `Instagram: ${audit.hasInstagram ? "Detected" : "Not detected"}`,
    `Reviews: ${audit.reviewCount ? `${audit.reviewCount} visible` : "Not verified"}`,
  ].forEach((item) => pdf.bullet(item));
  input.verifiedFacts.slice(0, 8).forEach((fact) => pdf.bullet(stripEvidencePrefix(fact), { size: 9 }));

  pdf.heading("Google Reviews Intelligence");
  pdf.write(`Rating: ${input.googleReviews?.rating || audit.rating || "Not verified"} | Reviews: ${input.googleReviews?.reviewCount || audit.reviewCount || "Not verified"} | Latest review: ${input.googleReviews?.latestReviewDate ? formatDate(input.googleReviews.latestReviewDate) : "Not visible"}`, { size: 9.5, color: ink });
  [...(input.googleReviews?.positiveSignals || []), ...(input.googleReviews?.staffSignals || [])].slice(0, 8).forEach((item) => pdf.bullet(item, { size: 9 }));
  if (input.googleReviewAnalysis) pdf.points(input.googleReviewAnalysis, { size: 9, lineHeight: 12, color: ink, maxItems: 6 });

  if (pdf.currentY() < 300) pdf.addPage(); else pdf.moveDown(8);
  pdf.heading("Competitor Comparison");
  if (input.competitors.length) {
    input.competitors.slice(0, 6).forEach((competitor) => {
      pdf.card(
        `${competitor.name} - ${competitor.rating || "N/A"} rating, ${competitor.reviewCount || "N/A"} reviews`,
        `Strengths: ${competitor.winningFactors.join(", ") || "Needs review"}. Gap: ${competitor.possibleWeaknesses.join(", ") || "Verify proof and positioning."}`,
        [101, 119, 96],
      );
    });
  } else {
    pdf.write("Competitor data is collected during audit research. Verify the top 3-5 nearby competitors manually using Google Maps.", { size: 9.5 });
  }
  if (input.competitorAnalysis) pdf.points(input.competitorAnalysis, { size: 9, lineHeight: 12, maxItems: 8 });

  pdf.heading("Pricing and Social");
  pdf.card("Pricing and Positioning", input.pricingAnalysis || "Pricing position needs manual review.");
  pdf.card("Instagram / Social Media", input.instagramAnalysis || "Instagram and social proof need manual review.");

  if (pdf.currentY() < 320) pdf.addPage(); else pdf.moveDown(8);
  pdf.heading("Highest-Impact Growth Gaps");
  input.gapGroups.forEach((group) => pdf.card(group.title, group.items.join("\n")));

  pdf.heading("Recommended Quick Wins");
  (input.quickWins.length ? input.quickWins : input.recommendations).slice(0, 8).forEach((item) => pdf.bullet(item));

  pdf.heading("30 / 60 / 90 Day Growth Plan");
  ["30 Days - Foundation", "60 Days - Demand Building", "90 Days - Scale Readiness"].forEach((title, index) => {
    pdf.card(title, (input.planColumns[index] || []).join("\n") || "Review and prioritize the next highest-impact actions.");
  });

  pdf.heading("Recommended GrowingMonk Growth System");
  pdf.points(input.systemText || `Recommended next step: ${input.suggestedOffer || "30-Day Growth Sprint"}. Focus on local visibility, trust proof, conversion flow, tracking, and demand generation.`, { size: 10, lineHeight: 13, maxItems: 5 });
  if (input.limitations.length) {
    pdf.heading("Research Limitations");
    input.limitations.slice(0, 5).forEach((item) => pdf.bullet(item, { size: 8.5, color: muted }));
  }

  pdf.footer(`${audit.businessName} - Growth Intelligence Report - ${input.preparedDate}`);
  return pdf.output();
}

function stripEvidencePrefix(text: string) {
  return text.replace(/^(Verified|Observed|Inferred|Needs Manual Review|Not Found):\s*/i, "");
}

function drawPdfWordmark(pdf: SimplePdf, x: number, y: number, ink: [number, number, number], muted: [number, number, number]) {
  const markSize = 34;
  if (!pdf.image(MARK_PATH, x, y + 20, { width: markSize })) {
    pdf.logoMark(x, y + 27, markSize);
  }
  pdf.text("GrowingMonk", x + 44, y, { size: 21, font: "bold", color: ink });
  pdf.text("Digital Marketing & Growth Agency", x + 45, y - 18, { size: 6.5, color: muted });
}

function clamp(v: number) { return Math.max(0, Math.min(100, v || 0)); }

function formatDate(value?: string): string {
  const d = value ? new Date(value) : new Date();
  const v = Number.isFinite(d.getTime()) ? d : new Date();
  return v.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function parseText(value: unknown): string { return typeof value === "string" ? value : ""; }

function parseList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
}

function parseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseScoreBreakdown(value: unknown): ScoreItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((i) => typeof i.label === "string" && typeof i.value === "number").map((i) => ({
    label: String(i.label), value: Number(i.value), tone: parseText(i.tone), detail: parseText(i.detail)
  }));
}

function parseFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((i) => typeof i.title === "string").map((i) => ({
    title: parseText(i.title), detail: parseText(i.detail), action: parseText(i.action)
  }));
}

function parseGoogleReviews(value: unknown): GoogleReviews | null {
  const r = parseRecord(value);
  if (!Object.keys(r).length) return null;
  return {
    rating: typeof r.rating === "number" ? r.rating : undefined,
    reviewCount: typeof r.reviewCount === "number" ? r.reviewCount : undefined,
    positiveSignals: parseList(r.positiveSignals), riskSignals: parseList(r.riskSignals),
    staffSignals: parseList(r.staffSignals), loyaltySignals: parseList(r.loyaltySignals),
    pricingSignals: parseList(r.pricingSignals), bookingSignals: parseList(r.bookingSignals),
    sampleReviews: Array.isArray(r.sampleReviews) ? r.sampleReviews.map((item) => parseRecord(item)).map((item) => ({
      author: parseText(item.author), rating: typeof item.rating === "number" ? item.rating : undefined,
      relativeTime: parseText(item.relativeTime), text: parseText(item.text), ownerResponse: parseText(item.ownerResponse)
    })) : [],
    reviewHealthSummary: parseText(r.reviewHealthSummary), latestReviewDate: parseText(r.latestReviewDate)
  };
}

function parseCompetitors(value: unknown): Competitor[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((i) => typeof i.name === "string").map((i) => ({
    name: parseText(i.name), rating: typeof i.rating === "number" ? i.rating : undefined,
    reviewCount: typeof i.reviewCount === "number" ? i.reviewCount : undefined,
    winningFactors: parseList(i.winningFactors), possibleWeaknesses: parseList(i.possibleWeaknesses)
  }));
}

function extractSection(md: string, title: string): string {
  const pattern = new RegExp(`^#{1,3}\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$([\\s\\S]*?)(?=^#{1,3}\\s+|$)`, "im");
  return md.match(pattern)?.[1]?.trim() || "";
}

function buildGapGroups(md: string, findings: Finding[]) {
  const titles = ["Visibility Improvements", "Trust Improvements", "Conversion Improvements", "Social Improvements", "Paid Growth Readiness"];
  return titles.map((title, i) => {
    const text = extractSection(md, title);
    const items = text ? text.split("\n").map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean).slice(0, 4)
      : findings.slice(i, i + 2).map((finding) => finding.detail || finding.title);
    return { title, items: items.length ? items : ["Needs manual review and prioritization."] };
  });
}

function splitPlan(items: string[]) {
  const source = items.length ? items : ["Fix GBP completeness, reviews, contact path, and tracking.", "Build demand with Instagram, Google posts, and landing sections.", "Prepare paid campaigns, reporting, and optimization rhythm."];
  const size = Math.ceil(source.length / 3);
  return [source.slice(0, size), source.slice(size, size * 2), source.slice(size * 2)];
}

function fallbackFindings(): Finding[] {
  return [
    { title: "Visibility needs review", detail: "Confirm GBP, website, social proof, and source consistency.", action: "Complete manual source review." },
    { title: "Trust proof needs structure", detail: "Reviews, photos, services, and proof should be clearer before outreach.", action: "Prioritize GBP and review improvements." },
    { title: "Conversion flow needs validation", detail: "Calls, WhatsApp, booking, and tracking should be checked.", action: "Audit contact path and tracking." }
  ];
}

