import path from "node:path";
import { getAudit, listReportsForAudit } from "@/lib/server/repositories";
import { auditModeLabel } from "@/lib/types";
import { normalizePageSize, pdfFileName, scoreColor, SimplePdf } from "@/lib/server/simple-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScoreItem = { label: string; value: number; detail?: string };
type Finding = { title: string; detail: string; action: string };
type InternalBrief = {
  pitchAngle: string; likelyPainPoints: string[]; discoveryQuestions: string[];
  suggestedOffer: string; nextAction: string; objectionHandling: string; doNotClaim: string[];
};
type Competitor = {
  name: string; rating?: number; reviewCount?: number; latestReviewDate?: string;
  winningFactors: string[]; possibleWeaknesses: string[]; lackingFactors: string[];
  socialSignals?: { hasInstagram?: boolean };
};

const MARK_PATH = path.join(process.cwd(), "public", "GrowingMonk_mark_transparent_orange.png");

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  if (!audit) return new Response("Not found", { status: 404 });

  const reports = await listReportsForAudit(params.id);
  const internalReport = reports
    .filter((r) => r.type === "internal_sales_brief")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const finalData = audit.finalDataUsed || {};
  const discoveredData = audit.discoveredData || {};
  const brief = parseInternalBrief(finalData.internalSalesBrief);
  const scoreBreakdown = parseScoreBreakdown(finalData.scoreBreakdown);
  const verifiedFacts = parseList(finalData.verifiedFacts);
  const limitations = parseList(finalData.limitations);
  const generation = parseRecord(finalData.generation);
  const scoringWeights = parseNumberRecord(finalData.scoringWeights);
  const priorityFindings = parseFindings(finalData.priorityFindings);
  const quickWins = parseList(finalData.quickWins);
  const recommendations = parseList(finalData.recommendations);
  const competitorAnalysis = parseText(finalData.competitorAnalysis);
  const googleReviews = parseRecord(discoveredData.googleReviews);
  const competitors = parseCompetitors(discoveredData.competitors);
  const competitorPos = parseRecord(discoveredData.competitorReviewPosition);
  const websiteSignals = parseRecord(discoveredData.websiteSignals);
  const instagram = parseRecord(discoveredData.instagram);
  const preparedDate = formatDate(internalReport?.updatedAt || audit.lastUpdated);
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || audit.city;
  const sourceCoverage = [audit.hasGoogleBusinessProfile, audit.hasWebsite, audit.hasInstagram,
    Boolean(parseText(googleReviews.phone) || parseText(discoveredData.detectedPhone))].filter(Boolean).length;
  const doNotClaim = brief.doNotClaim.length ? brief.doNotClaim : [
    "Exact revenue loss or guaranteed revenue improvement",
    "Guaranteed ranking positions on Google or Maps",
    "Competitor names or specific performance claims without verification",
    "Internal cost, staff quality, or management assessments"
  ];
  const isGemini = parseText(generation.status) === "gemini_generated";
  const paper = normalizePageSize(new URL(req.url).searchParams.get("paper"));
  const pdf = await buildInternalPdf({
    audit,
    brief,
    scoreBreakdown,
    verifiedFacts,
    limitations,
    generation,
    scoringWeights,
    priorityFindings,
    quickWins,
    recommendations,
    competitorAnalysis,
    googleReviews,
    competitors,
    competitorPos,
    preparedDate,
    market,
    sourceCoverage,
    doNotClaim,
    isGemini,
    paper,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName(audit.businessName, "internal-sales-brief")}"`,
      "Cache-Control": "no-store",
    },
  });
}

// ── helpers ─────────────────────────────────────────────────────────────────

type InternalPdfInput = {
  audit: NonNullable<Awaited<ReturnType<typeof getAudit>>>;
  brief: InternalBrief;
  scoreBreakdown: ScoreItem[];
  verifiedFacts: string[];
  limitations: string[];
  generation: Record<string, unknown>;
  scoringWeights: Record<string, number>;
  priorityFindings: Finding[];
  quickWins: string[];
  recommendations: string[];
  competitorAnalysis: string;
  googleReviews: Record<string, unknown>;
  competitors: Competitor[];
  competitorPos: Record<string, unknown>;
  preparedDate: string;
  market: string;
  sourceCoverage: number;
  doNotClaim: string[];
  isGemini: boolean;
  paper: ReturnType<typeof normalizePageSize>;
};

async function buildInternalPdf(input: InternalPdfInput) {
  const pdf = new SimplePdf(input.paper);
  const audit = input.audit;
  const monk: [number, number, number] = [185, 99, 36];
  const red: [number, number, number] = [185, 28, 28];
  const muted: [number, number, number] = [107, 98, 87];
  const ink: [number, number, number] = [29, 27, 24];

  pdf.rect(0, pdf.height - 26, pdf.width, 26, { fill: red });
  pdf.text("INTERNAL - CONFIDENTIAL - NOT FOR CLIENT DISTRIBUTION", pdf.margin, pdf.height - 18, { size: 8, font: "bold", color: [255, 255, 255] });
  pdf.text("CONFIDENTIAL", pdf.margin, pdf.height - 68, { size: 10, font: "bold", color: red });
  pdf.text("MONKAUDIT INTERNAL SALES BRIEF", pdf.margin, pdf.height - 138, { size: 8, font: "bold", color: muted });
  pdf.text(audit.businessName, pdf.margin, pdf.height - 168, { size: 24, font: "bold", color: ink });
  pdf.text(`${input.market} - ${audit.category || "Business"}`, pdf.margin, pdf.height - 188, { size: 11, color: muted });
  drawPdfWordmark(pdf, pdf.width - pdf.margin - 230, pdf.height - 165, ink, muted);
  pdf.line(pdf.margin, pdf.height - 214, pdf.width - pdf.margin, pdf.height - 214, [228, 217, 200], 0.8);
  pdf.text(`Score: ${audit.score || "-"}/100`, pdf.margin, pdf.height - 238, { size: 11, font: "bold", color: scoreColor(audit.score || 0) });
  pdf.text(`Rating: ${audit.rating || "Not verified"}`, pdf.margin + 120, pdf.height - 238, { size: 10, color: ink });
  pdf.text(`Reviews: ${audit.reviewCount || "Not verified"}`, pdf.margin + 240, pdf.height - 238, { size: 10, color: ink });
  pdf.text(`Audit mode: ${auditModeLabel(audit.auditMode)}`, pdf.margin + 360, pdf.height - 238, { size: 10, color: ink });
  pdf.text(`Prepared: ${input.preparedDate}`, pdf.margin, pdf.height - 272, { size: 9, color: muted });
  pdf.text(`Assigned to: ${audit.assignedTo || "-"}`, pdf.margin, pdf.height - 288, { size: 9, color: muted });
  pdf.text(`Reviewer: ${audit.assignedStrategist || "-"}`, pdf.margin, pdf.height - 304, { size: 9, color: muted });
  pdf.text(`Generation: ${input.isGemini ? "Gemini" : "Fallback template"}`, pdf.margin, pdf.height - 320, { size: 9, color: muted });
  pdf.setY(pdf.height - 374);

  pdf.heading("Deal Closing Snapshot");
  pdf.card("Pitch Angle", input.brief.pitchAngle || "Lead with local visibility, trust proof, and contact flow.");
  pdf.card("Suggested Offer", input.brief.suggestedOffer || "30-Day Growth Sprint");
  pdf.card("Next Ask", input.brief.nextAction || "Request GBP, analytics, and social access.");
  pdf.card("Source Confidence", `${audit.hasGoogleBusinessProfile ? "Medium" : "Low"}. Based on ${input.sourceCoverage}/4 public sources resolved.`);
  pdf.heading("Likely Pain Points");
  (input.brief.likelyPainPoints.length ? input.brief.likelyPainPoints : ["Local visibility, trust proof, enquiry flow, and tracking may be incomplete."]).forEach((item) => pdf.bullet(item));

  pdf.addPage();
  pdf.heading("Priority Findings");
  (input.priorityFindings.length ? input.priorityFindings : fallbackFindings()).slice(0, 4).forEach((finding) => {
    pdf.card(finding.title, `${finding.detail} Action: ${finding.action}`);
  });
  pdf.heading("Recommended Next Moves");
  input.recommendations.slice(0, 8).forEach((item) => pdf.bullet(item));
  pdf.heading("Quick Wins");
  input.quickWins.slice(0, 8).forEach((item) => pdf.bullet(item));

  pdf.addPage();
  pdf.heading("Sales Discovery Preparation");
  (input.brief.discoveryQuestions.length ? input.brief.discoveryQuestions : ["What enquiry sources are working best today?", "What would make this a successful 30-day sprint?"]).forEach((item) => pdf.bullet(item));
  pdf.heading("Data to Request");
  ["Google Business Profile access or screenshots", "Google Analytics / Search Console access", "Ad account access if running ads", "Instagram insights screenshots", "Monthly enquiry / booking volume", "Current monthly marketing spend"].forEach((item) => pdf.bullet(item));
  pdf.heading("Objection Handling");
  pdf.points(input.brief.objectionHandling || "Keep the conversation anchored to verified public evidence, measurement gaps, and a low-risk first sprint.", { size: 9.5, lineHeight: 13, maxItems: 5 });
  pdf.heading("Do Not Claim in Client Materials");
  input.doNotClaim.forEach((item) => pdf.bullet(item, { color: red }));

  pdf.addPage();
  pdf.heading("Growth Readiness Scores + Evidence");
  input.scoreBreakdown.forEach((item) => {
    pdf.ensureSpace(30);
    const y = pdf.currentY();
    pdf.text(item.label, pdf.margin, y, { size: 9, color: ink });
    pdf.text(`${item.value}/100`, pdf.margin + 220, y, { size: 9, font: "bold", color: scoreColor(item.value) });
    pdf.text(`${((input.scoringWeights[item.label] || 0) * 100).toFixed(0)}%`, pdf.margin + 290, y, { size: 9, color: muted });
    pdf.setY(y - 16);
    if (item.detail) pdf.points(item.detail, { size: 8, lineHeight: 10, color: muted, maxItems: 2 });
  });
  pdf.heading("Verified Public Data");
  input.verifiedFacts.slice(0, 10).forEach((item) => pdf.bullet(stripEvidencePrefix(item), { size: 9 }));
  pdf.heading("Research Limitations");
  input.limitations.slice(0, 8).forEach((item) => pdf.bullet(item, { size: 8.5, color: muted }));

  pdf.addPage();
  pdf.heading("Competitor Intelligence");
  const summary = parseText(input.competitorPos.summary);
  if (summary) pdf.card("Position Summary", summary);
  input.competitors.slice(0, 7).forEach((competitor) => {
    pdf.card(
      `${competitor.name} - ${competitor.rating || "N/A"} rating, ${competitor.reviewCount || "N/A"} reviews`,
      `Social: ${competitor.socialSignals?.hasInstagram ? "Instagram found" : "Not found"}. Winning factors: ${competitor.winningFactors.join(", ") || "Needs review"}. Gaps: ${[...competitor.possibleWeaknesses, ...competitor.lackingFactors].join(", ") || "Verify manually."}`,
      [101, 119, 96],
    );
  });
  if (input.competitorAnalysis) pdf.points(input.competitorAnalysis, { size: 9, lineHeight: 12, maxItems: 8 });

  pdf.addPage();
  pdf.heading("Research Metadata");
  [
    `AI Provider: ${parseText(input.generation.provider) || "fallback"}`,
    `AI Model: ${parseText(input.generation.model) || "N/A"}`,
    `Generation: ${input.isGemini ? "Gemini generated" : "Fallback template"}`,
    `Generated at: ${formatDate(parseText(input.generation.generatedAt))}`,
    `Prompt version: ${parseText(input.generation.promptVersion) || "N/A"}`,
    `Audit mode: ${auditModeLabel(audit.auditMode)}`,
    `Last updated: ${formatDate(audit.lastUpdated)}`,
  ].forEach((item) => pdf.bullet(item));
  pdf.card(input.isGemini ? "Generation Status" : "Fallback Template Used", input.isGemini ? "Report was generated by Gemini AI from public source data." : "Report used the fallback template. Set GEMINI_API_KEY for AI generation.", input.isGemini ? [101, 119, 96] : [180, 83, 9]);

  pdf.footer(`INTERNAL - CONFIDENTIAL - MonkAudit - GrowingMonk - ${input.preparedDate}`);
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

function parseNumberRecord(value: unknown): Record<string, number> {
  const r = parseRecord(value);
  return Object.fromEntries(Object.entries(r).filter((e): e is [string, number] => typeof e[1] === "number"));
}

function parseInternalBrief(value: unknown): InternalBrief {
  const r = parseRecord(value);
  return {
    pitchAngle: parseText(r.pitchAngle), likelyPainPoints: parseList(r.likelyPainPoints),
    discoveryQuestions: parseList(r.discoveryQuestions), suggestedOffer: parseText(r.suggestedOffer),
    nextAction: parseText(r.nextAction), objectionHandling: parseText(r.objectionHandling),
    doNotClaim: parseList(r.doNotClaim)
  };
}

function parseScoreBreakdown(value: unknown): ScoreItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((i) => typeof i.label === "string" && typeof i.value === "number").map((i) => ({
    label: String(i.label), value: Number(i.value), detail: parseText(i.detail)
  }));
}

function parseFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((i) => typeof i.title === "string").map((i) => ({
    title: parseText(i.title), detail: parseText(i.detail), action: parseText(i.action)
  }));
}

function parseCompetitors(value: unknown): Competitor[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((i) => typeof i.name === "string").map((i) => {
    const ss = parseRecord(i.socialSignals);
    return {
      name: parseText(i.name), rating: typeof i.rating === "number" ? i.rating : undefined,
      reviewCount: typeof i.reviewCount === "number" ? i.reviewCount : undefined,
      latestReviewDate: parseText(i.latestReviewDate), winningFactors: parseList(i.winningFactors),
      possibleWeaknesses: parseList(i.possibleWeaknesses), lackingFactors: parseList(i.lackingFactors),
      socialSignals: { hasInstagram: Boolean(ss.hasInstagram) }
    };
  });
}


function fallbackFindings(): Finding[] {
  return [
    { title: "Visibility needs review", detail: "Confirm GBP, website, social proof, and source consistency.", action: "Complete manual source review." },
    { title: "Trust proof needs structure", detail: "Reviews, photos, services, and proof should be clearer before outreach.", action: "Prioritize GBP and review improvements." },
    { title: "Conversion flow needs validation", detail: "Calls, WhatsApp, booking, and tracking should be checked.", action: "Audit contact path and tracking." }
  ];
}

