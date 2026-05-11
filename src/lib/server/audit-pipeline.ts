import "server-only";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { AuditRun } from "@/lib/types";
import { env } from "./env";
import { recordAiUsage, saveReport, updateAudit, updateLead } from "./repositories";

const execAsync = promisify(exec);

const placeDetailsFields = [
  "name",
  "place_id",
  "formatted_address",
  "formatted_phone_number",
  "international_phone_number",
  "website",
  "url",
  "rating",
  "user_ratings_total",
  "price_level",
  "business_status",
  "types",
  "opening_hours",
  "reviews",
  "geometry"
].join(",");

const nicheQueryByCategory: Record<string, string> = {
  "Salon / Beauty": "salon",
  Salon: "salon",
  Beauty: "salon",
  "Restaurant / Cafe": "restaurant",
  Restaurant: "restaurant",
  Cafe: "cafe",
  "Local Service": "local service",
  "Dental Clinic": "dentist",
  Healthcare: "clinic",
  "Clinic / Wellness": "clinic",
  "Gym / Fitness": "gym",
  "Interior Design": "interior designer",
  "Laundry / Dry Cleaning": "laundry dry cleaning"
};

const growthScoreWeights: Record<string, number> = {
  "Google Business Profile / Local SEO": 0.2,
  "Reviews / Reputation": 0.2,
  "Website / Conversion": 0.2,
  "Social Content": 0.15,
  "Competitor Strength": 0.1,
  "Tracking / Funnel": 0.1,
  "Paid Growth Readiness": 0.05
};

export const auditPipelineStages = [
  "normalize_business_data",
  "resolve_google_profile",
  "summarize_website_findings",
  "summarize_review_findings",
  "summarize_competitor_findings",
  "generate_scores",
  "generate_internal_sales_brief",
  "generate_client_safe_report",
  "run_client_language_cleanup"
];

export async function runLocalAuditPipeline(audit: AuditRun, options: { requireGemini?: boolean } = {}) {
  const research = await collectPublicSourceSignals(audit);
  const enrichedAudit = applyDiscoveredIdentity(audit, research);
  const auditNarrative = buildCuratedAudit(enrichedAudit, research);
  const generatedReport = await generateGeminiAuditReport(enrichedAudit, research, auditNarrative);
  if (options.requireGemini && generatedReport.generation.status !== "gemini_generated") {
    throw new Error(generatedReport.generation.error || "Gemini report was not generated. Set GEMINI_API_KEY in .env.local, restart the dev server, then run the audit again.");
  }
  const scoreBreakdown = auditNarrative.scoreBreakdown;
  const overallScore = weightedGrowthReadiness(scoreBreakdown);
  await updateLead(audit.leadId, {
    businessName: enrichedAudit.businessName,
    city: enrichedAudit.city,
    country: enrichedAudit.country,
    area: enrichedAudit.area,
    category: enrichedAudit.category,
    website: enrichedAudit.sourceLinks?.website || "",
    googleMapsUrl: enrichedAudit.sourceLinks?.googleMapsUrl || "",
    instagramUrl: enrichedAudit.sourceLinks?.instagramUrl || "",
    facebookUrl: enrichedAudit.sourceLinks?.facebookUrl || "",
    otherPublicLink: enrichedAudit.sourceLinks?.otherPublicLink || "",
    phone: research.detectedPhone || "",
    email: research.detectedEmail || "",
    updatedBy: audit.createdBy
  });
  const completed = await updateAudit(audit.id, {
    businessName: enrichedAudit.businessName,
    city: enrichedAudit.city,
    country: enrichedAudit.country,
    area: enrichedAudit.area,
    category: enrichedAudit.category,
    sourceLinks: enrichedAudit.sourceLinks,
    auditStatus: "Research Completed",
    status: "Research Completed",
    score: overallScore,
    rating: research.rating,
    reviewCount: research.reviewCount,
    hasWebsite: research.hasWebsite,
    hasWhatsApp: research.hasWhatsApp,
    hasInstagram: research.hasInstagram,
    hasGoogleBusinessProfile: research.hasGoogleBusinessProfile,
    errorSummary: "",
    discoveredData: research,
    finalDataUsed: {
      scoreBreakdown,
      verifiedFacts: research.verifiedFacts,
      limitations: research.limitations,
      sourceLinks: enrichedAudit.sourceLinks,
      googleReviews: research.googleReviews,
      competitors: research.competitors,
      competitorReviewPosition: research.competitorReviewPosition,
      executiveSummary: auditNarrative.executiveSummary,
      priorityFindings: auditNarrative.priorityFindings,
      recommendations: auditNarrative.recommendations,
      quickWins: auditNarrative.quickWins,
      googleReviewAnalysis: auditNarrative.googleReviewAnalysis,
      competitorAnalysis: auditNarrative.competitorAnalysis,
      instagramAnalysis: auditNarrative.instagramAnalysis,
      pricingAnalysis: auditNarrative.pricingAnalysis,
      operationsAnalysis: auditNarrative.operationsAnalysis,
      growthPlan: auditNarrative.growthPlan,
      growthPlan90: auditNarrative.growthPlan90,
      scoringWeights: growthScoreWeights,
      clientSafeNarrative: auditNarrative.clientSafeNarrative,
      internalSalesBrief: auditNarrative.internalSalesBrief,
      salesCallNotes: generatedReport.salesCallNotesMarkdown || salesCallNotesDraft(enrichedAudit, auditNarrative),
      generation: generatedReport.generation
    },
    rawResearchFileId: `raw-research/${audit.id}.json`
  });
  const completedAudit = completed || audit;
  const clientDraft = finalizeClientReport(generatedReport.clientReportMarkdown || clientReportDraft(completedAudit, auditNarrative), completedAudit, auditNarrative);
  const internalDraft = finalizeInternalBrief(generatedReport.internalBriefMarkdown || internalBriefDraft(completedAudit, auditNarrative), completedAudit);
  const salesCallNotes = finalizeInternalBrief(generatedReport.salesCallNotesMarkdown || salesCallNotesDraft(completedAudit, auditNarrative), completedAudit);
  await saveReport({
    auditRunId: audit.id,
    leadId: audit.leadId,
    type: "client_growth_due_diligence",
    reportStatus: "Needs Review",
    markdown: clientDraft,
    clientReportMarkdown: clientDraft,
    createdBy: audit.createdBy
  });
  await saveReport({
    auditRunId: audit.id,
    leadId: audit.leadId,
    type: "internal_sales_brief",
    reportStatus: "Draft Generated",
    markdown: internalDraft,
    internalBriefMarkdown: internalDraft,
    createdBy: audit.createdBy
  });
  await saveReport({
    auditRunId: audit.id,
    leadId: audit.leadId,
    type: "sales_call_notes",
    reportStatus: "Draft Generated",
    markdown: salesCallNotes,
    salesCallNotesMarkdown: salesCallNotes,
    createdBy: audit.createdBy
  });
  await updateLead(audit.leadId, {
    leadStatus: "Active",
    salesStage: "Report Ready",
    status: "Report Ready",
    nextAction: "Review client-safe report",
    updatedBy: audit.createdBy
  });
  await recordAiUsage({
    auditRunId: audit.id,
    userId: audit.createdBy,
    model: env.geminiModel,
    inputTokens: generatedReport.inputTokens,
    outputTokens: generatedReport.outputTokens,
    externalApiCalls: research.externalApiCalls,
    estimatedUsd: generatedReport.generation.status === "gemini_generated" ? 0.02 : 0.01,
    status: "Succeeded"
  });

  return {
    mode: "phase1_public_source_audit",
    stages: auditPipelineStages.map((stage) => ({ stage, status: "completed" })),
    audit: completedAudit
  };
}

function clientReportDraft(audit: AuditRun, narrative = buildFallbackNarrative(audit)) {
  const facts = getVerifiedFacts(audit);
  const limitations = getLimitations(audit);
  const date = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  return `# ${audit.businessName} Growth Intelligence Report

Prepared by GrowingMonk
Report date: ${date}

## Executive summary
${narrative.executiveSummary}

## Growth Readiness Score
Overall Growth Readiness: ${weightedGrowthReadiness(narrative.scoreBreakdown)}/100.

${narrative.scoreBreakdown.map((score) => `- ${score.label}: ${score.value}/100 - ${score.detail}`).join("\n")}

## Public Data Verified
- Market: ${audit.city}, ${audit.country}
- Category: ${audit.category}
- Google profile source: ${audit.hasGoogleBusinessProfile ? "Provided" : "Not confirmed"}
- Website source: ${audit.hasWebsite ? "Provided" : "Not confirmed"}
${facts.map((fact) => `- ${fact}`).join("\n")}

## Google Business Profile Audit
${googleBusinessProfileFallback(audit, narrative)}

## Google Reviews Intelligence
${narrative.googleReviewAnalysis}

## Competitor Comparison
${narrative.competitorAnalysis}

## Who Is Winning and Why
${whoIsDoingBetterFallback(narrative)}

## Pricing and Positioning Analysis
${narrative.pricingAnalysis}

## Instagram / Social Media Analysis
${narrative.instagramAnalysis}

## Website and Conversion Analysis
${websiteConversionFallback(audit, narrative)}

## What This Business Is Doing Well
${doingWellFallback(audit, narrative)}

## Highest-Impact Growth Gaps
${growthBottlenecksFallback(narrative)}

## Recommended Quick Wins
${narrative.quickWins.map((item) => `- ${item}`).join("\n")}

## 30 / 60 / 90 Day Growth Plan
${narrative.growthPlan90.map((item) => `- ${item}`).join("\n")}

## Recommended GrowingMonk Growth System
${recommendedGrowthSystemFallback(audit, narrative)}

## Evidence and Source Links
${evidenceFallback(audit, facts)}

## Research Limitations
${limitations.map((item) => `- ${item}`).join("\n")}

## Book Your Growth Strategy Call
GrowingMonk can help convert this audit into a 30-day execution sprint focused on local visibility, trust proof, conversion flow, tracking, and demand generation.`;
}

function salesCallNotesDraft(audit: AuditRun, narrative = buildFallbackNarrative(audit)) {
  return `# Sales Call Notes: ${audit.businessName}

## Opening Insight
${narrative.executiveSummary}

## 3 Strongest Findings
${narrative.priorityFindings.slice(0, 3).map((finding) => `- ${finding.title}: ${finding.detail}`).join("\n")}

## 3 Competitor Gaps
- Confirm which nearby competitors have stronger review volume and rating consistency.
- Check which competitors present clearer services, photos, offers, and booking paths.
- Compare review themes for staff, cleanliness, price/value, wait time, and repeat-customer language.

## Best Offer To Pitch
${narrative.internalSalesBrief.suggestedOffer}

## Suggested Next Step
${narrative.internalSalesBrief.nextAction}

## Questions To Ask Client
${narrative.internalSalesBrief.discoveryQuestions.map((item) => `- ${item}`).join("\n")}`;
}

function internalBriefDraft(audit: AuditRun, narrative = buildFallbackNarrative(audit)) {
  return `# Internal Sales Brief: ${audit.businessName}

## Sales angle
${narrative.internalSalesBrief.pitchAngle}

## Likely pain points
${narrative.internalSalesBrief.likelyPainPoints.map((item) => `- ${item}`).join("\n")}

## Discovery questions
${narrative.internalSalesBrief.discoveryQuestions.map((item) => `- ${item}`).join("\n")}

## Suggested offer
${narrative.internalSalesBrief.suggestedOffer}

## Next action
${narrative.internalSalesBrief.nextAction}

## Objection handling
${narrative.internalSalesBrief.objectionHandling}

## Do not claim
${narrative.internalSalesBrief.doNotClaim.map((item) => `- ${item}`).join("\n")}`;
}

function googleBusinessProfileFallback(audit: AuditRun, narrative: CuratedAudit) {
  return `- Verified: ${audit.hasGoogleBusinessProfile ? "A Google Maps / Business Profile source was supplied for identity matching." : "No Google Maps / Business Profile source was supplied."}
- Observed: ${audit.rating ? `Visible rating is ${audit.rating}.` : "Rating was not verified in this run."} ${audit.reviewCount ? `Visible review count is ${audit.reviewCount}.` : "Review count was not verified in this run."}
- Inferred: For a ${audit.category || "local service"} business, Google Maps is a high-intent discovery surface because prospects compare rating, reviews, photos, location, call buttons, directions, and service clarity before contacting.
- Needs Manual Review: Opening hours, services, photos, Q&A, owner replies, review recency, staff mentions, cleanliness mentions, pricing mentions, and booking language should be checked before final client claims.
- Why it matters: If GBP proof is incomplete, competitors with clearer photos, stronger reviews, and easier contact paths can win the customer before the business gets a call. ${narrative.recommendations[0] || ""}`;
}

function finalizeClientReport(markdown: string, audit: AuditRun, narrative: CuratedAudit) {
  let report = markdown.trim();
  report = ensureReportSection(report, "Growth Readiness Score", growthReadinessFallback(narrative), ["Public Data Verified", "Verified Inputs", "Google Business Profile Audit"]);
  report = ensureReportSection(report, "Public Data Verified", publicDataFallback(audit, getVerifiedFacts(audit)), ["Google Business Profile Audit", "Google Reviews Intelligence"]);
  report = ensureReportSection(report, "Google Business Profile Audit", googleBusinessProfileFallback(audit, narrative), ["Google Reviews Intelligence", "Google Review Analysis"]);
  report = ensureReportSection(report, "Google Reviews Intelligence", narrative.googleReviewAnalysis, ["Competitor Comparison", "Competitor Review Comparison"]);
  report = ensureReportSection(report, "Competitor Comparison", competitorTableFallback(audit, narrative), ["Who Is Winning and Why", "Who Is Doing Better And Why"]);
  report = ensureReportSection(report, "Who Is Winning and Why", whoIsDoingBetterFallback(narrative), ["Pricing and Positioning Analysis", "Instagram / Social Media Analysis"]);
  report = ensureReportSection(report, "Pricing and Positioning Analysis", narrative.pricingAnalysis, ["Instagram / Social Media Analysis", "Website and Conversion Analysis"]);
  report = ensureReportSection(report, "Instagram / Social Media Analysis", narrative.instagramAnalysis, ["Website and Conversion Analysis", "What This Business Is Doing Well"]);
  report = ensureReportSection(report, "Website and Conversion Analysis", websiteConversionFallback(audit, narrative), ["What This Business Is Doing Well", "Highest-Impact Growth Gaps"]);
  report = ensureReportSection(report, "What This Business Is Doing Well", doingWellFallback(audit, narrative), ["Highest-Impact Growth Gaps", "Recommended Quick Wins"]);
  report = ensureReportSection(report, "Highest-Impact Growth Gaps", highestImpactGapsFallback(narrative), ["Recommended Quick Wins", "30 / 60 / 90 Day Growth Plan"]);
  report = ensureReportSection(report, "Recommended Quick Wins", narrative.quickWins.map((item) => `- ${item}`).join("\n"), ["30 / 60 / 90 Day Growth Plan", "Recommended GrowingMonk Growth System"]);
  report = ensureReportSection(report, "30 / 60 / 90 Day Growth Plan", narrative.growthPlan90.map((item) => `- ${item}`).join("\n"), ["Recommended GrowingMonk Growth System", "Evidence and Source Links"]);
  report = ensureReportSection(report, "Recommended GrowingMonk Growth System", recommendedGrowthSystemFallback(audit, narrative), ["Evidence and Source Links", "Research Limitations", "Guardrails"]);
  report = ensureReportSection(report, "Evidence and Source Links", evidenceFallback(audit, getVerifiedFacts(audit)), ["Research Limitations", "Guardrails"]);
  report = ensureReportSection(report, "Research Limitations", getLimitations(audit).map((item) => `- ${item}`).join("\n"), ["Book Your Growth Strategy Call", "Guardrails"]);
  report = ensureReportSection(report, "Book Your Growth Strategy Call", "GrowingMonk can help convert this audit into a focused execution sprint for visibility, trust, conversion, tracking, and demand generation.", []);
  return report;
}

function finalizeInternalBrief(markdown: string, audit: AuditRun) {
  return markdown.trim();
}

function ensureReportSection(markdown: string, title: string, body: string, beforeTitles: string[]) {
  if (hasMarkdownSection(markdown, title)) return markdown;
  const section = `\n\n## ${title}\n${body.trim()}\n`;
  if (!beforeTitles.length) return `${markdown.trim()}${section}`;
  const beforePattern = new RegExp(`\\n#{1,6}\\s+(?:${beforeTitles.map(escapeRegex).join("|")})\\s*\\n`, "i");
  const match = markdown.match(beforePattern);
  if (!match || match.index === undefined) return `${markdown.trim()}${section}`;
  return `${markdown.slice(0, match.index).trimEnd()}${section}${markdown.slice(match.index)}`;
}

function hasMarkdownSection(markdown: string, title: string) {
  return new RegExp(`^#{1,6}\\s+${escapeRegex(title)}\\s*$`, "im").test(markdown);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function whoIsDoingBetterFallback(narrative: CuratedAudit) {
  return `${narrative.competitorAnalysis}

- Decision rule: the competitor doing better is the one with stronger trust proof, not just a higher rating. Compare review count, recent review velocity, rating quality, staff/cleanliness mentions, photo freshness, service clarity, and how easy it is to call, WhatsApp, book, or get directions.
- If a competitor has fewer reviews but stronger recent praise, treat them as a conversion threat. If a competitor has far more reviews, treat them as a trust-volume threat and prioritize review generation.
- Do not name a winner until competitor review data is verified through Google Places or manual screenshots.`;
}

function growthReadinessFallback(narrative: CuratedAudit) {
  return `Overall Growth Readiness: ${weightedGrowthReadiness(narrative.scoreBreakdown)}/100.

${narrative.scoreBreakdown.map((score) => `- ${score.label}: ${score.value}/100. ${score.detail}`).join("\n")}

Scoring weights: Local SEO / GBP 20%, Reviews / Reputation 20%, Website / Conversion 20%, Social Content 15%, Competitor Strength 10%, Tracking / Funnel 10%, Paid Growth Readiness 5%.`;
}

function publicDataFallback(audit: AuditRun, facts: string[]) {
  return `- Verified: Business name - ${audit.businessName}
- Verified: Category - ${audit.category || "Needs review"}
- Verified: Market - ${[audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "Needs review"}
${facts.map((fact) => `- Observed: ${fact}`).join("\n")}
- Needs Manual Review: Opening hours, full services, photos, owner replies, pricing, review recency, and competitor set should be verified before final sales claims.`;
}

function competitorTableFallback(audit: AuditRun, narrative: CuratedAudit) {
  return `${narrative.competitorAnalysis}

| Business | Rating | Reviews | Strengths | Weaknesses | Why They May Be Winning |
| --- | ---: | ---: | --- | --- | --- |
| ${audit.businessName} | Needs review | Needs review | Maps identity is discoverable | Reviews, pricing, services, photos, social proof, and conversion path need verification | Has a starting local visibility base, but competitor advantage cannot be confirmed without Places/manual review |
| Nearby competitor 1 | Needs review | Needs review | Needs manual review | Needs manual review | Compare review volume, rating quality, photos, service clarity, and contact path |
| Nearby competitor 2 | Needs review | Needs review | Needs manual review | Needs manual review | Compare review velocity, staff/cleanliness mentions, pricing/value language, and Instagram proof |
| Nearby competitor 3 | Needs review | Needs review | Needs manual review | Needs manual review | Compare local SEO completeness, services, Q&A, owner replies, and booking friction |`;
}

function doingWellFallback(audit: AuditRun, narrative: CuratedAudit) {
  const sourceBase = audit.hasGoogleBusinessProfile ? "The business has a public Maps footprint, which is valuable for local salon discovery." : "The business has at least enough public-source data to begin an audit.";
  return `- ${sourceBase}
- The strongest current opportunity is not starting from zero; it is turning existing discovery surfaces into a cleaner enquiry path.
- ${narrative.clientSafeNarrative}
- If Instagram or website sources are attached, use them to convert existing proof into service-specific content, before/after examples, booking cues, and review-led trust assets.`;
}

function growthBottlenecksFallback(narrative: CuratedAudit) {
  return narrative.priorityFindings.map((finding) => `- ${finding.title}: ${finding.detail} Recommended action: ${finding.action}`).join("\n");
}

function highestImpactGapsFallback(narrative: CuratedAudit) {
  return `### Visibility Improvements
- ${narrative.recommendations[0] || "Complete Google Business Profile, local SEO, service/category, photo, and review verification."}

### Trust Improvements
- Build review generation, review replies, testimonial reuse, staff/service proof, before/after proof, and cleanliness/ambience proof.

### Conversion Improvements
- Strengthen website or landing page, WhatsApp/call CTA, booking path, service menu clarity, package/offers, contact details, and tracking.

### Social Improvements
- Improve Instagram bio, content themes, reels strategy, local/service keywords, location tags, proof content, offers, and festival/local campaigns.

### Paid Growth Readiness
- Delay heavier ad spend until proof, tracking, landing page, response ownership, and review trust are ready. Start with a controlled local offer campaign after the foundation is fixed.`;
}

function websiteConversionFallback(audit: AuditRun, narrative: CuratedAudit) {
  if (!audit.hasWebsite) {
    return `- Not Found: No owned website or landing page was verified in this audit.
- Why it matters: Google Maps and Instagram traffic need a clear place to understand services, see proof, compare pricing/packages, and contact or book without friction.
- Sales impact: Without an owned conversion asset, enquiries are harder to track and paid campaigns are less efficient.
- Recommended next step: Build a simple local conversion landing page with services, before/after proof, reviews, map/location, call and WhatsApp CTAs, booking flow, and basic tracking.`;
  }
  return `- Observed: A website was detected, but deeper conversion quality requires mobile review, CTA checks, page speed basics, service menu clarity, proof, contact form friction, and tracking validation.
- Why it matters: A reachable website is only useful if it turns local intent into calls, WhatsApp messages, bookings, or form enquiries.
- Recommended next step: Review hero clarity, service pages, local keywords, proof, pricing/service menu, call/WhatsApp buttons, thank-you events, and analytics before scaling ads.
- Consultant priority: ${narrative.recommendations.find((item) => item.toLowerCase().includes("website")) || "Run a mobile-first website and tracking audit."}`;
}

function recommendedGrowthSystemFallback(audit: AuditRun, narrative: CuratedAudit) {
  return `Recommended offer: ${narrative.internalSalesBrief.suggestedOffer}

- Month 1: Local visibility foundation for ${audit.businessName}: GBP cleanup, review response/generation, service proof, contact path fixes, and tracking setup.
- Month 2: Demand building: category-specific Instagram content, Google posts, service landing sections, WhatsApp follow-up, and offer testing.
- Month 3: Scale readiness: paid campaign test only after proof, tracking, landing page, and response ownership are in place.
- GrowingMonk role: strategy, implementation, reporting, creative direction, local SEO, conversion funnel, and disciplined follow-up system.`;
}

function evidenceFallback(audit: AuditRun, facts: string[]) {
  const links = [
    audit.sourceLinks?.googleMapsUrl ? `- Verified source: Google Maps / Business Profile - ${audit.sourceLinks.googleMapsUrl}` : "- Not Found: Google Maps source was not provided.",
    audit.sourceLinks?.website ? `- Verified source: Website - ${audit.sourceLinks.website}` : "- Not Found: Website source was not provided.",
    audit.sourceLinks?.instagramUrl ? `- Verified source: Instagram - ${audit.sourceLinks.instagramUrl}` : "- Not Found: Instagram source was not provided.",
    audit.sourceLinks?.facebookUrl ? `- Verified source: Facebook - ${audit.sourceLinks.facebookUrl}` : "",
    audit.sourceLinks?.otherPublicLink ? `- Verified source: Other public link - ${audit.sourceLinks.otherPublicLink}` : ""
  ].filter(Boolean);
  return `${links.join("\n")}

${facts.length ? facts.map((fact) => `- Observed: ${fact}`).join("\n") : "- Needs Manual Review: Add more public source links, screenshots, or API access for deeper verification."}`;
}

async function generateGeminiAuditReport(audit: AuditRun, research: PublicSourceResearch, narrative: CuratedAudit): Promise<GeneratedAuditReport> {
  const fallback = {
    clientReportMarkdown: "",
    internalBriefMarkdown: "",
    salesCallNotesMarkdown: "",
    inputTokens: estimateTokens(JSON.stringify({ audit, research, narrative })),
    outputTokens: 0,
    generation: {
      provider: "fallback" as const,
      model: env.geminiModel,
      status: "fallback_no_api_key" as const,
      generatedAt: new Date().toISOString()
    }
  };

  const prompt = buildGeminiAuditPrompt(audit, research, narrative);
  try {
    const response = await callGemini(prompt);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        ...fallback,
        generation: {
          provider: "fallback",
          model: env.geminiModel,
          status: "fallback_generation_failed",
          generatedAt: new Date().toISOString(),
          error: `Gemini returned HTTP ${response.status}${errorBody ? `: ${errorBody.slice(0, 500)}` : ""}`,
          promptVersion: "growth-os-v2-monkaudit-places-context",
          promptChars: prompt.length,
          apiStatus: String(response.status)
        }
      };
    }

    const payload = await response.json();
    const text = String(payload.candidates?.[0]?.content?.parts?.[0]?.text || "");
    const finishReason = String(payload.candidates?.[0]?.finishReason || "");
    const parsed = parseGeminiJson(text);
    const clientReportMarkdown = typeof parsed.clientReportMarkdown === "string" ? parsed.clientReportMarkdown.trim() : "";
    const internalBriefMarkdown = typeof parsed.internalBriefMarkdown === "string" ? parsed.internalBriefMarkdown.trim() : "";
    const salesCallNotesMarkdown = typeof parsed.salesCallNotesMarkdown === "string" ? parsed.salesCallNotesMarkdown.trim() : salesCallNotesDraft(audit, narrative);
    if (!clientReportMarkdown || !internalBriefMarkdown) {
      throw new Error("Gemini response did not include both report markdown fields.");
    }

    return {
      clientReportMarkdown,
      internalBriefMarkdown,
      salesCallNotesMarkdown,
      inputTokens: Number(payload.usageMetadata?.promptTokenCount || estimateTokens(prompt)),
      outputTokens: Number(payload.usageMetadata?.candidatesTokenCount || estimateTokens(clientReportMarkdown + internalBriefMarkdown + salesCallNotesMarkdown)),
      generation: {
        provider: "gemini",
        model: env.geminiModel,
        status: "gemini_generated",
        generatedAt: new Date().toISOString(),
        promptVersion: "growth-os-v2-monkaudit-places-context",
        promptChars: prompt.length,
        responseChars: text.length,
        finishReason,
        responsePreview: text.slice(0, 500)
      }
    };
  } catch (error) {
    return {
      ...fallback,
      generation: {
        provider: "fallback",
        model: env.geminiModel,
        status: "fallback_generation_failed",
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown Gemini generation failure.",
        promptVersion: "growth-os-v2-monkaudit-places-context",
        promptChars: prompt.length
      }
    };
  }
}

async function callGemini(prompt: string) {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 20000,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          clientReportMarkdown: { type: "STRING" },
          internalBriefMarkdown: { type: "STRING" },
          salesCallNotesMarkdown: { type: "STRING" }
        },
        required: ["clientReportMarkdown", "internalBriefMarkdown"]
      }
    }
  };

  const geminiApiKey = await configuredSecret(env.geminiApiKey, env.geminiApiKeySecret);
  if (geminiApiKey) {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  const projectId = await googleCloudProjectId();
  if (!projectId) {
    throw new Error("Gemini report was not generated. Set GEMINI_API_KEY or configure Google ADC with a gcloud project.");
  }

  const accessToken = await googleAdcAccessToken();
  const location = env.googleCloudLocation || "global";
  const vertexLocation = location === "asia-south1" ? "global" : location;
  const url = `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(vertexLocation)}/publishers/google/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function googleCloudProjectId() {
  if (env.googleCloudProject) return env.googleCloudProject;
  const metadataProjectId = await googleMetadataProjectId();
  if (metadataProjectId) return metadataProjectId;
  try {
    const { stdout } = await runGcloud(["config", "get-value", "project"], 8000);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function googleMetadataProjectId() {
  try {
    const response = await fetch("http://metadata.google.internal/computeMetadata/v1/project/project-id", {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return "";
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

async function googleAdcAccessToken() {
  const metadataToken = await googleMetadataAccessToken();
  if (metadataToken) return metadataToken;
  const { stdout } = await runGcloud(["auth", "application-default", "print-access-token"], 15000);
  const token = stdout.trim();
  if (!token) throw new Error("Google ADC did not return an access token. Run gcloud auth application-default login.");
  return token;
}

async function googleMetadataAccessToken() {
  try {
    const response = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return "";
    const payload = await response.json();
    return String(payload.access_token || "");
  } catch {
    return "";
  }
}

async function configuredSecret(envValue: string, secretName: string) {
  if (envValue) return envValue;
  const projectId = await googleCloudProjectId();
  if (!projectId || !secretName) return "";
  try {
    const token = await googleAdcAccessToken();
    const response = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/secrets/${encodeURIComponent(secretName)}/versions/latest:access`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return "";
    const payload = await response.json();
    return Buffer.from(String(payload.payload?.data || ""), "base64").toString("utf8").trim();
  } catch {
    return "";
  }
}

async function runGcloud(args: string[], timeout: number) {
  let lastError: unknown;
  for (const command of gcloudCommands()) {
    try {
      return await execAsync([quoteShell(command), ...args.map(quoteShell)].join(" "), { timeout });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("gcloud command failed.");
}

function gcloudCommands() {
  if (process.platform !== "win32") return ["gcloud"];
  return [
    "gcloud.cmd",
    `${process.env.LOCALAPPDATA || ""}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd`,
    `${process.env.ProgramFiles || "C:\\Program Files"}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd`
  ].filter(Boolean);
}

function quoteShell(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildGeminiAuditPrompt(audit: AuditRun, research: PublicSourceResearch, narrative: CuratedAudit) {
  const context = {
    business: {
      name: audit.businessName,
      category: audit.category,
      city: audit.city,
      area: audit.area,
      country: audit.country,
      auditMode: audit.auditMode
    },
    sourceLinks: audit.sourceLinks,
    verifiedFacts: research.verifiedFacts,
    limitations: research.limitations,
    googleReviews: research.googleReviews || null,
    competitors: research.competitors,
    competitorReviewPosition: research.competitorReviewPosition || null,
    instagram: research.instagram || null,
    websiteSignals: research.websiteSignals || null,
    deterministicConsultantNotes: narrative
  };

  return `You are a senior marketing strategist, local SEO specialist, and growth consultant preparing a deep audit for GrowingMonk.

Return ONLY valid JSON with this shape:
{
  "clientReportMarkdown": "markdown report",
  "internalBriefMarkdown": "markdown internal sales brief",
  "salesCallNotesMarkdown": "markdown sales call notes"
}

Client report requirements:
- Write a detailed, consultant-grade audit in markdown. The report must be substantial enough for a strategist to review without asking "what does this mean?"
- Include these sections exactly: Executive Summary, Growth Readiness Score, Public Data Verified, Google Business Profile Audit, Google Reviews Intelligence, Competitor Comparison, Who Is Winning and Why, Pricing and Positioning Analysis, Instagram / Social Media Analysis, Website and Conversion Analysis, What This Business Is Doing Well, Highest-Impact Growth Gaps, Recommended Quick Wins, 30 / 60 / 90 Day Growth Plan, Recommended GrowingMonk Growth System, Evidence and Source Links, Research Limitations, Book Your Growth Strategy Call.
- Use a "diagnose and fix" consulting lens: assume many clients come to GrowingMonk because some part of growth is not working. Identify what appears to be working, what appears to be underperforming or missing, what the top-rated/top-review competitors prove is possible, and what GrowingMonk should fix first.
- Do not only describe public data. Convert every major finding into a business diagnosis: likely cause, evidence, impact on enquiries/trust/conversion, and practical fix.
- For each major channel, separate: Working, Not Working / Missing, Competitor Proof, GrowingMonk Fix.
- For Growth Readiness Score, explain each score and why it matters for leads/sales. Use these weights: Local SEO / GBP 20%, Reviews / Reputation 20%, Website / Conversion 20%, Social Content 15%, Competitor Position 10%, Tracking / Funnel 10%, Paid Growth Readiness 5%.
- Label evidence carefully inside bullets where useful: Verified, Observed, Inferred, Needs Manual Review, Not Found.
- Each major section should have 2-5 detailed bullets or short paragraphs. Avoid one-line placeholders.
- For Google Reviews Intelligence, include positive themes, negative themes, repeated service keywords, staff quality, cleanliness/hygiene, pricing/value, quality, wait time, booking/communication, repeat-customer language, review recency, owner replies, reputation risk, and how review themes can become marketing copy.
- For Competitor Comparison, include a markdown table with Business, Rating, Reviews, Strengths, Weaknesses, Why They May Be Winning when competitor data exists. If not, give the exact research plan and decision criteria.
- For Who Is Winning and Why, explain stronger trust, review volume, positioning, visual/social proof, local SEO, service/category clarity, loyalty, and what this business can learn from each competitor.
- Use top-rated or highest-review competitors as benchmarks. Explain why they look more trustworthy, whether the client is losing on staff proof, service quality signal, pricing/value clarity, content/marketing, review velocity, photo quality, booking friction, or tracking.
- For Pricing and Positioning Analysis, classify budget/mid-market/premium/luxury/unclear using only evidence from reviews, menus, website, Instagram, Google photos/category, and competitors. If exact pricing is unavailable, say so.
- For Instagram / Social Media Analysis, treat Reels as a primary local demand channel. Cover reel hooks, before/after proof, staff-led content, review-led proof, local/location keywords, offers, comments/DM handling, profile CTA, posting cadence, competitor reel ideas to inspect manually, and a 30-day Reels plan.
- For Website and Conversion Analysis, cover hero clarity, services, CTA, call/WhatsApp, booking, proof, testimonials, location, mobile, pricing/menu, gallery, forms, SEO title/meta, local keywords, and tracking. If no website, explain why that hurts conversion and ads.
- For Highest-Impact Growth Gaps, group under Visibility Improvements, Trust Improvements, Conversion Improvements, Social Improvements, Paid Growth Readiness.
- For 30 / 60 / 90 Day Growth Plan, make it category-specific. A salon report must mention transformations, staff proof, ambience/hygiene proof, appointment flow, reviews, and local service demand where relevant.
- For Recommended GrowingMonk Growth System, make a practical service package recommendation that helps GrowingMonk sell a serious growth system without overclaiming.
- Be specific to the business and category.
- Use only the verified facts and supplied research context.
- If Google review details, competitor reviews, Instagram post metrics, pricing, staff, cleanliness, or address are missing, explicitly say they are not verified and explain what access/API/manual check is needed.
- Do not invent ratings, review counts, prices, competitor names, post engagement, staff quality, cleanliness, or revenue impact.
- Sound like an expert marketing and business consultant: sharp, practical, clear, and action-oriented.

Internal brief requirements:
- Include: Sales Angle, Strongest Growth Hypothesis, Discovery Questions, Data To Ask Client For, Offer Recommendation, Objection Handling, Do Not Claim.
- Add more detail than a summary: give call opener, qualification questions, proof to show, recommended next meeting agenda, and a 3-step follow-up sequence.
- Frame the sales angle around fixing what is not working: missing enquiry tracking, weak conversion path, unclear offer, low review velocity, competitor trust gap, weak Reels/social proof, website friction, or GBP/service completeness.
- Internal brief can be more direct but must not invent facts.

Sales call notes requirements:
- Include: Opening Insight, 3 Strongest Findings, 3 Competitor Gaps, Best Offer To Pitch, Suggested Next Step, Questions To Ask Client.
- Keep it short enough for a salesperson to use during a live call.

Research context:
${JSON.stringify(context, null, 2)}`;
}

function parseGeminiJson(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return {};
    return JSON.parse(match[0]);
  }
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

type PublicSourceResearch = {
  hasWebsite: boolean;
  hasWhatsApp: boolean;
  hasInstagram: boolean;
  hasGoogleBusinessProfile: boolean;
  rating: number;
  reviewCount: number;
  title?: string;
  description?: string;
  detectedEmail?: string;
  detectedPhone?: string;
  websiteSignals?: {
    title?: string;
    description?: string;
    hasBookingCue: boolean;
    hasPriceCue: boolean;
    hasServiceCue: boolean;
  };
  instagram?: {
    url: string;
    handle?: string;
    title?: string;
    description?: string;
    accessible: boolean;
    tractionSignals: string[];
    limitations: string[];
  };
  googleReviews?: {
    rating: number;
    reviewCount: number;
    priceLevel?: number;
    address?: string;
    phone?: string;
    website?: string;
    openingNow?: boolean;
    types?: string[];
    googleMapsUrl?: string;
    sampleReviewCount: number;
    sampleAverageRating?: number;
    latestReviewDate?: string;
    oldestReviewDate?: string;
    ownerResponseCount: number;
    reviewThemes: string[];
    positiveSignals: string[];
    riskSignals: string[];
    staffSignals: string[];
    cleanlinessSignals: string[];
    pricingSignals: string[];
    serviceSignals: string[];
    bookingSignals: string[];
    loyaltySignals: string[];
    sentimentSummary: string;
    reviewHealthSummary: string;
    reviewInsights: string[];
    sampleReviews: Array<{
      author?: string;
      rating?: number;
      relativeTime?: string;
      publishedAt?: string;
      text: string;
      ownerResponse?: string;
    }>;
  };
  competitors: Array<{
    name: string;
    rating: number;
    reviewCount: number;
    priceLevel?: number;
    address?: string;
    website?: string;
    phone?: string;
    googleMapsUrl?: string;
    socialSignals?: CompetitorSocialSignals;
    sampleReviewCount: number;
    sampleAverageRating?: number;
    latestReviewDate?: string;
    ownerResponseCount: number;
    reviewThemes: string[];
    whyDoingBetter: string[];
    possibleWeaknesses: string[];
    recommendedResponse: string[];
    winningFactors: string[];
    lackingFactors: string[];
    riskSignals: string[];
    sampleReviews: NonNullable<PublicSourceResearch["googleReviews"]>["sampleReviews"];
  }>;
  competitorReviewPosition?: {
    clientRating: number;
    clientReviewCount: number;
    avgCompetitorRating?: number;
    avgCompetitorReviewCount?: number;
    topCompetitorByReviews?: string;
    topCompetitorReviewCount?: number;
    topCompetitorByRating?: string;
    topCompetitorRating?: number;
    reviewVolumeGapVsAverage?: number;
    reviewVolumeGapVsTop?: number;
    ratingGapVsAverage?: number;
    summary: string;
  };
  googleProfile?: {
    businessName?: string;
    city?: string;
    country?: string;
    area?: string;
    category?: string;
    resolvedUrl?: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };
  externalApiCalls: number;
  verifiedFacts: string[];
  limitations: string[];
};

type AuditScore = {
  label: string;
  value: number;
  tone: "strong" | "good" | "gap" | "foundational";
  detail: string;
};

type CompetitorSocialSignals = {
  instagramUrl?: string;
  facebookUrl?: string;
  hasInstagram: boolean;
  hasFacebook: boolean;
  websiteMentionsReels: boolean;
  signals: string[];
  limitations: string[];
};

type AuditFinding = {
  title: string;
  detail: string;
  action: string;
};

type CuratedAudit = {
  scoreBreakdown: AuditScore[];
  executiveSummary: string;
  priorityFindings: AuditFinding[];
  recommendations: string[];
  quickWins: string[];
  googleReviewAnalysis: string;
  competitorAnalysis: string;
  instagramAnalysis: string;
  pricingAnalysis: string;
  operationsAnalysis: string;
  growthPlan: string[];
  growthPlan90: string[];
  clientSafeNarrative: string;
  internalSalesBrief: {
    pitchAngle: string;
    likelyPainPoints: string[];
    discoveryQuestions: string[];
    suggestedOffer: string;
    nextAction: string;
    objectionHandling: string;
    doNotClaim: string[];
  };
};

type GeneratedAuditReport = {
  clientReportMarkdown: string;
  internalBriefMarkdown: string;
  salesCallNotesMarkdown: string;
  inputTokens: number;
  outputTokens: number;
  generation: {
    provider: "gemini" | "fallback";
    model: string;
    status: "gemini_generated" | "fallback_no_api_key" | "fallback_generation_failed";
    generatedAt: string;
    error?: string;
    promptVersion?: string;
    promptChars?: number;
    responseChars?: number;
    finishReason?: string;
    responsePreview?: string;
    apiStatus?: string;
  };
};

async function collectPublicSourceSignals(audit: AuditRun): Promise<PublicSourceResearch> {
  const website = audit.sourceLinks?.website || "";
  const googleMapsUrl = audit.sourceLinks?.googleMapsUrl || "";
  const hasGoogleBusinessProfile = Boolean(googleMapsUrl);
  const hasInstagram = Boolean(audit.sourceLinks?.instagramUrl);
  const verifiedFacts: string[] = [];
  const limitations: string[] = [];
  let websiteHtml = "";
  let externalApiCalls = 0;
  let googleProfile: PublicSourceResearch["googleProfile"];
  let googleReviews: PublicSourceResearch["googleReviews"];
  let competitors: PublicSourceResearch["competitors"] = [];
  let competitorReviewPosition: PublicSourceResearch["competitorReviewPosition"];
  let instagram: PublicSourceResearch["instagram"];

  if (website) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(website, { signal: controller.signal, headers: { "User-Agent": "GrowingMonk MonkAudit Phase 1 audit" } });
      clearTimeout(timeout);
      externalApiCalls += 1;
      if (response.ok) {
        websiteHtml = await response.text();
        verifiedFacts.push(`Website responded with HTTP ${response.status}.`);
      } else {
        limitations.push(`Website returned HTTP ${response.status}; content could not be fully reviewed.`);
      }
    } catch {
      limitations.push("Website could not be fetched during this audit run.");
    }
  } else {
    limitations.push("No website URL was provided.");
  }

  if (hasGoogleBusinessProfile) {
    const googleResult = await resolveGoogleMapsProfile(googleMapsUrl);
    externalApiCalls += googleResult.externalApiCalls;
    googleProfile = googleResult.profile;
    verifiedFacts.push("Google Maps/Profile URL was provided for identity matching.");
    if (googleResult.profile.resolvedUrl && googleResult.profile.resolvedUrl !== googleMapsUrl) {
      verifiedFacts.push("Google Maps short link resolved successfully.");
    }
    if (googleResult.profile.businessName) {
      verifiedFacts.push(`Business name resolved from Maps link: ${googleResult.profile.businessName}.`);
    }
    if (googleResult.profile.city || googleResult.profile.area) {
      verifiedFacts.push(`Location cue resolved from Maps link: ${googleResult.profile.city || googleResult.profile.area}.`);
    }
    if (googleResult.profile.category) {
      verifiedFacts.push(`Category inferred from Maps business name: ${googleResult.profile.category}.`);
    }
    const placesProfile = {
      ...googleResult.profile,
      businessName: googleResult.profile.businessName || audit.businessName,
      city: googleResult.profile.city || audit.city,
      area: googleResult.profile.area || audit.area,
      country: googleResult.profile.country || audit.country,
      category: googleResult.profile.category || audit.category
    };
    const placesResult = await collectGooglePlacesSignals(placesProfile);
    externalApiCalls += placesResult.externalApiCalls;
    if (placesResult.googleReviews) {
      googleReviews = placesResult.googleReviews;
      googleProfile = { ...googleProfile, ...placesResult.profile };
      verifiedFacts.push(`Google rating verified through Places: ${googleReviews.rating} from ${googleReviews.reviewCount} reviews.`);
      if (googleReviews.address) verifiedFacts.push(`Google address verified: ${googleReviews.address}.`);
      if (googleReviews.phone) verifiedFacts.push("Google phone number is available through Places.");
    } else {
      limitations.push("Rating, review count, full address, staff themes, cleanliness themes, pricing, and competitor review details require Google Places API access or manual verification.");
    }
    competitors = placesResult.competitors;
    competitorReviewPosition = placesResult.competitorReviewPosition;
    placesResult.limitations.forEach((item) => limitations.push(item));
    if (competitors.length) {
      verifiedFacts.push(`${competitors.length} local competitors were compared through Google Places.`);
    }
  } else {
    limitations.push("No Google Maps/Profile URL was provided.");
  }
  if (hasInstagram) {
    instagram = await collectInstagramSignals(audit.sourceLinks?.instagramUrl || "");
    externalApiCalls += instagram.accessible ? 1 : 0;
    verifiedFacts.push("Instagram URL was provided as a public social source.");
    if (instagram.title || instagram.description) verifiedFacts.push("Instagram public profile metadata was readable.");
    instagram.limitations.forEach((item) => limitations.push(item));
  }

  const title = extractFirst(websiteHtml, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extractFirst(websiteHtml, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const detectedEmail = extractFirst(websiteHtml, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const detectedPhone = extractFirst(websiteHtml, /(?:\+?\d[\d\s().-]{7,}\d)/);
  const hasWhatsApp = /wa\.me|whatsapp|api\.whatsapp/i.test(websiteHtml) || /wa\.me|whatsapp/i.test(audit.sourceLinks?.otherPublicLink || "");

  if (title) verifiedFacts.push(`Website title found: ${cleanText(title)}.`);
  if (description) verifiedFacts.push("Website meta description is present.");
  if (detectedEmail) verifiedFacts.push("Public email/contact pattern found on website.");
  if (detectedPhone) verifiedFacts.push("Public phone/contact pattern found on website.");
  if (hasWhatsApp) verifiedFacts.push("WhatsApp contact path appears to be present.");
  const websiteSignals = {
    title: title ? cleanText(title) : undefined,
    description: description ? cleanText(description) : undefined,
    hasBookingCue: /book|appointment|reserve|schedule/i.test(websiteHtml),
    hasPriceCue: /price|pricing|₹|rs\.?|inr|cost|package/i.test(websiteHtml),
    hasServiceCue: /service|hair|salon|beauty|spa|treatment|makeup|styling/i.test(websiteHtml)
  };

  return {
    hasWebsite: Boolean(website && websiteHtml),
    hasWhatsApp,
    hasInstagram,
    hasGoogleBusinessProfile,
    rating: googleReviews?.rating || 0,
    reviewCount: googleReviews?.reviewCount || 0,
    title: title ? cleanText(title) : undefined,
    description: description ? cleanText(description) : undefined,
    detectedEmail: detectedEmail ? cleanText(detectedEmail) : undefined,
    detectedPhone: detectedPhone ? cleanText(detectedPhone) : undefined,
    websiteSignals,
    instagram,
    googleReviews,
    competitors,
    competitorReviewPosition,
    googleProfile,
    externalApiCalls,
    verifiedFacts,
    limitations
  };
}

function applyDiscoveredIdentity(audit: AuditRun, research: PublicSourceResearch): AuditRun {
  const profile = research.googleProfile || {};
  return {
    ...audit,
    businessName: chooseDiscoveredValue(audit.businessName, profile.businessName, "Prospect from public source"),
    city: chooseDiscoveredValue(audit.city, profile.city, "Unknown"),
    country: chooseDiscoveredValue(audit.country, profile.country, "Unknown"),
    area: chooseDiscoveredValue(audit.area, profile.area, ""),
    category: chooseDiscoveredValue(audit.category, profile.category, "Unknown"),
    sourceLinks: {
      ...audit.sourceLinks,
      googleMapsUrl: profile.resolvedUrl || audit.sourceLinks?.googleMapsUrl || ""
    }
  };
}

function chooseDiscoveredValue(current: string, discovered: string | undefined, placeholder: string) {
  const trimmed = discovered?.trim();
  if (trimmed && (!current || current === placeholder)) return trimmed;
  return current;
}

async function resolveGoogleMapsProfile(googleMapsUrl: string): Promise<{
  profile: NonNullable<PublicSourceResearch["googleProfile"]>;
  externalApiCalls: number;
}> {
  let resolvedUrl = googleMapsUrl;
  let externalApiCalls = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(googleMapsUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "GrowingMonk MonkAudit public-source audit" }
    });
    clearTimeout(timeout);
    externalApiCalls += 1;
    resolvedUrl = response.url || googleMapsUrl;
  } catch {
    return { profile: parseGoogleMapsIdentity(googleMapsUrl, googleMapsUrl), externalApiCalls };
  }

  return { profile: parseGoogleMapsIdentity(resolvedUrl, googleMapsUrl), externalApiCalls };
}

function parseGoogleMapsIdentity(value: string, originalUrl: string): NonNullable<PublicSourceResearch["googleProfile"]> {
  const profile: NonNullable<PublicSourceResearch["googleProfile"]> = { resolvedUrl: value || originalUrl };
  const candidate = extractGoogleBusinessQuery(value) || extractGoogleBusinessQuery(originalUrl);
  const parsed = splitBusinessAndLocation(candidate);
  profile.businessName = parsed.businessName;
  profile.city = parsed.location;
  profile.area = parsed.location;
  profile.category = inferCategory(parsed.businessName);
  return profile;
}

function extractGoogleBusinessQuery(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const queryName = url.searchParams.get("q") || url.searchParams.get("query");
    if (queryName) return cleanGoogleValue(queryName);
    const placeIndex = url.pathname.toLowerCase().indexOf("/place/");
    if (placeIndex >= 0) return cleanGoogleValue(decodeURIComponent(url.pathname.slice(placeIndex + 7).split("/")[0] || ""));
  } catch {
    return "";
  }
  return "";
}

function splitBusinessAndLocation(value: string) {
  const normalized = cleanGoogleValue(value);
  const parts = normalized.split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    businessName: parts[0] || normalized,
    location: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

function cleanGoogleValue(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/[+_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(value?: string) {
  const name = (value || "").toLowerCase();
  if (!name) return "";
  if (/\bsalon|hair|beauty|spa\b/.test(name)) return "Salon";
  if (/\bdental|dentist|orthodont/i.test(name)) return "Dental Clinic";
  if (/\bclinic|hospital|care\b/.test(name)) return "Healthcare";
  if (/\bcafe|coffee|restaurant|kitchen|bakery\b/.test(name)) return "Restaurant / Cafe";
  if (/\binterior|design|architect\b/.test(name)) return "Interior Design";
  return "";
}

function inferCategoryFromTypes(types: string[] = []) {
  if (types.some((type) => ["beauty_salon", "hair_care", "spa"].includes(type))) return "Salon / Beauty";
  if (types.some((type) => ["restaurant", "cafe", "meal_takeaway", "bakery"].includes(type))) return "Restaurant / Cafe";
  if (types.some((type) => ["dentist", "doctor", "hospital", "physiotherapist"].includes(type))) return "Clinic / Wellness";
  if (types.includes("gym")) return "Gym / Fitness";
  if (types.includes("laundry")) return "Laundry / Dry Cleaning";
  return "";
}

function competitorKeyword(category: string) {
  const normalized = category.trim();
  return nicheQueryByCategory[normalized] || normalized.toLowerCase().replace(/\s*\/\s*/g, " ").trim();
}

function bestPlaceCandidate(candidates: PlaceSearchResult[], businessName: string) {
  if (!candidates.length) return undefined;
  return candidates
    .slice()
    .sort((a, b) => placeMatchScore(b, businessName) - placeMatchScore(a, businessName))[0];
}

function placeMatchScore(place: PlaceSearchResult, businessName: string) {
  const nameSimilarity = stringSimilarity(place.name || "", businessName);
  const reviewSignal = Math.min(Number(place.user_ratings_total || 0), 500) / 500;
  const ratingSignal = Number(place.rating || 0) / 5;
  return nameSimilarity * 10 + ratingSignal + reviewSignal;
}

function looksLikeSameBusiness(a: string, b: string) {
  return stringSimilarity(a, b) >= 0.72;
}

function stringSimilarity(a: string, b: string) {
  const left = normalizeComparableText(a);
  const right = normalizeComparableText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const overlap = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size, 1);
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(the|and|at|in|by)\b/g, " ").replace(/\s+/g, " ").trim();
}

async function collectGooglePlacesSignals(profile: NonNullable<PublicSourceResearch["googleProfile"]>): Promise<{
  profile: NonNullable<PublicSourceResearch["googleProfile"]>;
  googleReviews?: PublicSourceResearch["googleReviews"];
  competitors: PublicSourceResearch["competitors"];
  competitorReviewPosition?: PublicSourceResearch["competitorReviewPosition"];
  limitations: string[];
  externalApiCalls: number;
}> {
  const apiKey = await configuredSecret(env.googleMapsApiKey, env.googleMapsApiKeySecret);
  if (!apiKey) {
    return { profile, competitors: [], limitations: ["Google Places was not run because GOOGLE_MAPS_API_KEY or google-maps-api-key Secret Manager value is not configured."], externalApiCalls: 0 };
  }
  if (!profile.businessName) {
    return { profile, competitors: [], limitations: ["Google Places was not run because the business name could not be parsed from the supplied source."], externalApiCalls: 0 };
  }

  let externalApiCalls = 0;
  const limitations: string[] = [];
  const query = [profile.businessName, profile.area || profile.city].filter(Boolean).join(" ");
  const placeSearch = await fetchPlacesJson("https://maps.googleapis.com/maps/api/place/textsearch/json", { query }, apiKey);
  externalApiCalls += 1;
  if (placeSearch.error) limitations.push(placeSearch.error);
  const candidates = Array.isArray(placeSearch.results) ? placeSearch.results : [];
  const candidate = bestPlaceCandidate(candidates, profile.businessName);
  if (!candidate?.place_id) {
    limitations.push(`Google Places text search found no match for "${query}".`);
    return { profile, competitors: [], limitations, externalApiCalls };
  }

  const details = await fetchPlaceDetails(candidate.place_id, apiKey);
  externalApiCalls += 1;
  if (details.error) limitations.push(details.error);
  const location = details.geometry?.location || candidate.geometry?.location;
  const types = details.types || candidate.types || [];
  const nextProfile = {
    ...profile,
    businessName: details.name || candidate.name || profile.businessName,
    category: profile.category || inferCategoryFromTypes(types) || inferCategory(details.name || candidate.name || profile.businessName),
    resolvedUrl: details.url || profile.resolvedUrl,
    placeId: candidate.place_id,
    lat: location?.lat,
    lng: location?.lng
  };
  const googleReviews = placeToReviewSignals(details);
  const competitors = location
    ? await collectCompetitors({
        auditName: nextProfile.businessName || profile.businessName,
        category: nextProfile.category || "local service",
        lat: location.lat,
        lng: location.lng,
        ownPlaceId: candidate.place_id,
        apiKey
      })
    : [];
  externalApiCalls += location ? 2 + competitors.length : 0;
  const competitorReviewPosition = compareReviewPosition(googleReviews, competitors);

  if (!location) limitations.push("Google Places details did not include coordinates, so nearby competitors could not be pulled.");
  return { profile: nextProfile, googleReviews, competitors, competitorReviewPosition, limitations, externalApiCalls };
}

async function collectCompetitors(input: { auditName: string; category: string; lat: number; lng: number; ownPlaceId: string; apiKey: string }): Promise<PublicSourceResearch["competitors"]> {
  const keyword = competitorKeyword(input.category);
  if (!keyword) return [];
  const nearby = await fetchPlacesJson("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
    location: `${input.lat},${input.lng}`,
    radius: "3000",
    keyword
  }, input.apiKey);
  const results = (nearby.results || [])
    .filter((place: PlaceSearchResult) => place.place_id && place.place_id !== input.ownPlaceId)
    .filter((place: PlaceSearchResult) => !looksLikeSameBusiness(place.name || "", input.auditName))
    .sort((a: PlaceSearchResult, b: PlaceSearchResult) => competitorStrength(b) - competitorStrength(a))
    .slice(0, 5);

  const competitors: PublicSourceResearch["competitors"] = [];
  for (const result of results) {
    const details = await fetchPlaceDetails(result.place_id, input.apiKey);
    const signals = placeToReviewSignals(details);
    const socialSignals = await collectCompetitorSocialSignals(signals.website);
    competitors.push({
      name: details.name || result.name || "Local competitor",
      rating: signals.rating,
      reviewCount: signals.reviewCount,
      priceLevel: signals.priceLevel,
      address: signals.address,
      website: signals.website,
      phone: signals.phone,
      googleMapsUrl: details.url,
      socialSignals,
      sampleReviewCount: signals.sampleReviewCount,
      sampleAverageRating: signals.sampleAverageRating,
      latestReviewDate: signals.latestReviewDate,
      ownerResponseCount: signals.ownerResponseCount,
      reviewThemes: signals.reviewThemes,
      whyDoingBetter: competitorAdvantages(signals),
      possibleWeaknesses: competitorWeaknesses(signals),
      recommendedResponse: competitorResponseActions(signals),
      winningFactors: competitorWinningFactors(signals, socialSignals),
      lackingFactors: competitorLackingFactors(signals, socialSignals),
      sampleReviews: signals.sampleReviews,
      riskSignals: signals.riskSignals
    });
  }
  return competitors;
}

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  return fetchPlacesJson("https://maps.googleapis.com/maps/api/place/details/json", {
    place_id: placeId,
    fields: placeDetailsFields,
    reviews_sort: "newest"
  }, apiKey).then((payload) => payload.result || { error: payload.error });
}

async function fetchPlacesJson(url: string, params: Record<string, string>, apiKey: string) {
  const search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`${url}?${search.toString()}`, {
    headers: { "User-Agent": "GrowingMonk MonkAudit Places audit" }
  });
  if (!response.ok) return { error: `Google Places returned HTTP ${response.status}.` };
  const payload = await response.json();
  if (payload.status && !["OK", "ZERO_RESULTS"].includes(payload.status)) {
    return { ...payload, error: payload.error_message || `Google Places returned status ${payload.status}.` };
  }
  return payload;
}

function placeToReviewSignals(place: PlaceDetails): NonNullable<PublicSourceResearch["googleReviews"]> {
  const rawReviews = place.reviews || [];
  const sampleReviews = rawReviews
    .map((review) => ({
      author: review.author_name,
      rating: typeof review.rating === "number" ? review.rating : undefined,
      relativeTime: review.relative_time_description,
      publishedAt: typeof review.time === "number" ? new Date(review.time * 1000).toISOString() : undefined,
      text: cleanReviewText(review.text || ""),
      ownerResponse: cleanReviewText(review.review_response?.text || "")
    }))
    .filter((review) => review.text);
  const reviewTexts = sampleReviews.map((review) => review.text);
  const reviewRatings = sampleReviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === "number");
  const reviewDates = sampleReviews.map((review) => review.publishedAt).filter((date): date is string => Boolean(date)).sort();
  const sampleAverageRating = reviewRatings.length ? roundTo(reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length, 2) : undefined;
  const rating = Number(place.rating || 0);
  const reviewCount = Number(place.user_ratings_total || 0);
  const positiveSignals = matchThemes(reviewTexts, positiveReviewTerms);
  const riskSignals = matchThemes(reviewTexts, negativeReviewTerms);
  const staffSignals = matchThemes(reviewTexts, staffReviewTerms);
  const cleanlinessSignals = matchThemes(reviewTexts, cleanlinessReviewTerms);
  const pricingSignals = matchThemes(reviewTexts, pricingReviewTerms);
  const serviceSignals = matchThemes(reviewTexts, serviceReviewTerms);
  const bookingSignals = matchThemes(reviewTexts, bookingReviewTerms);
  const loyaltySignals = matchThemes(reviewTexts, loyaltyReviewTerms);
  const ownerResponseCount = sampleReviews.filter((review) => review.ownerResponse).length;
  return {
    rating,
    reviewCount,
    priceLevel: typeof place.price_level === "number" ? place.price_level : undefined,
    address: place.formatted_address,
    phone: place.formatted_phone_number,
    website: place.website,
    openingNow: place.opening_hours?.open_now,
    types: place.types || [],
    googleMapsUrl: place.url,
    sampleReviewCount: sampleReviews.length,
    sampleAverageRating,
    latestReviewDate: reviewDates[reviewDates.length - 1],
    oldestReviewDate: reviewDates[0],
    ownerResponseCount,
    reviewThemes: reviewThemes(reviewTexts),
    positiveSignals,
    riskSignals,
    staffSignals,
    cleanlinessSignals,
    pricingSignals,
    serviceSignals,
    bookingSignals,
    loyaltySignals,
    sentimentSummary: reviewSentimentSummary(sampleReviews),
    reviewHealthSummary: reviewHealthSummary({
      rating: Number(place.rating || 0),
      reviewCount: Number(place.user_ratings_total || 0),
      sampleAverageRating,
      sampleReviewCount: sampleReviews.length,
      latestReviewDate: reviewDates[reviewDates.length - 1],
      ownerResponseCount,
      riskSignals
    }),
    reviewInsights: reviewInsights({
      positiveSignals,
      riskSignals,
      staffSignals,
      cleanlinessSignals,
      pricingSignals,
      serviceSignals,
      bookingSignals,
      loyaltySignals,
      sampleReviews
    }),
    sampleReviews: sampleReviews.slice(0, 5)
  };
}

function competitorStrength(place: PlaceSearchResult) {
  return Number(place.rating || 0) * 100 + Math.min(Number(place.user_ratings_total || 0), 500);
}

function competitorAdvantages(signals: NonNullable<PublicSourceResearch["googleReviews"]>) {
  const advantages: string[] = [];
  if (signals.rating >= 4.5) advantages.push("Higher visible rating creates stronger first-click trust.");
  if (signals.reviewCount >= 100) advantages.push("Larger review base gives stronger social proof.");
  if (signals.latestReviewDate) advantages.push(`Recent public review sample includes activity from ${formatReviewDate(signals.latestReviewDate)}.`);
  if (signals.ownerResponseCount > 0) advantages.push("Owner responses are visible in the fetched review sample.");
  if (signals.positiveSignals.length) advantages.push(`Positive review themes mention ${signals.positiveSignals.slice(0, 2).join(" and ")}.`);
  if (signals.staffSignals.length) advantages.push(`Staff/service experience is reinforced by ${signals.staffSignals.slice(0, 2).join(" and ")} mentions.`);
  if (signals.priceLevel !== undefined) advantages.push(`Visible price level helps customers benchmark expectations.`);
  return advantages.length ? advantages : ["Competitor has visible Maps presence but needs manual review for exact advantage."];
}

function competitorWeaknesses(signals: NonNullable<PublicSourceResearch["googleReviews"]>) {
  const weaknesses: string[] = [];
  if (!signals.website) weaknesses.push("Website was not returned in Places details.");
  if (!signals.phone) weaknesses.push("Phone was not returned in Places details.");
  if (signals.rating && signals.rating < 4.3) weaknesses.push("Visible rating is below a strong local trust threshold.");
  if (signals.reviewCount < 100) weaknesses.push("Review volume is not yet deep enough to dominate social proof.");
  if (signals.riskSignals.length) weaknesses.push(`Fetched reviews include risk themes around ${signals.riskSignals.slice(0, 3).join(", ")}.`);
  if (!signals.ownerResponseCount && signals.sampleReviewCount) weaknesses.push("No owner responses were visible in the fetched review sample.");
  return weaknesses.length ? weaknesses : ["No obvious weakness from the limited Places sample; verify photos, services, and owner replies manually."];
}

function competitorResponseActions(signals: NonNullable<PublicSourceResearch["googleReviews"]>) {
  const actions: string[] = [];
  if (signals.reviewCount >= 100) actions.push("Match review velocity with a systematic review request flow after appointments.");
  if (signals.rating >= 4.5) actions.push("Protect rating quality by replying to reviews and fixing recurring service-friction themes.");
  if (signals.staffSignals.length) actions.push("Turn staff/stylist praise into service-page proof and Instagram captions.");
  if (signals.cleanlinessSignals.length) actions.push("Show hygiene, ambience, and store experience proof in GBP photos and reels.");
  if (signals.pricingSignals.length) actions.push("Make packages and value cues clearer before prospects compare price elsewhere.");
  if (!actions.length) actions.push("Use this competitor as a benchmark for GBP completeness, photos, service clarity, and contact ease.");
  return actions;
}

function competitorWinningFactors(signals: NonNullable<PublicSourceResearch["googleReviews"]>, social: CompetitorSocialSignals) {
  const factors: string[] = [];
  if (signals.reviewCount >= 1000) factors.push("review volume");
  else if (signals.reviewCount >= 300) factors.push("solid review base");
  if (signals.rating >= 4.7) factors.push("high rating quality");
  if (signals.staffSignals.length) factors.push("staff proof");
  if (signals.serviceSignals.length) factors.push("service-specific proof");
  if (signals.cleanlinessSignals.length) factors.push("store/hygiene proof");
  if (signals.ownerResponseCount > 0) factors.push("review response discipline");
  if (social.hasInstagram) factors.push("visible Instagram/social path");
  if (social.websiteMentionsReels) factors.push("Reels/social proof emphasis");
  return factors.length ? factors : ["basic Maps visibility"];
}

function competitorLackingFactors(signals: NonNullable<PublicSourceResearch["googleReviews"]>, social: CompetitorSocialSignals) {
  const factors: string[] = [];
  if (!signals.website) factors.push("website not found in Places");
  if (!signals.phone) factors.push("phone not found in Places");
  if (!social.hasInstagram) factors.push("Instagram not found from website scan");
  if (signals.reviewCount < 150) factors.push("thin review volume");
  if (signals.rating < 4.4) factors.push("rating trust gap");
  if (signals.riskSignals.length) factors.push(`review friction: ${signals.riskSignals.slice(0, 2).join(", ")}`);
  if (!signals.ownerResponseCount && signals.sampleReviewCount) factors.push("no owner replies in fetched sample");
  return factors.length ? factors : ["weakness not obvious from public sample"];
}

async function collectCompetitorSocialSignals(website?: string): Promise<CompetitorSocialSignals> {
  const empty: CompetitorSocialSignals = {
    hasInstagram: false,
    hasFacebook: false,
    websiteMentionsReels: false,
    signals: [],
    limitations: []
  };
  if (!website) {
    return { ...empty, limitations: ["Competitor website was not available from Places, so social links could not be scanned."] };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(website, {
      signal: controller.signal,
      headers: { "User-Agent": "GrowingMonk MonkAudit competitor social scan" }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return { ...empty, limitations: [`Competitor website returned HTTP ${response.status}; social scan skipped.`] };
    }
    const html = await response.text();
    const instagramUrl = extractSocialUrl(html, /https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<>]+/i);
    const facebookUrl = extractSocialUrl(html, /https?:\/\/(?:www\.)?facebook\.com\/[^"'\s<>]+/i);
    const websiteMentionsReels = /reels?|instagram|before\s*after|transformation|shorts/i.test(html);
    const signals = [
      instagramUrl ? "Instagram link found on website." : "",
      facebookUrl ? "Facebook link found on website." : "",
      websiteMentionsReels ? "Website copy references social/video/transformation proof cues." : ""
    ].filter(Boolean);
    return {
      instagramUrl,
      facebookUrl,
      hasInstagram: Boolean(instagramUrl),
      hasFacebook: Boolean(facebookUrl),
      websiteMentionsReels,
      signals: signals.length ? signals : ["No strong social proof cue found on competitor website scan."],
      limitations: ["Social scan is limited to public website HTML; Instagram post/reel metrics need manual review or API access."]
    };
  } catch {
    return { ...empty, limitations: ["Competitor website could not be fetched for social scan."] };
  }
}

function extractSocialUrl(html: string, pattern: RegExp) {
  const match = html.match(pattern)?.[0];
  return match ? match.replace(/[),.]+$/, "") : undefined;
}

async function collectInstagramSignals(url: string): Promise<NonNullable<PublicSourceResearch["instagram"]>> {
  const handle = instagramHandle(url);
  const result: NonNullable<PublicSourceResearch["instagram"]> = {
    url,
    handle,
    accessible: false,
    tractionSignals: [],
    limitations: []
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 GrowingMonk MonkAudit Instagram audit" }
    });
    clearTimeout(timeout);
    const html = await response.text();
    result.accessible = response.ok;
    result.title = cleanText(extractMeta(html, "og:title") || "");
    result.description = cleanText(extractMeta(html, "og:description") || "");
    result.tractionSignals = instagramTractionSignals(result.description || "");
    if (!result.tractionSignals.length) {
      result.tractionSignals.push("Post-level engagement requires Instagram Graph API, creator access, or manual review of recent posts.");
    }
  } catch {
    result.limitations.push("Instagram profile could not be fetched publicly; post-level traction requires Instagram access or manual review.");
  }
  if (result.accessible) {
    result.limitations.push("Instagram public metadata was checked, but individual posts, reels, reach, saves, shares, and comments require Instagram API access or manual review.");
  }
  return result;
}

function instagramHandle(value: string) {
  try {
    return new URL(value).pathname.split("/").filter(Boolean)[0];
  } catch {
    return "";
  }
}

function extractMeta(html: string, property: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return extractFirst(html, pattern);
}

function instagramTractionSignals(description: string) {
  const signals: string[] = [];
  if (/\d+\s+followers/i.test(description)) signals.push("Follower count is visible in public profile metadata.");
  if (/reel|video/i.test(description)) signals.push("Reels/video appear in the profile metadata and should be checked for traction.");
  if (/hair|beauty|salon|makeup|style/i.test(description)) signals.push("Beauty/service keywords are visible in profile metadata.");
  return signals;
}

type PlaceSearchResult = {
  place_id: string;
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
};

type PlaceDetails = PlaceSearchResult & {
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  price_level?: number;
  business_status?: string;
  opening_hours?: { open_now?: boolean };
  geometry?: { location?: { lat: number; lng: number } };
  reviews?: Array<{
    author_name?: string;
    rating?: number;
    relative_time_description?: string;
    time?: number;
    text?: string;
    review_response?: { text?: string };
  }>;
};

const positiveReviewTerms = ["good service", "great service", "professional", "friendly", "best", "excellent", "satisfied", "recommend", "nice experience"];
const negativeReviewTerms = ["bad", "rude", "delay", "waiting", "expensive", "overpriced", "dirty", "unprofessional", "poor", "worst"];
const staffReviewTerms = ["staff", "stylist", "hairdresser", "manager", "professional", "friendly", "rude", "polite"];
const cleanlinessReviewTerms = ["clean", "hygiene", "hygienic", "dirty", "neat", "sanitized", "washroom"];
const pricingReviewTerms = ["price", "pricing", "expensive", "affordable", "cost", "worth", "value", "overpriced"];
const serviceReviewTerms = ["haircut", "hair cut", "hair color", "colour", "keratin", "facial", "makeup", "bridal", "spa", "manicure", "pedicure", "smoothening", "straightening", "beard", "styling"];
const bookingReviewTerms = ["appointment", "booking", "walk in", "wait", "waiting", "queue", "time", "delay", "late"];
const loyaltyReviewTerms = ["again", "regular", "always", "every time", "repeat", "years", "visit again", "recommended"];

function reviewThemes(reviews: string[]) {
  const themes = [
    ...matchThemes(reviews, positiveReviewTerms),
    ...matchThemes(reviews, staffReviewTerms),
    ...matchThemes(reviews, cleanlinessReviewTerms),
    ...matchThemes(reviews, pricingReviewTerms),
    ...matchThemes(reviews, serviceReviewTerms),
    ...matchThemes(reviews, bookingReviewTerms),
    ...matchThemes(reviews, loyaltyReviewTerms)
  ];
  return Array.from(new Set(themes)).slice(0, 8);
}

function matchThemes(reviews: string[], terms: string[]) {
  const text = reviews.join(" ").toLowerCase();
  return terms.filter((term) => text.includes(term)).slice(0, 5);
}

function reviewSentimentSummary(reviews: NonNullable<PublicSourceResearch["googleReviews"]>["sampleReviews"]) {
  if (!reviews.length) return "Google Places returned no public review text sample; use rating and review count only.";
  const positive = reviews.filter((review) => (review.rating || 0) >= 4).length;
  const neutral = reviews.filter((review) => (review.rating || 0) === 3).length;
  const negative = reviews.filter((review) => review.rating && review.rating <= 2).length;
  return `${positive} positive, ${neutral} neutral, and ${negative} negative reviews in the fetched public sample.`;
}

function reviewHealthSummary(input: {
  rating: number;
  reviewCount: number;
  sampleAverageRating?: number;
  sampleReviewCount: number;
  latestReviewDate?: string;
  ownerResponseCount: number;
  riskSignals: string[];
}) {
  const parts = [
    input.rating ? `visible rating ${input.rating}` : "rating not visible",
    `${input.reviewCount || 0} total visible reviews`,
    input.sampleAverageRating ? `sample average ${input.sampleAverageRating}` : "sample average not available",
    input.latestReviewDate ? `latest fetched review ${formatReviewDate(input.latestReviewDate)}` : "review recency not available",
    `${input.ownerResponseCount}/${input.sampleReviewCount} fetched reviews show owner responses`
  ];
  if (input.riskSignals.length) parts.push(`risk themes: ${input.riskSignals.slice(0, 3).join(", ")}`);
  return parts.join("; ");
}

function reviewInsights(input: {
  positiveSignals: string[];
  riskSignals: string[];
  staffSignals: string[];
  cleanlinessSignals: string[];
  pricingSignals: string[];
  serviceSignals: string[];
  bookingSignals: string[];
  loyaltySignals: string[];
  sampleReviews: NonNullable<PublicSourceResearch["googleReviews"]>["sampleReviews"];
}) {
  const insights: string[] = [];
  const datedReviews = input.sampleReviews
    .filter((review) => review.publishedAt)
    .map((review) => ({ ...review, date: new Date(review.publishedAt || "") }))
    .filter((review) => Number.isFinite(review.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const positiveDated = datedReviews.filter((review) => (review.rating || 0) >= 4);
  const latest = datedReviews[datedReviews.length - 1];
  const gaps = datedReviews.slice(1).map((review, index) => Math.round((review.date.getTime() - datedReviews[index].date.getTime()) / 86400000));
  const averageGap = gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : 0;
  const peopleSignals = input.staffSignals.filter((signal) => signal !== "staff");
  if (input.positiveSignals.length) insights.push(`Use positive review language as proof in sales and content: ${input.positiveSignals.slice(0, 3).join(", ")}.`);
  if (datedReviews.length) insights.push(`Review history sample: ${positiveDated.length}/${datedReviews.length} dated fetched reviews are positive; latest fetched review is ${formatReviewDate(latest.publishedAt || "")}${averageGap ? `; average gap inside sample is about ${averageGap} days` : ""}.`);
  if (input.serviceSignals.length) insights.push(`Service demand is visible for: ${input.serviceSignals.slice(0, 4).join(", ")}.`);
  if (peopleSignals.length) insights.push(`People proof appears in reviews around: ${peopleSignals.slice(0, 3).join(", ")}.`);
  if (input.cleanlinessSignals.length) insights.push(`Store experience and hygiene proof appears around: ${input.cleanlinessSignals.slice(0, 3).join(", ")}.`);
  if (input.pricingSignals.length) insights.push(`Handle pricing/value carefully because reviews mention: ${input.pricingSignals.slice(0, 3).join(", ")}.`);
  if (input.bookingSignals.length) insights.push(`Booking or wait-time language appears around: ${input.bookingSignals.slice(0, 3).join(", ")}.`);
  if (input.loyaltySignals.length) insights.push(`Repeat-customer proof appears through: ${input.loyaltySignals.slice(0, 3).join(", ")}.`);
  if (input.riskSignals.length) insights.push(`Operational risk themes to review manually: ${input.riskSignals.slice(0, 4).join(", ")}.`);
  return insights.length ? insights : ["The fetched public review sample is too small or generic for strong theme claims."];
}

function compareReviewPosition(
  own: NonNullable<PublicSourceResearch["googleReviews"]>,
  competitors: PublicSourceResearch["competitors"]
): NonNullable<PublicSourceResearch["competitorReviewPosition"]> {
  const ratings = competitors.map((competitor) => competitor.rating).filter((value) => value > 0);
  const reviewCounts = competitors.map((competitor) => competitor.reviewCount).filter((value) => value >= 0);
  const avgRating = ratings.length ? roundTo(ratings.reduce((sum, value) => sum + value, 0) / ratings.length, 2) : undefined;
  const avgReviewCount = reviewCounts.length ? roundTo(reviewCounts.reduce((sum, value) => sum + value, 0) / reviewCounts.length, 1) : undefined;
  const topByReviews = competitors.slice().sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))[0];
  const topByRating = competitors.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const reviewVolumeGapVsAverage = avgReviewCount !== undefined ? roundTo(avgReviewCount - own.reviewCount, 1) : undefined;
  const reviewVolumeGapVsTop = topByReviews ? Math.max(0, (topByReviews.reviewCount || 0) - own.reviewCount) : undefined;
  const ratingGapVsAverage = avgRating !== undefined ? roundTo(avgRating - own.rating, 2) : undefined;
  const summary = avgReviewCount === undefined
    ? "Competitor review data is limited, so local trust position needs manual review."
    : reviewVolumeGapVsAverage && reviewVolumeGapVsAverage > 0
      ? "The business appears to have a visible review-volume gap versus the sampled nearby competitors."
      : "The business does not appear behind the sampled competitors on visible review volume.";
  return {
    clientRating: own.rating,
    clientReviewCount: own.reviewCount,
    avgCompetitorRating: avgRating,
    avgCompetitorReviewCount: avgReviewCount,
    topCompetitorByReviews: topByReviews?.name,
    topCompetitorReviewCount: topByReviews?.reviewCount,
    topCompetitorByRating: topByRating?.name,
    topCompetitorRating: topByRating?.rating,
    reviewVolumeGapVsAverage,
    reviewVolumeGapVsTop,
    ratingGapVsAverage,
    summary
  };
}

function formatReviewDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function cleanReviewText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

function buildScoreBreakdown(audit: AuditRun, research: PublicSourceResearch): AuditScore[] {
  const websiteConversion = scoreFrom([
    research.hasWebsite,
    Boolean(research.title),
    Boolean(research.description),
    Boolean(research.detectedPhone || research.detectedEmail),
    research.hasWhatsApp
  ]);
  const localSeo = scoreFrom([research.hasGoogleBusinessProfile, audit.city !== "Unknown", audit.category !== "Unknown", research.reviewCount > 0]);
  const reputation = research.reviewCount > 0 ? Math.min(90, 45 + Math.round(research.reviewCount / 10)) : research.hasGoogleBusinessProfile ? 45 : 25;
  const socialContent = research.hasInstagram ? 55 : 30;
  const competitorStrength = research.competitors.length ? Math.max(25, Math.min(85, 70 - Math.round(reviewGap(research) / 50))) : 30;
  const tracking = research.hasWebsite ? 40 : 20;
  const paidReadiness = scoreFrom([research.hasWebsite, Boolean(research.detectedPhone || research.hasWhatsApp), research.reviewCount > 0, research.hasInstagram]);
  return [
    { label: "Google Business Profile / Local SEO", value: localSeo, tone: toneFor(localSeo), detail: research.hasGoogleBusinessProfile ? "Maps profile source is available, but richer GBP metrics need Places access." : "No Google profile source was provided." },
    { label: "Reviews / Reputation", value: reputation, tone: toneFor(reputation), detail: research.reviewCount > 0 ? "Review volume was available for directional reputation scoring; review themes still need deeper verification." : "Review count, recency, owner replies, and sentiment were not fully verified in this run." },
    { label: "Website / Conversion", value: websiteConversion, tone: toneFor(websiteConversion), detail: research.hasWebsite ? "Website was reachable and basic conversion cues were checked." : "No website was provided, so conversion experience could not be audited." },
    { label: "Social Content", value: socialContent, tone: toneFor(socialContent), detail: research.hasInstagram ? "Instagram source was attached for content review." : "No social content source was attached." },
    { label: "Competitor Strength", value: competitorStrength, tone: toneFor(competitorStrength), detail: research.competitors.length ? "Nearby competitors were available for directional benchmarking." : "Competitor review set was not verified; manual or Places research is needed." },
    { label: "Tracking / Funnel", value: tracking, tone: toneFor(tracking), detail: research.hasWebsite ? "Website tracking and funnel cues require deeper page/access review." : "Tracking cannot be reviewed without a website or analytics access." },
    { label: "Paid Growth Readiness", value: paidReadiness, tone: toneFor(paidReadiness), detail: research.hasWebsite && research.reviewCount > 0 ? "Some foundation exists, but paid traffic still needs tracking, proof, and conversion checks." : "Paid campaigns should wait until proof, contact flow, reviews, landing page, and tracking are stronger." }
  ];
}

function weightedGrowthReadiness(scores: AuditScore[]) {
  if (!scores.length) return 0;
  const weighted = scores.reduce((sum, score) => sum + score.value * (growthScoreWeights[score.label] || 0), 0);
  const totalWeight = scores.reduce((sum, score) => sum + (growthScoreWeights[score.label] || 0), 0);
  return Math.round(weighted / Math.max(totalWeight, 1));
}

function reviewGap(research: PublicSourceResearch) {
  const own = research.reviewCount || 0;
  const top = Math.max(0, ...research.competitors.map((item) => item.reviewCount || 0));
  return Math.max(0, top - own);
}

function competitorStrengthForDiagnosis(competitor: PublicSourceResearch["competitors"][number]) {
  return Number(competitor.rating || 0) * 100 + Math.min(Number(competitor.reviewCount || 0), 1000) / 10;
}

function buildCuratedAudit(audit: AuditRun, research: PublicSourceResearch): CuratedAudit {
  const scoreBreakdown = buildScoreBreakdown(audit, research);
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "the local market";
  const category = audit.category !== "Unknown" ? audit.category.toLowerCase() : "local service";
  const hasOnlyMaps = research.hasGoogleBusinessProfile && !research.hasWebsite && !research.hasInstagram;
  const googleReviewAnalysis = buildGoogleReviewAnalysis(audit, research);
  const competitorAnalysis = buildCompetitorAnalysis(audit, research);
  const instagramAnalysis = buildInstagramAnalysis(audit, research);
  const pricingAnalysis = buildPricingAnalysis(audit, research);
  const operationsAnalysis = buildOperationsAnalysis(audit, research);
  const topCompetitor = research.competitors.slice().sort((a, b) => competitorStrengthForDiagnosis(b) - competitorStrengthForDiagnosis(a))[0];
  const topCompetitorRead = topCompetitor
    ? `${topCompetitor.name} is the strongest sampled benchmark with ${topCompetitor.rating || "unverified"} rating and ${topCompetitor.reviewCount || "unverified"} reviews. Treat its review volume, rating quality, service proof, photos, and social path as evidence of what customers may be comparing before they contact ${audit.businessName}.`
    : "A top competitor benchmark still needs to be verified before claiming who is winning locally.";

  const priorityFindings = [
    {
      title: "Fix lens: identify what is not converting into enquiries",
      detail: `${audit.businessName} should be reviewed as a business that may already have visibility, but may still be losing enquiries because proof, contact flow, social content, tracking, or competitor comparison is not strong enough. ${topCompetitorRead}`,
      action: "Start the sales conversation by asking what is not working today: calls, WhatsApp, walk-ins, Instagram enquiries, website leads, review growth, offer clarity, or repeat bookings."
    },
    {
      title: "Public identity is discoverable, but the audit surface is too thin",
      detail: `${audit.businessName} can be identified from the supplied Maps source in ${market}. However, the current input does not include a website or owned social channel, so the audit can verify local presence but cannot fully inspect conversion, messaging, booking flow, or tracking quality.`,
      action: "Attach the website and primary social profile, or capture the Google Business Profile fields through Places API, before sending a final client-facing PDF."
    },
    {
      title: "Local SEO has a starting base through Maps",
      detail: `For a ${category} business, Maps visibility is one of the highest-intent discovery surfaces. The presence of a Maps profile is a useful base, but ranking strength, review velocity, service/category completeness, photos, Q&A, and competitor comparison are not yet verified.`,
      action: "Review GBP completeness, services, categories, photos, reviews, and top local competitors for the target neighborhood."
    },
    {
      title: "Conversion and contact flow need owned-channel evidence",
      detail: research.hasWebsite
        ? "The website was reachable, so basic metadata/contact checks were included. The next layer should inspect mobile speed, above-the-fold CTA clarity, WhatsApp/call behavior, form friction, and thank-you/tracking events."
        : "No website was supplied, so the audit cannot judge whether interested prospects can quickly understand services, trust the business, and contact/book without friction.",
      action: research.hasWebsite
        ? "Run a mobile-first conversion review and verify tracking events for calls, forms, WhatsApp, and booking clicks."
        : "Add or find the official website/landing page, then run the conversion and tracking audit."
    }
  ];

  const recommendations = [
    `Diagnose the current failure point before selling execution: confirm whether ${audit.businessName} needs more visibility, stronger trust proof, better conversion flow, better Instagram/Reels demand, better review velocity, or better tracking.`,
    research.googleReviews
      ? `Use review themes to strengthen ${audit.businessName}'s public proof: promote service quality, staff strengths, cleanliness signals, and any high-value service themes that customers already mention.`
      : `Complete the Google Business Profile review for ${audit.businessName}: rating, review volume, recent review themes, staff mentions, cleanliness mentions, pricing sentiment, primary category, photos, services, and Q&A.`,
    hasOnlyMaps
      ? "Add the official website and Instagram/Facebook links so the audit can evaluate messaging, proof, offers, content activity, and enquiry paths."
      : "Compare the supplied website/social links against the Maps profile so the business identity, offers, and contact options stay consistent.",
    research.competitors.length
      ? "Benchmark the top competitors by rating, review count, review themes, price level, photos, and offer clarity; copy the operating discipline, not the branding."
      : "Run a competitor review pull for the top nearby salons/stores before finalizing positioning, pricing, and trust recommendations.",
    "Prioritize a 30-day local visibility and enquiry-flow sprint before deeper ads or automation work."
  ];

  const quickWins = [
    "Create a simple Working / Not Working / Missing / Fix tracker for Maps, reviews, website, Instagram, WhatsApp/calls, and tracking.",
    "Make business name, category, neighborhood, phone, website, and booking/WhatsApp paths consistent across Maps and owned channels.",
    "Refresh GBP photos and service descriptions around the highest-value services for the target neighborhood.",
    "Create a simple source-of-truth landing page if no website exists, with visible call, WhatsApp, directions, services, proof, and tracking.",
    "Prepare a review-response and review-generation rhythm before scaling paid acquisition."
  ];

  const growthPlan = [
    "Week 1: Diagnose what is not working: source of enquiries, GBP completeness, review themes, competitor winners, pricing cues, photos, service list, contact links, and missing tracking. Fix public inconsistencies immediately.",
    "Week 2: Turn what is already working into proof assets: before/after creatives, staff/service highlights, hygiene/store-experience proof, review snippets, and offer-specific landing sections.",
    "Week 3: Fix enquiry flow: visible call/WhatsApp/book buttons, service-specific CTAs, tracked links, response-time ownership, and a simple lead sheet for every incoming enquiry.",
    "Week 4: Fix demand rhythm: launch review generation and local content cadence, ask happy customers for specific review details, post high-performing service transformations, and compare weekly against competitor review velocity."
  ];

  const growthPlan90 = [
    `First 30 days - Fix foundation: clean up Google Business Profile fields, services, photos, review replies, website/landing page contact paths, WhatsApp/call tracking, and Instagram bio/proof for ${audit.businessName}.`,
    `Days 31-60 - Build demand: publish category-specific reels/posts, turn review themes into proof assets, run a review-generation campaign, create local SEO/service content, reactivate leads through WhatsApp, and test one clear offer.`,
    "Days 61-90 - Scale what works: launch Meta or Google Ads only after proof and tracking are ready, retarget visitors/engagers, optimize the landing page, review monthly reporting, and monitor competitor review velocity."
  ];

  const executiveSummary = research.googleReviews
    ? `${audit.businessName} has a verified Google profile footprint in ${market}, with ${research.googleReviews.rating || "unverified"} rating and ${research.googleReviews.reviewCount || "unverified"} reviews available through Places. The consultant lens is to identify what is already working, what is not converting into enquiries, why nearby competitors may look more trustworthy, and what GrowingMonk should fix first across reviews, GBP, website/contact flow, Instagram/Reels, and tracking.`
    : `${audit.businessName} has enough public-source signal to begin a local visibility audit, but review depth, competitor winners, pricing sentiment, staff quality, cleanliness, and Instagram post traction still need Google Places/Instagram data or manual review. The report now structures those sections explicitly so a strategist can complete them without losing the consulting lens.`;

  const clientSafeNarrative = `Based on the supplied public source, the business appears to have an identifiable local presence. The current audit should be treated as a first-pass public-source review, not a final performance diagnosis. The next review should confirm Google profile completeness, reviews, website/contact flow, social proof, and tracking before making recommendations tied to leads, rankings, or revenue.`;

  return {
    scoreBreakdown,
    executiveSummary,
    priorityFindings,
    recommendations,
    quickWins,
    googleReviewAnalysis,
    competitorAnalysis,
    instagramAnalysis,
    pricingAnalysis,
    operationsAnalysis,
    growthPlan,
    growthPlan90,
    clientSafeNarrative,
    internalSalesBrief: {
      pitchAngle: `Position GrowingMonk as the team that diagnoses what is not working in ${audit.businessName}'s current growth flow, then fixes the path from local visibility to trust, enquiry, booking, and follow-up.`,
      likelyPainPoints: [
        "They may have visibility and reviews, but may not know why enquiries are not growing or converting consistently.",
        "They may be visible on Maps but may not know which enquiries come from Maps, search, referrals, or social.",
        "If there is no strong owned website/landing page, prospects may rely only on Maps and third-party impressions.",
        "Review quality, photo freshness, service clarity, and local competitor positioning may be inconsistent."
      ],
      discoveryQuestions: [
        "Which services are most profitable or highest priority to grow this month?",
        "Where do most enquiries currently come from: calls, WhatsApp, walk-ins, Instagram, website, or referrals?",
        "Who manages the Google Business Profile, reviews, photos, and service updates today?",
        "Do calls, WhatsApp clicks, forms, and booking actions get tracked anywhere?",
        "If one thing is not working right now, is it fewer enquiries, lower conversion, weak repeat visits, poor tracking, weak Instagram response, or competitor pressure?"
      ],
      suggestedOffer: "Start with a Local Visibility and Enquiry Flow Sprint: GBP cleanup, service/category optimization, proof refresh, landing/contact path review, and basic tracking setup.",
      nextAction: "Ask for the website/social links and GBP access or screenshots, then convert this first-pass audit into a reviewed client-safe report.",
      objectionHandling: "If they say Maps already works, anchor on measurement and missed enquiry clarity: visibility is useful, but the business still needs proof, conversion flow, tracking, and follow-up discipline.",
      doNotClaim: [
        "Do not claim lost revenue or missed leads without analytics or call/booking data.",
        "Do not claim ranking position without checking live local SERPs and competitor context.",
        "Do not invent review count, rating, phone, or address when Maps/Places data was not verified."
      ]
    }
  };
}

function buildFallbackNarrative(audit: AuditRun): CuratedAudit {
  return {
    scoreBreakdown: [],
    executiveSummary: `${audit.businessName} requires public-source research before a complete audit can be finalized.`,
    priorityFindings: [],
    recommendations: [],
    quickWins: [],
    googleReviewAnalysis: "Google review data has not been collected yet.",
    competitorAnalysis: "Competitor review data has not been collected yet.",
    instagramAnalysis: "Instagram content data has not been collected yet.",
    pricingAnalysis: "Pricing position has not been researched yet.",
    operationsAnalysis: "Staff, cleanliness, and store-experience signals have not been researched yet.",
    growthPlan: [],
    growthPlan90: [],
    clientSafeNarrative: "Complete research before sharing client-safe recommendations.",
    internalSalesBrief: {
      pitchAngle: "Complete public-source research before pitching.",
      likelyPainPoints: [],
      discoveryQuestions: [],
      suggestedOffer: "Pending research.",
      nextAction: "Run research.",
      objectionHandling: "Do not handle objections from incomplete data.",
      doNotClaim: ["Do not make unsupported claims."]
    }
  };
}

function buildGoogleReviewAnalysis(audit: AuditRun, research: PublicSourceResearch) {
  const reviews = research.googleReviews;
  if (!reviews) {
    return `Google review analysis is required for ${audit.businessName}, but it was not verified in this run. To complete it, connect Google Places API or manually capture rating, review count, recent review text, positive themes, negative themes, staff mentions, cleanliness mentions, pricing comments, and owner responses. The consultant read should answer: what customers praise, what customers complain about, whether service quality is consistent, whether staff names appear positively, and whether recent review velocity is stronger or weaker than nearby competitors.`;
  }

  const strengths = reviews.positiveSignals.length ? reviews.positiveSignals.join(", ") : "not enough repeated positive themes in the fetched review sample";
  const risks = reviews.riskSignals.length ? reviews.riskSignals.join(", ") : "no major repeated negative theme in the fetched review sample";
  return `${audit.businessName} has a Google rating of ${reviews.rating || "unverified"} from ${reviews.reviewCount || "unverified"} reviews. Working: review themes suggest strengths around ${strengths}. Not working or missing: risk themes to inspect are ${risks}; staff, cleanliness, pricing, service, and booking proof must be checked for gaps before assuming customers are convinced. Review sample health: ${reviews.reviewHealthSummary}. ${reviews.sentimentSummary} Staff-related mentions: ${reviews.staffSignals.length ? reviews.staffSignals.join(", ") : "not clearly visible in the fetched sample"}. Cleanliness/store-experience mentions: ${reviews.cleanlinessSignals.length ? reviews.cleanlinessSignals.join(", ") : "not clearly visible in the fetched sample"}. Pricing mentions: ${reviews.pricingSignals.length ? reviews.pricingSignals.join(", ") : "not clearly visible in the fetched sample"}. Service demand themes: ${reviews.serviceSignals.length ? reviews.serviceSignals.join(", ") : "not clearly visible in the fetched sample"}. Booking/wait-time mentions: ${reviews.bookingSignals.length ? reviews.bookingSignals.join(", ") : "not clearly visible in the fetched sample"}. GrowingMonk fix: turn repeated praise into ad/landing-page proof, respond to weak themes publicly, build a review request flow, and ask happy customers to mention service, stylist, cleanliness, result quality, and value. Review-led consultant read: ${reviews.reviewInsights.join(" ")}`;
}

function buildCompetitorAnalysis(audit: AuditRun, research: PublicSourceResearch) {
  if (!research.competitors.length) {
    return `Competitor review comparison is required, but no competitor review set was verified in this run. To complete it, pull the top nearby ${audit.category || "category"} competitors from Google Places, compare rating, review count, review recency, photo quality, service/category coverage, pricing sentiment, and review themes. The report should identify who is doing better, why they appear more trustworthy, and what ${audit.businessName} should copy operationally.`;
  }

  const ownRating = research.googleReviews?.rating || 0;
  const ownReviews = research.googleReviews?.reviewCount || 0;
  const position = research.competitorReviewPosition;
  const ranked = research.competitors
    .map((competitor) => {
      const better = competitor.rating > ownRating || competitor.reviewCount > ownReviews;
      return `${competitor.name}: ${competitor.rating || "unverified"} rating, ${competitor.reviewCount || "unverified"} reviews${competitor.priceLevel !== undefined ? `, price level ${competitor.priceLevel}` : ""}${competitor.latestReviewDate ? `, latest fetched review ${formatReviewDate(competitor.latestReviewDate)}` : ""}. ${better ? "Doing better signal: " : "Comparable/lower signal: "}${competitor.whyDoingBetter.join(" ")} Winning factors: ${competitor.winningFactors.join(", ")}. Lacking factors: ${competitor.lackingFactors.join(", ")}. Social signal: ${competitor.socialSignals?.signals.join(" ") || "No competitor social signal scanned."} Suggested response: ${competitor.recommendedResponse.join(" ")}`;
    })
    .join("\n");
  const numberSnapshot = position
    ? `Review position snapshot: own rating ${position.clientRating || "unverified"} from ${position.clientReviewCount || 0} reviews; average competitor rating ${position.avgCompetitorRating ?? "not enough data"}; average competitor reviews ${position.avgCompetitorReviewCount ?? "not enough data"}; review gap vs average ${position.reviewVolumeGapVsAverage ?? "not enough data"}; review gap vs top competitor ${position.reviewVolumeGapVsTop ?? "not enough data"}. Top by review volume: ${position.topCompetitorByReviews || "not enough data"} (${position.topCompetitorReviewCount ?? "N/A"} reviews). ${position.summary}`
    : "";
  return `${numberSnapshot}\n\nNearby competitor comparison:\n${ranked}\n\nWorking: ${audit.businessName} has a review base to build from if the rating, service proof, and contact path are made visible. Not working or missing: competitors with higher rating, stronger review volume, richer staff/service proof, active owner responses, better photos, and visible social/Reels paths can win first-click trust before the customer compares websites or offers. Competitor proof: use the strongest sampled stores as evidence of what customers expect to see before booking. GrowingMonk fix: close the gap through review velocity, richer GBP photos/services, clearer service packages, review replies, staff/service proof, Instagram Reels, and stronger proof on owned channels.`;
}

function buildInstagramAnalysis(audit: AuditRun, research: PublicSourceResearch) {
  const instagram = research.instagram;
  const serviceThemes = research.googleReviews?.serviceSignals?.length
    ? research.googleReviews.serviceSignals.slice(0, 4)
    : ["highest-margin services", "before/after transformations", "staff expertise", "store experience"];
  const proofThemes = [
    ...(research.googleReviews?.staffSignals || []),
    ...(research.googleReviews?.cleanlinessSignals || []),
    ...(research.googleReviews?.positiveSignals || [])
  ].slice(0, 5);
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "local area";
  const reelsPlan = [
    `Transformation reels: show ${serviceThemes.slice(0, 2).join(" and ")} with clear before/after framing, location tag, and booking CTA.`,
    `Trust reels: turn review themes${proofThemes.length ? ` around ${proofThemes.join(", ")}` : ""} into short proof clips with staff/customer context.`,
    `Decision reels: answer pricing, wait-time, hygiene, service suitability, and appointment questions that stop customers from booking.`,
    `Local discovery reels: use ${market} cues in captions, on-screen text, and hashtags so nearby high-intent customers recognize the branch.`,
    "Conversion rhythm: every reel should lead to one next action: WhatsApp, call, book, directions, or DM for consultation."
  ];
  if (!instagram) {
    return `Instagram Reels strategy is required, but no Instagram profile was provided. For a ${audit.category || "local service"} business, Reels should be treated as a primary local demand channel, not a branding afterthought. Manual review should inspect the last 30-60 days of reels for views, saves, shares, comments, DM intent, hooks, before/after proof, staff presence, offer clarity, local keywords, and booking CTA strength.\n\n30-day Reels direction:\n${reelsPlan.map((item) => `- ${item}`).join("\n")}`;
  }

  return `Instagram profile ${instagram.handle ? `@${instagram.handle}` : instagram.url} was checked for public metadata. ${instagram.tractionSignals.join(" ")} Reels are likely the highest-leverage organic/social surface for this local category because prospects can quickly compare transformations, staff skill, store ambience, pricing/value cues, and booking confidence before contacting.\n\nManual Reels review needed: inspect recent reels by views, watch-through proxy, likes, comments, saves, shares, enquiry comments, DM prompts, hook style, local keywords, offer clarity, and whether the caption pushes WhatsApp/call/booking.\n\n30-day Reels direction:\n${reelsPlan.map((item) => `- ${item}`).join("\n")}`;
}

function buildPricingAnalysis(audit: AuditRun, research: PublicSourceResearch) {
  const ownPrice = research.googleReviews?.priceLevel;
  const competitorPrices = research.competitors.map((item) => item.priceLevel).filter((value): value is number => typeof value === "number");
  if (ownPrice === undefined && !competitorPrices.length) {
    return `Pricing position was not verified. To complete this section, compare Google price level, visible service menu/pricing, review sentiment about expensive/affordable/value, and competitor packages. For ${audit.businessName}, the key question is whether pricing is justified by proof: reviews, staff expertise, hygiene, photos, service outcomes, and booking convenience.`;
  }

  const averageCompetitorPrice = competitorPrices.length ? competitorPrices.reduce((sum, value) => sum + value, 0) / competitorPrices.length : undefined;
  const position = ownPrice !== undefined && averageCompetitorPrice !== undefined
    ? ownPrice > averageCompetitorPrice
      ? "priced above visible competitor average"
      : ownPrice < averageCompetitorPrice
        ? "priced below visible competitor average"
        : "priced around visible competitor average"
    : "partially visible";
  return `${audit.businessName}'s visible price level is ${ownPrice ?? "not shown"}; competitor visible average is ${averageCompetitorPrice?.toFixed(1) ?? "not enough data"}. This suggests the store is ${position}. Consultant recommendation: if premium, make expertise, hygiene, staff quality, and transformation proof obvious; if value-priced, emphasize transparent packages, repeat visits, and review-backed trust.`;
}

function buildOperationsAnalysis(audit: AuditRun, research: PublicSourceResearch) {
  const reviews = research.googleReviews;
  if (!reviews) {
    return `Staff quality, cleanliness, and store experience require review text analysis. This run did not verify those review themes. Complete the section by tagging reviews for staff friendliness/professionalism, wait time, cleanliness/hygiene, ambience, billing transparency, and outcome satisfaction.`;
  }

  return `Staff signal: ${reviews.staffSignals.length ? reviews.staffSignals.join(", ") : "not strongly visible in fetched reviews"}. Cleanliness/store signal: ${reviews.cleanlinessSignals.length ? reviews.cleanlinessSignals.join(", ") : "not strongly visible in fetched reviews"}. Service signal: ${reviews.serviceSignals.length ? reviews.serviceSignals.join(", ") : "not strongly visible in fetched reviews"}. Booking/wait-time signal: ${reviews.bookingSignals.length ? reviews.bookingSignals.join(", ") : "not strongly visible in fetched reviews"}. Loyalty signal: ${reviews.loyaltySignals.length ? reviews.loyaltySignals.join(", ") : "not strongly visible in fetched reviews"}. Operational risk signal: ${reviews.riskSignals.length ? reviews.riskSignals.join(", ") : "no repeated risk theme found in fetched sample"}. Growth consultant read: operational proof should be made visible, not assumed. If staff and cleanliness reviews are strong, use them in GBP posts, landing proof, and Instagram captions. If weak or absent, create a review prompt that asks customers to mention stylist name, hygiene, wait time, result quality, booking ease, and value.`;
}

function scoreFrom(checks: boolean[]) {
  const passed = checks.filter(Boolean).length;
  return Math.round(20 + (passed / Math.max(1, checks.length)) * 70);
}

function toneFor(value: number) {
  if (value >= 75) return "strong" as const;
  if (value >= 60) return "good" as const;
  if (value >= 40) return "gap" as const;
  return "foundational" as const;
}

function extractFirst(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1] || match?.[0] || "";
}

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
}

function getVerifiedFacts(audit: AuditRun) {
  const facts = audit.finalDataUsed?.verifiedFacts;
  return Array.isArray(facts) && facts.every((item) => typeof item === "string") ? facts : [];
}

function getLimitations(audit: AuditRun) {
  const limitations = audit.finalDataUsed?.limitations;
  return Array.isArray(limitations) && limitations.every((item) => typeof item === "string")
    ? limitations
    : ["This audit is limited to provided public sources."];
}
