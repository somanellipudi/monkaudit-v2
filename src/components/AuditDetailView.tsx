import {
  AlertTriangle,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { AutoRunAudit } from "@/components/AutoRunAudit";
import { ResearchProgress } from "@/components/ResearchProgress";
import { Panel, ScoreCard, SectionTitle, tableHeadClassName } from "@/components/ui";
import { scores } from "@/lib/mock-data";
import type { AuditRun, Score } from "@/lib/types";

type GoogleReviews = {
  rating: number;
  reviewCount: number;
  priceLevel?: number;
  address?: string;
  phone?: string;
  website?: string;
  sampleReviewCount: number;
  sampleAverageRating?: number;
  latestReviewDate?: string;
  ownerResponseCount: number;
  positiveSignals: string[];
  riskSignals: string[];
  staffSignals: string[];
  cleanlinessSignals: string[];
  pricingSignals: string[];
  serviceSignals: string[];
  bookingSignals: string[];
  loyaltySignals: string[];
  reviewHealthSummary: string;
  reviewInsights: string[];
  reviewThemes: string[];
  sampleReviews: SampleReview[];
};

type SampleReview = {
  author?: string;
  rating?: number;
  relativeTime?: string;
  publishedAt?: string;
  text: string;
  ownerResponse?: string;
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

type Competitor = {
  name: string;
  rating: number;
  reviewCount: number;
  priceLevel: number | undefined;
  address: string;
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
};

type Generation = {
  provider: string;
  model: string;
  status: string;
  generatedAt: string;
  error: string;
  promptVersion: string;
  promptChars: number;
  responseChars: number;
  finishReason: string;
  responsePreview: string;
  apiStatus: string;
};

export function AuditDetailView({
  audit
}: {
  audit: AuditRun;
}) {
  const hasCompletedResearch = audit.score > 0 && audit.auditStatus !== "Research Running";
  const generatedScores = parseScoreBreakdown(audit.finalDataUsed?.scoreBreakdown);
  const displayScores = hasCompletedResearch
    ? generatedScores.length
      ? generatedScores
      : scores.map((score) => (score.label === "Overall Growth Readiness" ? { ...score, value: audit.score } : score))
    : [];

  const verifiedFacts = parseStringList(audit.finalDataUsed?.verifiedFacts);
  const limitations = parseStringList(audit.finalDataUsed?.limitations);
  const executiveSummary = textOrEmpty(audit.finalDataUsed?.executiveSummary);
  const priorityFindings = parseFindingList(audit.finalDataUsed?.priorityFindings);
  const recommendations = parseStringList(audit.finalDataUsed?.recommendations);
  const quickWins = parseStringList(audit.finalDataUsed?.quickWins);
  const growthPlan = parseStringList(audit.finalDataUsed?.growthPlan);
  const googleReviewAnalysis = textOrEmpty(audit.finalDataUsed?.googleReviewAnalysis);
  const competitorAnalysis = textOrEmpty(audit.finalDataUsed?.competitorAnalysis);
  const instagramAnalysis = textOrEmpty(audit.finalDataUsed?.instagramAnalysis);
  const pricingAnalysis = textOrEmpty(audit.finalDataUsed?.pricingAnalysis);
  const operationsAnalysis = textOrEmpty(audit.finalDataUsed?.operationsAnalysis);
  const salesBrief = parseSalesBrief(audit.finalDataUsed?.internalSalesBrief);
  const generation = parseGeneration(audit.finalDataUsed?.generation);

  const googleReviews = parseGoogleReviews(audit.discoveredData?.googleReviews);
  const competitors = parseCompetitors(audit.discoveredData?.competitors);
  const websiteSignals = parseWebsiteSignals(audit.discoveredData?.websiteSignals);
  const instagram = parseInstagram(audit.discoveredData?.instagram);
  const structure = textOrEmpty(audit.finalDataUsed?.business_structure) || textOrEmpty(audit.manualOverrides?.business_structure) || "Single location/store";
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || "Market pending";
  const ownRating = googleReviews?.rating || audit.rating;
  const ownReviewCount = googleReviews?.reviewCount || audit.reviewCount;
  const topCompetitor = competitors.slice().sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))[0];
  const reviewGap = topCompetitor ? Math.max(0, (topCompetitor.reviewCount || 0) - (ownReviewCount || 0)) : 0;
  const competitorAverage = competitors.length
    ? Math.round(competitors.reduce((sum, competitor) => sum + (competitor.reviewCount || 0), 0) / competitors.length)
    : 0;
  const comparisonRows = [
    {
      name: audit.businessName,
      rating: ownRating,
      reviews: ownReviewCount
    },
    ...competitors.slice(0, 5).map((competitor) => ({
      name: competitor.name,
      rating: competitor.rating,
      reviews: competitor.reviewCount
    }))
  ];
  const sourceCoverage = [audit.hasGoogleBusinessProfile, audit.hasWebsite, audit.hasInstagram, Boolean(audit.hasWhatsApp || googleReviews?.phone || textOrEmpty(audit.discoveredData?.detectedPhone))].filter(Boolean).length;
  const instagramReelMoves = [
    `Lead with ${googleReviews?.serviceSignals[0] || "highest-value service"} transformations and clear before/after proof.`,
    `Turn ${googleReviews?.positiveSignals[0] || "customer praise"} into short review-led Reels with staff or service context.`,
    `Use ${market} in captions, on-screen text, and location tags for local discovery.`,
    "Make every Reel point to one action: WhatsApp, call, book, directions, or DM."
  ];
  const competitorSocialRows = competitors.slice(0, 5).map((competitor) => {
    const social = competitor.socialSignals;
    const lead = social?.hasInstagram ? "Instagram link found" : "Instagram not found from website scan";
    const reels = social?.websiteMentionsReels ? "Reels/transformation cues present" : "Reels cues need manual check";
    return `${competitor.name}: ${lead}; ${reels}. ${competitor.winningFactors.slice(0, 2).join(", ") || "Review trust still needs comparison."}`;
  });
  const sectionLinks = [
    ["Scores", "scores"],
    ["Reviews", "reviews"],
    ["Competitors", "competitors"],
    ["Instagram Reels", "instagram-reels"],
    ["Plan", "plan"],
    ["Evidence", "evidence"]
  ];

  return (
    <>
      <AutoRunAudit
        auditId={audit.id}
        shouldRun={(audit.auditStatus === "Queued" || audit.auditStatus === "Draft") && generation?.status !== "gemini_generated"}
        generationStatus={generation?.status}
        isRunning={audit.auditStatus === "Research Running" || audit.auditStatus === "Queued"}
      />

      {!hasCompletedResearch ? (
        <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <ResearchProgress />
          <Panel>
            <SectionTitle title="Audit is being prepared" detail="Results will appear after the public-source check is complete." />
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>MonkAudit has created the lead and audit run.</p>
              <p>Next, the worker should resolve business identity, reviews, competitors, source links, contact options, and limitations.</p>
              <p>Until research completes, scores and client report content stay hidden to avoid fake precision.</p>
            </div>
          </Panel>
        </div>
      ) : null}

      {hasCompletedResearch ? (
        <div className="sticky top-14 z-20 mb-6 border border-stoneLine bg-paper/95 p-2 shadow-calm backdrop-blur">
          <div className="flex gap-2 overflow-x-auto">
            {sectionLinks.map(([label, id]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap border border-stoneLine bg-ivory px-3 py-2 text-sm font-semibold text-ink hover:border-monk">
                {label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {hasCompletedResearch ? (
            <div id="scores" className="scroll-mt-24 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayScores.map((score) => <ScoreCard key={score.label} score={score} />)}
            </div>
          ) : null}

          {hasCompletedResearch ? (
            <div className="mt-6 grid gap-5">
              <Panel>
                <SectionTitle title="Deal Closing Snapshot" detail="Sales-ready guidance grounded in visible data and careful inference." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <InsightCard icon={<Target size={18} />} label="Pitch angle" value={salesBrief?.pitchAngle || "Lead with local visibility, trust proof, contact flow, and tracking discipline."} />
                  <InsightCard icon={<TrendingUp size={18} />} label="Suggested offer" value={salesBrief?.suggestedOffer || "30-Day Growth Sprint"} />
                  <InsightCard icon={<MessageCircle size={18} />} label="Next ask" value={salesBrief?.nextAction || "Ask for GBP, website, social, and contact-flow access or screenshots."} />
                  <InsightCard icon={<AlertTriangle size={18} />} label="Review risk" value={limitations[0] || "Keep claims tied to public evidence; avoid revenue, rank, and competitor superiority claims until verified."} />
                </div>
              </Panel>

              <div className="grid min-w-0 gap-5">
                <div id="reviews" className="scroll-mt-24">
                <Panel>
                  <SectionTitle title="Google Review Intelligence" detail="Trust proof, review themes, and what to use carefully in the pitch." />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MiniStat icon={<Star size={16} />} label="Rating" value={ownRating ? String(ownRating) : "Not verified"} />
                    <MiniStat icon={<Users size={16} />} label="Reviews" value={ownReviewCount ? String(ownReviewCount) : "Not verified"} />
                    <MiniStat icon={<Phone size={16} />} label="Contact" value={googleReviews?.phone || textOrEmpty(audit.discoveredData?.detectedPhone) || "Needs review"} />
                    <MiniStat icon={<MessageCircle size={16} />} label="Sample" value={googleReviews?.sampleReviewCount ? `${googleReviews.sampleReviewCount} reviews` : "No sample"} />
                    <MiniStat icon={<ShieldCheck size={16} />} label="Owner replies" value={googleReviews ? `${googleReviews.ownerResponseCount}/${googleReviews.sampleReviewCount}` : "Needs review"} />
                    <MiniStat icon={<TrendingUp size={16} />} label="Latest review" value={googleReviews?.latestReviewDate ? new Date(googleReviews.latestReviewDate).toLocaleDateString() : "Not visible"} />
                  </div>
                  {googleReviews ? (
                    <div className="mt-5 grid gap-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <ThemeGroup title="Proof to reuse" rows={[
                          ["Positive", googleReviews.positiveSignals, "No repeated positive theme found."],
                          ["Staff", googleReviews.staffSignals, "Staff mentions need manual review."],
                          ["Cleanliness", googleReviews.cleanlinessSignals, "Store-experience mentions need manual review."],
                          ["Loyalty", googleReviews.loyaltySignals, "Repeat-customer themes need manual review."]
                        ]} />
                        <ThemeGroup title="Friction to inspect" rows={[
                          ["Risk", googleReviews.riskSignals, "No repeated risk theme found."],
                          ["Pricing", googleReviews.pricingSignals, "Pricing sentiment needs manual review."],
                          ["Services", googleReviews.serviceSignals, "Service-specific themes need manual review."],
                          ["Booking", googleReviews.bookingSignals, "Booking and wait-time themes need manual review."]
                        ]} />
                      </div>
                      <ReviewHistory sampleReviews={googleReviews.sampleReviews} />
                      <EvidenceList title="Review-led actions" items={googleReviews.reviewInsights} empty="Review sample is too small for insight extraction." />
                    </div>
                  ) : null}
                  <p className="mt-5 border-l-2 border-monk/40 pl-3 text-sm leading-7 text-muted">
                    {googleReviewAnalysis || "Google review depth needs Places/API data or manual review before stronger trust claims."}
                  </p>
                </Panel>
                </div>

                <div id="competitors" className="scroll-mt-24">
                <Panel>
                  <SectionTitle title="Competitor Watchlist" detail="Nearby businesses that may influence first-click trust." />
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat icon={<Users size={16} />} label="Competitors" value={competitors.length ? String(competitors.length) : "Needs pull"} />
                    <MiniStat icon={<TrendingUp size={16} />} label="Review gap" value={reviewGap ? `${reviewGap}` : "No gap"} />
                    <MiniStat icon={<Star size={16} />} label="Avg reviews" value={competitorAverage ? String(competitorAverage) : "Not verified"} />
                  </div>
                  {competitors.length ? (
                    <div className="grid gap-4">
                      <ComparisonBars rows={comparisonRows} />
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                        <thead className={tableHeadClassName}>
                          <tr>
                            <th className="w-[28%] py-3 pr-4">Competitor</th>
                            <th className="w-[9%] py-3 pr-4">Rating</th>
                            <th className="w-[10%] py-3 pr-4">Reviews</th>
                            <th className="w-[27%] py-3 pr-4">Sales read</th>
                            <th className="w-[26%] py-3 pr-4">Weakness / response</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stoneLine">
                          {competitors.slice(0, 5).map((competitor) => (
                            <tr key={competitor.name}>
                              <td className="py-3 pr-4 align-top font-semibold leading-6 text-ink">{competitor.name}</td>
                              <td className="py-3 pr-4 text-muted">{competitor.rating || "N/A"}</td>
                              <td className="py-3 pr-4 text-muted">{competitor.reviewCount || "N/A"}</td>
                              <td className="py-3 pr-4 align-top leading-6 text-muted">
                                {(competitor.winningFactors.length ? competitor.winningFactors.join(", ") : competitor.whyDoingBetter[0]) || "Needs manual comparison."}
                                {competitor.latestReviewDate ? <span className="mt-1 block text-xs">Latest sample: {new Date(competitor.latestReviewDate).toLocaleDateString()}</span> : null}
                              </td>
                              <td className="py-3 pr-4 align-top leading-6 text-muted">
                                {competitor.lackingFactors[0] || competitor.possibleWeaknesses[0] || "Verify photos, services, and replies."}
                                {competitor.socialSignals?.hasInstagram ? <span className="mt-1 block text-xs">Instagram found from website scan</span> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-muted">{competitorAnalysis || "Competitor review data has not been collected yet."}</p>
                  )}
                  {competitorAnalysis && competitors.length ? (
                    <BulletedInsight title="Consultant read" text={competitorAnalysis} />
                  ) : null}
                </Panel>
                </div>
              </div>

              <Panel className="scroll-mt-24">
                <div id="instagram-reels" className="scroll-mt-24">
                  <SectionTitle title="Instagram Reels Strategy" detail="Reels are the main organic demand surface for local service discovery and proof." />
                  <div className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniStat icon={<Instagram size={16} />} label="Profile" value={instagram?.handle ? `@${instagram.handle}` : audit.hasInstagram ? "Detected" : "Needs link"} />
                      <MiniStat icon={<Target size={16} />} label="Primary CTA" value={audit.hasWhatsApp || googleReviews?.phone ? "Call / WhatsApp" : "Needs contact path"} />
                      <MiniStat icon={<Star size={16} />} label="Proof source" value={googleReviews?.reviewThemes[0] || "Reviews / transformations"} />
                      <MiniStat icon={<MapPin size={16} />} label="Local hook" value={market} />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <ActionList title="30-day Reel moves" items={instagramReelMoves} />
                      <ActionList
                        title="Manual Reel checks"
                        items={[
                          "Rank recent Reels by views, saves, shares, comments, and enquiry intent.",
                          "Check hooks, on-screen text, local keywords, staff proof, and CTA.",
                          "Compare competitor Reels for transformations, ambience, pricing cues, and offers.",
                          "Convert winning formats into weekly cadence: transformation, review, staff, offer, FAQ."
                        ]}
                      />
                      <ActionList title="Competitor social signals" items={competitorSocialRows} />
                    </div>
                  </div>
                  {instagramAnalysis ? <BulletedInsight title="Reels strategy read" text={instagramAnalysis} /> : null}
                </div>
              </Panel>

              <Panel>
                <SectionTitle title="Store & Channel Profile" detail="Business, source, website, social, and contact signals for the sales call." />
                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="space-y-3 text-sm">
                    <Fact label="Business" value={audit.businessName} />
                    <Fact label="Category" value={audit.category || "Needs review"} />
                    <Fact label="Market" value={market} />
                    <Fact label="Structure" value={structure} />
                    <Fact label="Source coverage" value={`${sourceCoverage}/4 key sources`} />
                  </div>
                  <div className="space-y-3 text-sm">
                    <Fact label="Website" value={audit.hasWebsite ? "Detected" : "Not detected"} />
                    <Fact label="Booking cue" value={websiteSignals ? yesNo(websiteSignals.hasBookingCue) : "Needs review"} />
                    <Fact label="Service cue" value={websiteSignals ? yesNo(websiteSignals.hasServiceCue) : "Needs review"} />
                    <Fact label="Price cue" value={websiteSignals ? yesNo(websiteSignals.hasPriceCue) : "Needs review"} />
                    <Fact label="WhatsApp / phone" value={audit.hasWhatsApp || googleReviews?.phone ? "Available" : "Needs review"} />
                  </div>
                  <div className="space-y-3 text-sm">
                    <Fact label="Instagram" value={instagram?.handle ? `@${instagram.handle}` : audit.hasInstagram ? "Detected" : "Not detected"} />
                    <Fact label="Instagram access" value={instagram ? yesNo(instagram.accessible) : "Needs review"} />
                    <Fact label="Pricing position" value={pricingAnalysis ? "Analysis ready" : "Needs review"} />
                    <Fact label="Operations proof" value={operationsAnalysis ? "Analysis ready" : "Needs review"} />
                    <Fact label="Last updated" value={audit.lastUpdated} />
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}

          {hasCompletedResearch && (executiveSummary || priorityFindings.length || recommendations.length) ? (
            <div id="plan" className="mt-6 grid scroll-mt-24 gap-5">
              {executiveSummary ? (
                <Panel>
                  <SectionTitle title="Curated Audit Summary" detail="Client-safe first-pass diagnosis from supplied public sources." />
                  <BulletedInsight text={executiveSummary} />
                </Panel>
              ) : null}
              {priorityFindings.length ? (
                <Panel>
                  <SectionTitle title="Priority Findings" detail="What the audit found and what to do next." />
                  <div className="grid gap-4 lg:grid-cols-3">
                    {priorityFindings.map((finding) => (
                      <div key={finding.title} className="border border-stoneLine bg-ivory p-4">
                        <h3 className="font-semibold text-ink">{finding.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">{finding.detail}</p>
                        <p className="mt-3 border-l-2 border-monk/40 pl-3 text-sm font-semibold leading-6 text-ink">{finding.action}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}
              <div className="grid gap-5 xl:grid-cols-2">
                {recommendations.length ? (
                  <Panel>
                    <SectionTitle title="Recommended Next Moves" />
                    <List items={recommendations} />
                  </Panel>
                ) : null}
                {quickWins.length ? (
                  <Panel>
                    <SectionTitle title="Quick Wins" />
                    <List items={quickWins} />
                  </Panel>
                ) : null}
              </div>
              {growthPlan.length ? (
                <Panel>
                  <SectionTitle title="30-Day Close Plan" detail="Concrete enough for the proposal, careful enough for a prospect." />
                  <div className="grid gap-3 md:grid-cols-2">
                    {growthPlan.map((item) => (
                      <p key={item} className="border border-stoneLine bg-ivory p-4 text-sm leading-6 text-muted">{item}</p>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          ) : null}

          <div id="evidence" className="mt-6 grid scroll-mt-24 gap-5 xl:grid-cols-2">
            <Panel>
              <SectionTitle title="Verified Public Data" detail="Facts or direct public observations from source links." />
              <div className="space-y-3 text-sm leading-6 text-muted">
                <Fact label="GBP / Maps" value={audit.hasGoogleBusinessProfile ? "Profile source available" : "Not confirmed"} />
                <Fact label="Website" value={audit.hasWebsite ? "Website detected" : "Not detected"} />
                <Fact label="Instagram" value={audit.hasInstagram ? "Social link available" : "Not detected"} />
                <Fact label="Reviews" value={ownReviewCount ? `${ownReviewCount} visible reviews` : "Not verified"} />
                <Fact label="Rating" value={ownRating ? String(ownRating) : "Not verified"} />
                {verifiedFacts.slice(0, 5).map((fact) => (
                  <Fact key={fact} label="Finding" value={fact} />
                ))}
              </div>
            </Panel>
            <Panel>
              <SectionTitle title="Strategic Inference" detail="Directional sales intelligence, not hard claims." />
              <p className="text-sm leading-7 text-muted">
                Public signals point to opportunities around local visibility, trust proof, contact flow, and tracking. Access to GBP insights, analytics, ad accounts, and booking/contact data is required before confirming performance impact.
              </p>
              {limitations.length ? (
                <div className="mt-4 space-y-2">
                  {limitations.map((item) => (
                    <p key={item} className="border-l-2 border-monk/40 pl-3 text-sm leading-6 text-muted">{item}</p>
                  ))}
                </div>
              ) : null}
            </Panel>
          </div>
    </>
  );
}

function parseScoreBreakdown(value: unknown): Score[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Score => {
      const candidate = item as Partial<Score>;
      return (
        typeof candidate.label === "string" &&
        typeof candidate.value === "number" &&
        (candidate.tone === "strong" || candidate.tone === "good" || candidate.tone === "gap" || candidate.tone === "foundational")
      );
    })
    .map((item) => ({
      label: item.label,
      value: item.value,
      tone: item.tone,
      detail: typeof item.detail === "string" ? item.detail : undefined
    }));
}

function parseStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseFindingList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { title: string; detail: string; action: string } => {
    const candidate = item as { title?: unknown; detail?: unknown; action?: unknown };
    return typeof candidate.title === "string" && typeof candidate.detail === "string" && typeof candidate.action === "string";
  });
}

function parseGeneration(value: unknown): Generation | null {
  const candidate = value as Partial<Record<keyof Generation, unknown>> | null;
  if (!candidate || typeof candidate.provider !== "string" || typeof candidate.model !== "string" || typeof candidate.status !== "string") return null;
  return {
    provider: candidate.provider,
    model: candidate.model,
    status: candidate.status,
    generatedAt: typeof candidate.generatedAt === "string" ? candidate.generatedAt : "",
    error: typeof candidate.error === "string" ? candidate.error : "",
    promptVersion: typeof candidate.promptVersion === "string" ? candidate.promptVersion : "",
    promptChars: numberOrZero(candidate.promptChars),
    responseChars: numberOrZero(candidate.responseChars),
    finishReason: typeof candidate.finishReason === "string" ? candidate.finishReason : "",
    responsePreview: typeof candidate.responsePreview === "string" ? candidate.responsePreview : "",
    apiStatus: typeof candidate.apiStatus === "string" ? candidate.apiStatus : ""
  };
}

function parseGoogleReviews(value: unknown): GoogleReviews | null {
  const candidate = value as Partial<GoogleReviews> | null;
  if (!candidate || typeof candidate !== "object") return null;
  return {
    rating: numberOrZero(candidate.rating),
    reviewCount: numberOrZero(candidate.reviewCount),
    priceLevel: typeof candidate.priceLevel === "number" ? candidate.priceLevel : undefined,
    address: textOrEmpty(candidate.address),
    phone: textOrEmpty(candidate.phone),
    website: textOrEmpty(candidate.website),
    sampleReviewCount: numberOrZero(candidate.sampleReviewCount),
    sampleAverageRating: typeof candidate.sampleAverageRating === "number" ? candidate.sampleAverageRating : undefined,
    latestReviewDate: textOrEmpty(candidate.latestReviewDate),
    ownerResponseCount: numberOrZero(candidate.ownerResponseCount),
    positiveSignals: parseStringList(candidate.positiveSignals),
    riskSignals: parseStringList(candidate.riskSignals),
    staffSignals: parseStringList(candidate.staffSignals),
    cleanlinessSignals: parseStringList(candidate.cleanlinessSignals),
    pricingSignals: parseStringList(candidate.pricingSignals),
    serviceSignals: parseStringList(candidate.serviceSignals),
    bookingSignals: parseStringList(candidate.bookingSignals),
    loyaltySignals: parseStringList(candidate.loyaltySignals),
    reviewHealthSummary: textOrEmpty(candidate.reviewHealthSummary),
    reviewInsights: parseStringList(candidate.reviewInsights),
    reviewThemes: parseStringList(candidate.reviewThemes),
    sampleReviews: parseSampleReviews(candidate.sampleReviews)
  };
}

function parseSampleReviews(value: unknown): SampleReview[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): SampleReview | null => {
      const candidate = item as Partial<SampleReview>;
      if (!candidate || typeof candidate !== "object" || typeof candidate.text !== "string") return null;
      return {
        author: textOrEmpty(candidate.author) || undefined,
        rating: typeof candidate.rating === "number" ? candidate.rating : undefined,
        relativeTime: textOrEmpty(candidate.relativeTime) || undefined,
        publishedAt: textOrEmpty(candidate.publishedAt) || undefined,
        text: candidate.text,
        ownerResponse: textOrEmpty(candidate.ownerResponse) || undefined
      };
    })
    .filter((item): item is SampleReview => Boolean(item));
}

function parseCompetitors(value: unknown): Competitor[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const candidate = item as Partial<Competitor>;
      if (!candidate || typeof candidate.name !== "string") return null;
      const parsed: Competitor = {
        name: candidate.name,
        rating: numberOrZero(candidate.rating),
        reviewCount: numberOrZero(candidate.reviewCount),
        priceLevel: typeof candidate.priceLevel === "number" ? candidate.priceLevel : undefined,
        address: textOrEmpty(candidate.address),
        socialSignals: parseSocialSignals(candidate.socialSignals),
        sampleReviewCount: numberOrZero(candidate.sampleReviewCount),
        sampleAverageRating: typeof candidate.sampleAverageRating === "number" ? candidate.sampleAverageRating : undefined,
        latestReviewDate: textOrEmpty(candidate.latestReviewDate),
        ownerResponseCount: numberOrZero(candidate.ownerResponseCount),
        reviewThemes: parseStringList(candidate.reviewThemes),
        whyDoingBetter: parseStringList(candidate.whyDoingBetter),
        possibleWeaknesses: parseStringList(candidate.possibleWeaknesses),
        recommendedResponse: parseStringList(candidate.recommendedResponse),
        winningFactors: parseStringList(candidate.winningFactors),
        lackingFactors: parseStringList(candidate.lackingFactors),
        riskSignals: parseStringList(candidate.riskSignals)
      };
      return parsed;
    })
    .filter((item): item is Competitor => Boolean(item));
}

function parseSocialSignals(value: unknown): CompetitorSocialSignals | undefined {
  const candidate = value as Partial<CompetitorSocialSignals> | null;
  if (!candidate || typeof candidate !== "object") return undefined;
  return {
    instagramUrl: textOrEmpty(candidate.instagramUrl),
    facebookUrl: textOrEmpty(candidate.facebookUrl),
    hasInstagram: Boolean(candidate.hasInstagram),
    hasFacebook: Boolean(candidate.hasFacebook),
    websiteMentionsReels: Boolean(candidate.websiteMentionsReels),
    signals: parseStringList(candidate.signals),
    limitations: parseStringList(candidate.limitations)
  };
}

function parseWebsiteSignals(value: unknown) {
  const candidate = value as { hasBookingCue?: unknown; hasPriceCue?: unknown; hasServiceCue?: unknown } | null;
  if (!candidate || typeof candidate !== "object") return null;
  return {
    hasBookingCue: Boolean(candidate.hasBookingCue),
    hasPriceCue: Boolean(candidate.hasPriceCue),
    hasServiceCue: Boolean(candidate.hasServiceCue)
  };
}

function parseInstagram(value: unknown) {
  const candidate = value as { handle?: unknown; accessible?: unknown } | null;
  if (!candidate || typeof candidate !== "object") return null;
  return {
    handle: textOrEmpty(candidate.handle),
    accessible: Boolean(candidate.accessible)
  };
}

function parseSalesBrief(value: unknown) {
  const candidate = value as { pitchAngle?: unknown; discoveryQuestions?: unknown; suggestedOffer?: unknown; nextAction?: unknown } | null;
  if (!candidate || typeof candidate !== "object") return null;
  return {
    pitchAngle: textOrEmpty(candidate.pitchAngle),
    discoveryQuestions: parseStringList(candidate.discoveryQuestions),
    suggestedOffer: textOrEmpty(candidate.suggestedOffer),
    nextAction: textOrEmpty(candidate.nextAction)
  };
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function textOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function InsightCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-4">
      <div className="flex items-center gap-2 text-monk">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-3">
      <div className="flex items-center gap-2 text-muted">
        <span className="shrink-0">{icon}</span>
        <p className="min-w-0 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function ReviewHistory({ sampleReviews }: { sampleReviews: SampleReview[] }) {
  const datedReviews = sampleReviews
    .filter((review) => review.publishedAt)
    .map((review) => ({ ...review, date: new Date(review.publishedAt || "") }))
    .filter((review) => Number.isFinite(review.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const monthly = datedReviews.reduce<Array<{ label: string; total: number; positive: number }>>((acc, review) => {
    const label = review.date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    const existing = acc.find((item) => item.label === label);
    const target = existing || { label, total: 0, positive: 0 };
    target.total += 1;
    if ((review.rating || 0) >= 4) target.positive += 1;
    if (!existing) acc.push(target);
    return acc;
  }, []);

  const maxTotal = Math.max(1, ...monthly.map((item) => item.total));
  const positiveCount = datedReviews.filter((review) => (review.rating || 0) >= 4).length;
  const latest = datedReviews[datedReviews.length - 1];
  const gaps = datedReviews.slice(1).map((review, index) => Math.round((review.date.getTime() - datedReviews[index].date.getTime()) / 86400000));
  const averageGap = gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : 0;
  const points = [
    datedReviews.length ? `${positiveCount}/${datedReviews.length} fetched dated reviews are positive or strong.` : "No dated review sample was available from Places.",
    latest ? `Latest fetched review was ${latest.date.toLocaleDateString()}.` : "Review recency needs a manual Google profile check.",
    averageGap ? `Average gap inside fetched sample is around ${averageGap} days.` : "Frequency cannot be estimated from a single dated review.",
    "Use this as sampled history only. Google Places returns a limited public sample, not the full review archive."
  ];

  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Review history sample</p>
          <p className="mt-1 text-sm leading-6 text-muted">Frequency and positivity from fetched Google review dates.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <span><strong className="block text-base text-ink">{datedReviews.length}</strong>dated</span>
          <span><strong className="block text-base text-ink">{positiveCount}</strong>positive</span>
          <span><strong className="block text-base text-ink">{averageGap || "N/A"}</strong>avg days</span>
        </div>
      </div>
      {monthly.length ? (
        <div className="grid gap-3">
          {monthly.map((item) => {
            const totalWidth = Math.max(6, (item.total / maxTotal) * 100);
            const positiveWidth = item.total ? (item.positive / item.total) * 100 : 0;
            return (
              <div key={item.label} className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)_70px] sm:items-center">
                <span className="text-xs font-semibold text-ink">{item.label}</span>
                <div className="h-3 bg-paper">
                  <div className="h-3 bg-monk" style={{ width: `${totalWidth}%` }}>
                    <div className="h-3 bg-sage" style={{ width: `${positiveWidth}%` }} />
                  </div>
                </div>
                <span className="text-xs text-muted">{item.positive}/{item.total} positive</span>
              </div>
            );
          })}
        </div>
      ) : null}
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted md:grid-cols-2">
        {points.map((point) => (
          <li key={point} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2">
            <span className="mt-2 h-1.5 w-1.5 bg-monk" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonBars({
  rows
}: {
  rows: Array<{ name: string; rating: number; reviews: number }>;
}) {
  const safeRows = rows.filter((row) => row.name);
  const maxReviews = Math.max(1, ...safeRows.map((row) => row.reviews || 0));
  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
      <BarChart
        title="Review volume"
        rows={safeRows.map((row) => ({
          name: row.name,
          value: row.reviews,
          max: maxReviews,
          display: row.reviews ? String(row.reviews) : "N/A"
        }))}
      />
      <BarChart
        title="Rating quality"
        rows={safeRows.map((row) => ({
          name: row.name,
          value: row.rating,
          max: 5,
          display: row.rating ? row.rating.toFixed(1) : "N/A"
        }))}
      />
    </div>
  );
}

function BarChart({
  title,
  rows
}: {
  title: string;
  rows: Array<{ name: string; value: number; max: number; display: string; detail?: string }>;
}) {
  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="grid gap-3">
        {rows.slice(0, 6).map((row, index) => {
          const width = Math.max(4, Math.min(100, ((row.value || 0) / Math.max(row.max, 1)) * 100));
          return (
            <div key={`${title}-${row.name}-${index}`} className="grid min-w-0 gap-1">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold text-ink" title={row.name}>{row.name}</span>
                <span className="shrink-0 text-right text-muted">{row.detail || row.display}</span>
              </div>
              <div className="h-2.5 overflow-hidden bg-paper">
                <div className="h-full bg-monk" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThemeGroup({ title, rows }: { title: string; rows: Array<[string, string[], string]> }) {
  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="grid gap-2">
        {rows.map(([label, items, empty]) => (
          <div key={label} className="grid gap-1 border-b border-stoneLine pb-2 last:border-0 last:pb-0">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="text-sm leading-6 text-ink">{items.length ? items.slice(0, 4).join(", ") : empty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="grid gap-2">
        {(items.length ? items : [empty]).slice(0, 5).map((item) => (
          <p key={item} className="border-l-2 border-monk/40 pl-3 text-sm leading-6 text-muted">{item}</p>
        ))}
      </div>
    </div>
  );
}

function ActionList({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.length ? items : ["Needs manual review."];
  return (
    <div className="min-w-0 border border-stoneLine bg-ivory p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</p>
      <ul className="space-y-2 text-sm leading-6 text-muted">
        {visibleItems.slice(0, 5).map((item) => (
          <li key={item} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2">
            <span className="mt-2 h-1.5 w-1.5 bg-monk" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BulletedInsight({ title, text }: { title?: string; text: string }) {
  const items = insightBullets(text);
  if (!items.length) return null;
  return (
    <div className="mt-5 border border-stoneLine bg-ivory p-4">
      {title ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</p> : null}
      <ul className="grid gap-2 text-sm leading-6 text-muted">
        {items.slice(0, 8).map((item) => (
          <li key={item} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2">
            <span className="mt-2 h-1.5 w-1.5 bg-monk" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function insightBullets(text: string) {
  return text
    .replace(/\n+/g, " ")
    .split(/(?=(?:Review position snapshot|Nearby competitor comparison|Consultant read|Manual Reels review needed|30-day Reels direction|Transformation reels|Trust reels|Decision reels|Local discovery reels|Conversion rhythm|[A-Z][^:]{2,70}:))/g)
    .flatMap((chunk) => chunk.split(/(?<=\.)\s+(?=[A-Z][A-Za-z& ]{2,55}:)/g))
    .map((item) => item.replace(/^[-\s]+/, "").trim())
    .filter(Boolean);
}

function List({ items }: { items: string[] }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-muted">
      {items.map((item) => (
        <p key={item} className="border-l-2 border-monk/40 pl-3">{item}</p>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] items-start gap-3 border-b border-stoneLine pb-2 last:border-0">
      <span className="min-w-0 text-muted">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-ink [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}
