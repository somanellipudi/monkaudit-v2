import type { AuditRun, Lead } from "@/lib/types";

export type OpportunityTemperature = "Hot" | "Warm" | "Nurture";

export type PitchPack = {
  opportunity: {
    score: number;
    temperature: OpportunityTemperature;
    urgency: string;
    revenuePotential: string;
    conversionLikelihood: string;
    reason: string;
  };
  pitchAngle: string;
  suggestedOffer: string;
  nextAsk: string;
  proofCards: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  painPoints: string[];
  discoveryQuestions: string[];
  objections: Array<{
    objection: string;
    response: string;
  }>;
  outreach: {
    callOpener: string;
    whatsapp: string;
    emailSubject: string;
    emailBody: string;
    followUp: string;
  };
  guardrails: string[];
};

type InternalSalesBrief = {
  pitchAngle: string;
  likelyPainPoints: string[];
  discoveryQuestions: string[];
  suggestedOffer: string;
  nextAction: string;
  objectionHandling: string;
  doNotClaim: string[];
};

type Competitor = {
  name: string;
  rating?: number;
  reviewCount?: number;
  winningFactors?: string[];
  whyDoingBetter?: string[];
};

export function buildPitchPack(audit: AuditRun, lead?: Lead | null): PitchPack {
  const brief = parseInternalSalesBrief(audit.finalDataUsed?.internalSalesBrief);
  const competitors = parseCompetitors(audit.discoveredData?.competitors);
  const topCompetitor = competitors.slice().sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))[0];
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "the local market";
  const category = audit.category !== "Unknown" ? audit.category : "local business";
  const reviewGap = topCompetitor ? Math.max(0, (topCompetitor.reviewCount || 0) - (audit.reviewCount || 0)) : 0;
  const missingChannels = [
    !audit.hasWebsite ? "website conversion path" : "",
    !audit.hasWhatsApp ? "WhatsApp/call flow" : "",
    !audit.hasInstagram ? "Instagram demand proof" : "",
    !audit.hasGoogleBusinessProfile ? "Google Business Profile proof" : ""
  ].filter(Boolean);
  const opportunityScore = scoreOpportunity(audit, reviewGap, missingChannels.length, Boolean(topCompetitor));
  const temperature = opportunityTemperature(opportunityScore);
  const pitchAngle =
    brief.pitchAngle ||
    `Position GrowingMonk as the team that helps ${audit.businessName} turn local visibility, trust proof, and enquiry flow into more qualified conversations in ${market}.`;
  const suggestedOffer = brief.suggestedOffer || offerFor(audit, temperature);
  const nextAsk = brief.nextAction || "Ask for Google Business Profile, website, social, and enquiry-flow access or screenshots.";
  const painPoints = brief.likelyPainPoints.length
    ? brief.likelyPainPoints
    : defaultPainPoints(audit, topCompetitor, missingChannels, market);
  const discoveryQuestions = brief.discoveryQuestions.length
    ? brief.discoveryQuestions
    : defaultDiscoveryQuestions(audit, topCompetitor);

  return {
    opportunity: {
      score: opportunityScore,
      temperature,
      urgency: urgencyLabel(audit, reviewGap, missingChannels.length),
      revenuePotential: revenuePotentialLabel(audit, topCompetitor),
      conversionLikelihood: conversionLikelihoodLabel(audit, lead, temperature),
      reason: opportunityReason(audit, topCompetitor, missingChannels, market)
    },
    pitchAngle,
    suggestedOffer,
    nextAsk,
    proofCards: buildProofCards(audit, topCompetitor, reviewGap, missingChannels, market),
    painPoints,
    discoveryQuestions,
    objections: buildObjections(audit, topCompetitor, brief.objectionHandling, suggestedOffer),
    outreach: buildOutreach(audit, lead, pitchAngle, suggestedOffer, painPoints, discoveryQuestions),
    guardrails: brief.doNotClaim.length
      ? brief.doNotClaim
      : [
          "Do not claim lost revenue without analytics, call, booking, or CRM data.",
          "Do not promise rankings, review growth, or lead volume before baseline access is verified.",
          "Keep competitor claims limited to public evidence from this audit."
        ]
  };
}

function scoreOpportunity(audit: AuditRun, reviewGap: number, missingChannelCount: number, hasCompetitor: boolean) {
  let score = 35;
  if (audit.score > 0 && audit.score < 65) score += 18;
  if (audit.score >= 65 && audit.score < 80) score += 10;
  if (audit.reviewCount > 0) score += 10;
  if (reviewGap >= 25) score += 14;
  if (reviewGap >= 100) score += 8;
  if (missingChannelCount > 0) score += Math.min(18, missingChannelCount * 6);
  if (hasCompetitor) score += 8;
  if (audit.hasWhatsApp || audit.sourceLinks?.website) score += 5;
  return Math.max(0, Math.min(100, score));
}

function opportunityTemperature(score: number): OpportunityTemperature {
  if (score >= 76) return "Hot";
  if (score >= 55) return "Warm";
  return "Nurture";
}

function urgencyLabel(audit: AuditRun, reviewGap: number, missingChannelCount: number) {
  if (reviewGap >= 100) return "High: competitors have a visible review advantage.";
  if (missingChannelCount >= 2) return "High: conversion and proof gaps are visible.";
  if (audit.score > 0 && audit.score < 65) return "Medium: growth readiness has clear fixable gaps.";
  return "Medium: qualify urgency in the discovery call.";
}

function revenuePotentialLabel(audit: AuditRun, competitor?: Competitor) {
  if (competitor && (competitor.reviewCount || 0) > Math.max(50, audit.reviewCount * 2)) return "Strong local-demand signal.";
  if (audit.category !== "Unknown" && audit.city !== "Unknown") return "Category and market are clear enough to pitch a first sprint.";
  return "Needs qualification before proposal.";
}

function conversionLikelihoodLabel(audit: AuditRun, lead: Lead | null | undefined, temperature: OpportunityTemperature) {
  if (lead?.priority === "Urgent" || lead?.salesStage === "Follow-up Due") return "High: sales context already shows intent.";
  if (temperature === "Hot" && audit.score > 0) return "Medium-high: lead with evidence and a low-risk first ask.";
  if (temperature === "Warm") return "Medium: use the audit to create urgency.";
  return "Low-medium: nurture until pain and access are confirmed.";
}

function opportunityReason(audit: AuditRun, competitor: Competitor | undefined, missingChannels: string[], market: string) {
  const competitorReason = competitor
    ? `${competitor.name} is a useful comparison point with ${competitor.reviewCount || "unverified"} reviews.`
    : "No competitor benchmark was verified yet.";
  const gapReason = missingChannels.length
    ? `Visible gaps include ${listPhrase(missingChannels)}.`
    : "Core public channels are present, so the pitch should focus on quality, tracking, and conversion.";
  return `${audit.businessName} has a sales-relevant audit footprint in ${market}. ${competitorReason} ${gapReason}`;
}

function buildProofCards(audit: AuditRun, competitor: Competitor | undefined, reviewGap: number, missingChannels: string[], market: string) {
  const cards = [
    {
      label: "Growth readiness",
      value: audit.score ? `${audit.score}/100` : "Pending",
      detail: audit.score ? "Use this as an internal priority signal, not a client guarantee." : "Complete research before using score language."
    },
    {
      label: "Google trust",
      value: audit.reviewCount ? `${audit.rating || "Unverified"} rating, ${audit.reviewCount} reviews` : "Not verified",
      detail: "Anchor the call around trust proof, review velocity, and conversion confidence."
    }
  ];

  if (competitor) {
    cards.push({
      label: "Competitor pressure",
      value: reviewGap > 0 ? `${reviewGap} review gap` : "Comparable review volume",
      detail: `${competitor.name} has ${competitor.reviewCount || "unverified"} reviews versus ${audit.businessName}'s ${audit.reviewCount || "unverified"} in ${market}.`
    });
  }

  cards.push({
    label: "Fixable gaps",
    value: missingChannels.length ? String(missingChannels.length) : "Quality review",
    detail: missingChannels.length ? `Start with ${listPhrase(missingChannels)}.` : "Audit the quality of proof, offers, tracking, and follow-up."
  });

  return cards;
}

function defaultPainPoints(audit: AuditRun, competitor: Competitor | undefined, missingChannels: string[], market: string) {
  const points = [
    audit.reviewCount
      ? `${audit.businessName} has ${audit.reviewCount} visible Google reviews and a ${audit.rating || "not verified"} rating, so the pitch should focus on turning existing trust into enquiries.`
      : `Prospects in ${market} may compare Google proof, photos, reviews, website clarity, and contact speed before calling.`,
    missingChannels.length
      ? `${audit.businessName} has visible gaps in ${listPhrase(missingChannels)}, which can weaken enquiry conversion.`
      : `${audit.businessName} needs sharper proof, tracking, and follow-up discipline before scaling paid acquisition.`
  ];
  if (competitor) {
    const gap = Math.max(0, (competitor.reviewCount || 0) - (audit.reviewCount || 0));
    points.push(
      gap > 0
        ? `${competitor.name} has ${competitor.reviewCount || "unverified"} reviews, creating a ${gap}-review proof gap the prospect can understand quickly.`
        : `${competitor.name} gives the salesperson a concrete comparison point for trust proof and local visibility.`
    );
  }
  return points;
}

function defaultDiscoveryQuestions(audit: AuditRun, competitor?: Competitor) {
  return [
    `Which channel brings the best customers today: Google calls, WhatsApp, Instagram, referrals, walk-ins, or ads?`,
    `What happens after a new enquiry comes in, and who owns response time?`,
    `Which service or offer would you most want to sell more of in the next 30 days?`,
    competitor
      ? `When customers compare you with ${competitor.name}, what do you believe makes them choose one business over the other?`
      : `Who do customers usually compare you with before booking?`,
    `Can we review Google Business Profile, website, social, and call/WhatsApp data before recommending a growth sprint?`
  ];
}

function buildObjections(audit: AuditRun, competitor: Competitor | undefined, existingHandling: string, offer: string) {
  const competitorLine = competitor
    ? `The point is not that ${competitor.name} is better in every way; it is that customers can see more proof before deciding.`
    : "The point is to verify what customers can see before they decide to call or book.";
  return [
    {
      objection: "We already have an agency.",
      response: `That may be working. This audit is a second-opinion view of local proof, reviews, enquiry flow, and tracking. ${competitorLine}`
    },
    {
      objection: "We do not have budget right now.",
      response: `Start with ${offer}. It is designed to fix the highest-leverage public gaps before asking for a larger retainer.`
    },
    {
      objection: "We already get enough leads.",
      response: `Then the question becomes lead quality, conversion, and margin. For ${audit.businessName}, we should check whether the best services are visible and easy to enquire about.`
    },
    {
      objection: "Send details on WhatsApp.",
      response: "Send the short proof summary first, then ask for a 15-minute review call so the findings do not become a generic brochure."
    },
    {
      objection: "Existing brief guidance",
      response: existingHandling || "Keep the conversation anchored to verified audit evidence, a low-risk first sprint, and access needed before claims."
    }
  ];
}

function buildOutreach(audit: AuditRun, lead: Lead | null | undefined, pitchAngle: string, offer: string, painPoints: string[], questions: string[]) {
  const contact = lead?.contactName || "there";
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "your market";
  const competitors = parseCompetitors(audit.discoveredData?.competitors);
  const topCompetitor = competitors.slice().sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))[0];
  const reviewGap = topCompetitor ? Math.max(0, (topCompetitor.reviewCount || 0) - (audit.reviewCount || 0)) : 0;
  const missingChannels = [
    !audit.hasWebsite ? "website" : "",
    !audit.hasWhatsApp ? "WhatsApp/call CTA" : "",
    !audit.hasInstagram ? "Instagram" : "",
    !audit.hasGoogleBusinessProfile ? "Google Business Profile" : ""
  ].filter(Boolean);
  const evidence = outreachEvidence(audit, topCompetitor, reviewGap, missingChannels);
  const firstQuestion = questions[0] || "Which channel brings the best customers today?";
  const trustLine = audit.reviewCount
    ? `${audit.businessName} already has strong public trust: ${audit.rating || "unverified"} rating from ${audit.reviewCount} Google reviews.`
    : `${audit.businessName} already has a visible public presence in ${market}.`;
  const competitorLine = topCompetitor
    ? `A nearby benchmark, ${shortCompetitorName(topCompetitor.name)}, shows ${topCompetitor.reviewCount || "unverified"} reviews${reviewGap > 0 ? `, which creates a ${reviewGap}-review proof gap` : ""}.`
    : "";
  const channelLine = missingChannels.length
    ? `The bigger issue we noticed is the enquiry path: ${listPhrase(missingChannels)} can be clearer for people who are ready to call, message, or book.`
    : "The bigger question is whether the current public proof is turning enough interested people into calls, messages, and bookings.";

  return {
    callOpener: `Hi ${contact}, this is GrowingMonk. We help local businesses find where digital enquiries are leaking and fix those gaps through marketing, tracking, and conversion improvements. We reviewed ${audit.businessName}'s public presence in ${market}. ${trustLine} ${competitorLine} ${channelLine} Before suggesting anything, I wanted to understand one thing: ${firstQuestion}`,
    whatsapp: `Hi ${contact}, this is GrowingMonk.\n\nWe help local businesses find where digital enquiries are leaking and fix those gaps through marketing, tracking, and conversion improvements.\n\nWe reviewed ${audit.businessName}'s public presence in ${market}. ${trustLine}\n\nWhat stood out:\n${competitorLine ? `- ${competitorLine}\n` : ""}- ${channelLine}\n\nSo the opportunity may not be “get more visibility” first. It may be: make the people who already find you more likely to call, WhatsApp, or book.\n\nWould you be open to a 10-minute walkthrough? I can show the exact gaps we found and the first 2-3 fixes I would prioritize.`,
    emailSubject: `${audit.businessName}: quick growth audit findings`,
    emailBody: `Hi ${contact},\n\nI am reaching out from GrowingMonk. We help local businesses find where digital enquiries are leaking and fix those gaps through marketing, tracking, and conversion improvements.\n\nWe reviewed ${audit.businessName}'s public presence in ${market}. ${trustLine}\n\nA few things stood out:\n${competitorLine ? `- ${competitorLine}\n` : ""}- ${channelLine}\n\nMy read is simple: this may not be a demand problem. People can already find the business. The bigger opportunity may be improving the path from discovery to enquiry or booking.\n\nIf useful, I can walk you through the evidence and the first 2-3 fixes I would prioritize. It should take 10 minutes.\n\nBest,\nGrowingMonk Team`,
    followUp: `Hi ${contact}, following up on the ${audit.businessName} review. The main point was simple: ${trustLine} ${channelLine} Should I send the 2-3 fixes here, or would a 10-minute walkthrough be easier?`
  };
}

function outreachEvidence(audit: AuditRun, topCompetitor: Competitor | undefined, reviewGap: number, missingChannels: string[]) {
  const facts = [
    audit.reviewCount ? `Google trust: ${audit.rating || "unverified"} rating from ${audit.reviewCount} reviews` : "Google review count needs verification",
    topCompetitor
      ? `${topCompetitor.name} shows ${topCompetitor.reviewCount || "unverified"} reviews${reviewGap > 0 ? `, a ${reviewGap}-review visible gap` : ""}`
      : "",
    missingChannels.length ? `missing/weak public path: ${listPhrase(missingChannels)}` : "core public channels are present; quality and tracking need review"
  ].filter(Boolean);

  return {
    inline: facts.slice(0, 3).join("; "),
    bullets: facts.map((fact) => `- ${fact}`).join("\n")
  };
}

function shortCompetitorName(name: string) {
  return name
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+in\s+.*$/i, "")
    .replace(/\s*,\s*Hyderabad.*$/i, "")
    .trim();
}

function offerFor(audit: AuditRun, temperature: OpportunityTemperature) {
  if (temperature === "Hot") return "30-Day Local Growth Sprint";
  if (!audit.hasWebsite || !audit.hasWhatsApp) return "Conversion Foundation Sprint";
  return "Visibility and Trust Proof Sprint";
}

function parseInternalSalesBrief(value: unknown): InternalSalesBrief {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    pitchAngle: text(candidate.pitchAngle),
    likelyPainPoints: stringList(candidate.likelyPainPoints),
    discoveryQuestions: stringList(candidate.discoveryQuestions),
    suggestedOffer: text(candidate.suggestedOffer),
    nextAction: text(candidate.nextAction),
    objectionHandling: text(candidate.objectionHandling),
    doNotClaim: stringList(candidate.doNotClaim)
  };
}

function parseCompetitors(value: unknown): Competitor[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      name: text(item.name) || "Nearby competitor",
      rating: numberOrUndefined(item.rating),
      reviewCount: numberOrUndefined(item.reviewCount),
      winningFactors: stringList(item.winningFactors),
      whyDoingBetter: stringList(item.whyDoingBetter)
    }));
}

function listPhrase(items: string[]) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function numberOrUndefined(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}
