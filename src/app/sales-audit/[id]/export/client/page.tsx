import { getAudit, listReportsForAudit } from "@/lib/server/repositories";

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

const baseCss = `
  @page { size: A4; margin: 16mm 20mm 14mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #F6F1E8; }
  body { max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         font-size: 10.5pt; line-height: 1.6; color: #1D1B18; background: #FFFCF6; }
  h1 { font-size: 22pt; font-weight: 700; line-height: 1.1; }
  h2 { font-size: 13pt; font-weight: 700; margin-bottom: 6pt; color: #1D1B18; }
  h3 { font-size: 11pt; font-weight: 700; margin-bottom: 4pt; }
  p  { margin-bottom: 6pt; }
  ul, ol { padding-left: 16pt; margin-bottom: 8pt; }
  li { margin-bottom: 3pt; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #F6F1E8; padding: 6pt 8pt; text-align: left;
       font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em;
       color: #6B6257; border-bottom: 1.5pt solid #E4D9C8; }
  td { padding: 6pt 8pt; vertical-align: top; border-bottom: 1pt solid #E4D9C8;
       color: #1D1B18; }
  tr:last-child td { border-bottom: none; }
  .page-break { page-break-before: always; }
  .no-break   { page-break-inside: avoid; }
  .section    { margin-bottom: 16pt; }
  .label      { font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.12em; color: #6B6257; margin-bottom: 4pt; }
  .grid-2     { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }
  .grid-3     { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12pt; }
  .card       { border: 1pt solid #E4D9C8; background: #F6F1E8; padding: 10pt;
                page-break-inside: avoid; }
  .badge      { display: inline-block; padding: 2pt 7pt; font-size: 8pt;
                font-weight: 700; border: 1pt solid; }
  .bullet-row { display: flex; gap: 8pt; margin-bottom: 5pt; }
  .bullet-dot { width: 6pt; height: 6pt; background: #B96324; margin-top: 5pt;
                flex-shrink: 0; }
  .print-btn  { position: fixed; bottom: 20px; right: 20px; z-index: 9999;
                background: #1D1B18; color: #FFFCF6; border: none; padding: 10px 20px;
                font-size: 13px; font-weight: 700; cursor: pointer; }
  @media print { .print-btn { display: none !important; }
                 html, body { max-width: none; min-height: auto; margin: 0; background: white; }
                 a { color: inherit; text-decoration: none; } }
  .cover { background: #FFFCF6; color: #1D1B18;
           padding: 16mm 0 14mm 0; page-break-after: always; border-top: 5pt solid #B96324; border-bottom: 1pt solid #E4D9C8; }
  .cover-top { margin-bottom: 26pt; }
  .cover-center { max-width: 150mm; }
  .cover-footer { border-top: 1pt solid #E4D9C8; padding-top: 12pt;
                  font-size: 8.5pt; color: #6B6257; display: flex;
                  justify-content: space-between; }
  .section-title { border-left: 3pt solid #B96324; padding-left: 8pt; }
  .score-bar { height: 5pt; background: #E4D9C8; margin-top: 4pt; }
  .score-bar-fill { height: 5pt; background: #B96324; }
  .dark-page { background: #FFFCF6; color: #1D1B18; min-height: 120mm; padding: 18mm 0; border-top: 5pt solid #B96324; display:flex; flex-direction:column; justify-content:center; text-align:center; }
`;

export default async function ClientExportPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  const reports = audit ? await listReportsForAudit(params.id) : [];
  const clientReport = reports
    .filter((report) => report.type === "client_growth_due_diligence")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!audit) return null;

  const finalData = audit.finalDataUsed || {};
  const discoveredData = audit.discoveredData || {};
  const scoreBreakdown = parseScoreBreakdown(finalData.scoreBreakdown);
  const executiveSummary = parseTextOrEmpty(finalData.executiveSummary);
  const priorityFindings = parseFindings(finalData.priorityFindings);
  const recommendations = parseStringList(finalData.recommendations);
  const quickWins = parseStringList(finalData.quickWins);
  const growthPlan90 = parseStringList(finalData.growthPlan90);
  const googleReviewAnalysis = parseTextOrEmpty(finalData.googleReviewAnalysis);
  const competitorAnalysis = parseTextOrEmpty(finalData.competitorAnalysis);
  const instagramAnalysis = parseTextOrEmpty(finalData.instagramAnalysis);
  const pricingAnalysis = parseTextOrEmpty(finalData.pricingAnalysis);
  const verifiedFacts = parseStringList(finalData.verifiedFacts);
  const limitations = parseStringList(finalData.limitations);
  const internalSalesBrief = parseRecord(finalData.internalSalesBrief);
  const suggestedOffer = parseTextOrEmpty(internalSalesBrief.suggestedOffer);
  const googleReviews = parseGoogleReviews(discoveredData.googleReviews);
  const competitors = parseCompetitors(discoveredData.competitors);
  const markdown = clientReport?.clientReportMarkdown || clientReport?.markdown || "";
  const preparedDate = formatDate(clientReport?.updatedAt || audit.lastUpdated);
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || audit.city;
  const systemText = extractMarkdownSection(markdown, "Recommended GrowingMonk Growth System");
  const gapGroups = buildGapGroups(markdown, priorityFindings);
  const planColumns = splitPlan(growthPlan90);

  return (
    <>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width" />
          <title>{audit.businessName} — Growth Intelligence Report</title>
          <style>{baseCss}</style>
        </head>
        <body>
          <button className="print-btn" type="button" data-print-button>Print / Save PDF</button>
          <script dangerouslySetInnerHTML={{ __html: `document.addEventListener("click",function(e){if(e.target&&e.target.matches("[data-print-button]"))window.print();});` }} />

          <section className="cover">
            <div className="cover-top"><span style={{ fontWeight: 700, color: "#B96324", fontSize: "15pt" }}>GrowingMonk</span></div>
            <div className="cover-center">
              <p style={{ color: "#B96324", fontSize: "8pt", letterSpacing: "0.18em", fontWeight: 700 }}>GROWTH INTELLIGENCE REPORT</p>
              <h1 style={{ color: "#1D1B18", fontSize: "28pt" }}>{audit.businessName}</h1>
              <p style={{ color: "#6B6257", fontSize: "12pt", marginTop: "8pt" }}>{market} · {audit.category}</p>
              <div className="no-break" style={{ marginTop: "28pt" }}>
                <span style={{ ...styleObject(scoreChipStyle(audit.score)), width: 72, height: 72, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", borderWidth: "2.5px", fontSize: "22pt", fontWeight: 700 }}>{audit.score || "—"}</span>
                <p style={{ fontSize: "8.5pt", marginTop: "6pt", color: "#6B6257" }}>Growth Readiness Score</p>
              </div>
            </div>
            <div className="cover-footer">
              <span>Prepared exclusively for {audit.businessName}</span>
              <span>{preparedDate}</span>
              <span>Confidential · GrowingMonk</span>
            </div>
          </section>

          <main>
            <section className="section grid-2" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
              <div>
                <h2 className="section-title">Executive Summary</h2>
                <p>{executiveSummary || "Research completed. See detailed sections below."}</p>
                <h3 style={{ marginTop: "12pt" }}>Priority Findings</h3>
                {(priorityFindings.length ? priorityFindings : fallbackFindings()).slice(0, 3).map((finding) => (
                  <div className="card" key={finding.title} style={{ marginBottom: "8pt" }}>
                    <h3 style={{ color: "#B96324" }}>{finding.title}</h3>
                    <p>{finding.detail}</p>
                    <p style={{ fontSize: "9pt", color: "#6B6257", marginTop: "4pt" }}>Recommended: {finding.action}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: "#F6F1E8", padding: "14pt" }}>
                <p className="label">Growth Readiness Score</p>
                <p style={{ ...styleObject(scoreChipStyle(audit.score)), border: "none", background: "transparent", fontSize: "30pt", fontWeight: 700 }}>{audit.score || "Pending"} / 100</p>
                {(scoreBreakdown.length ? scoreBreakdown : [{ label: "Overall Growth Readiness", value: audit.score, detail: "Weighted score from public-source evidence." }]).map((score) => (
                  <div key={score.label} style={{ marginBottom: "8pt" }} className="no-break">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9pt" }}>
                      <span>{score.label}</span>
                      <span style={{ fontWeight: 700 }}>{score.value}/100</span>
                    </div>
                    <div className="score-bar"><div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, score.value))}%` }} /></div>
                    <p style={{ fontSize: "8.5pt", color: "#6B6257", marginTop: "3pt" }}>{score.detail}</p>
                  </div>
                ))}
                <p style={{ fontSize: "8pt", color: "#6B6257" }}>Scoring: GBP 20% · Reviews 20% · Website 20% · Social 15% · Competitors 10% · Tracking 10% · Paid 5%</p>
              </div>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Public Data Verified</h2>
              <div className="grid-2">
                <div>
                  <div className="grid-2" style={{ gap: "8pt", marginBottom: "10pt" }}>
                    <Coverage label="Google / GBP" value={audit.hasGoogleBusinessProfile ? "Provided" : "Not confirmed"} positive={audit.hasGoogleBusinessProfile} />
                    <Coverage label="Website" value={audit.hasWebsite ? "Detected" : "Not detected"} positive={audit.hasWebsite} />
                    <Coverage label="Instagram" value={audit.hasInstagram ? "Detected" : "Not detected"} positive={audit.hasInstagram} />
                    <Coverage label="Reviews" value={audit.reviewCount ? `${audit.reviewCount} visible` : "Not verified"} positive={Boolean(audit.reviewCount)} />
                  </div>
                  {verifiedFacts.slice(0, 8).map((fact) => <EvidenceLine key={fact} text={fact} />)}
                </div>
                <div className="card">
                  <p className="label">GBP Signals</p>
                  <p style={{ fontSize: "18pt", fontWeight: 700 }}>{audit.rating || "Not verified"}</p>
                  <p>{audit.reviewCount || "Not verified"} reviews</p>
                  <p style={{ color: "#6B6257", overflowWrap: "anywhere" }}>{audit.sourceLinks?.googleMapsUrl || "Google Maps source not provided"}</p>
                  <p>For {audit.category || "this category"}, Google Business Profile quality influences first-click trust, calls, directions, and local competitor comparison.</p>
                </div>
              </div>
              <p style={{ marginTop: "10pt" }}>
                <Legend label="Verified" color="#657760" /> <Legend label="Observed" color="#B96324" /> <Legend label="Inferred" color="#6B6257" /> <Legend label="Needs Review" color="#B45309" /> <Legend label="Not Found" color="#B91C1C" />
              </p>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Google Reviews Intelligence</h2>
              <div className="grid-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", marginBottom: "12pt" }}>
                <Stat label="Rating" value={String(googleReviews?.rating || audit.rating || "Not verified")} />
                <Stat label="Review count" value={String(googleReviews?.reviewCount || audit.reviewCount || "Not verified")} />
                <Stat label="Latest review" value={googleReviews?.latestReviewDate ? formatDate(googleReviews.latestReviewDate) : "Not visible"} />
                <Stat label="Review health" value={googleReviews?.reviewHealthSummary || "Needs review"} />
              </div>
              {googleReviews ? (
                <>
                  <div className="grid-2">
                    <SignalBlock title="Proof to Reuse" color="#657760" groups={[googleReviews.positiveSignals, googleReviews.staffSignals.slice(0, 3), googleReviews.loyaltySignals.slice(0, 3)]} />
                    <SignalBlock title="Friction to Inspect" color="#B91C1C" groups={[googleReviews.riskSignals, googleReviews.pricingSignals.slice(0, 3), googleReviews.bookingSignals.slice(0, 3)]} />
                  </div>
                  {googleReviews.sampleReviews.slice(0, 2).map((review, index) => (
                    <div className="card no-break" key={`${review.author}-${index}`} style={{ marginTop: "8pt" }}>
                      <p style={{ color: "#B96324", fontWeight: 700 }}>{"★".repeat(Math.max(1, Math.min(5, review.rating || 0)))} <span style={{ color: "#6B6257" }}>{review.author || "Reviewer"} · {review.relativeTime || "Recent"}</span></p>
                      <p>{truncate(review.text || "", 200)}</p>
                      {review.ownerResponse ? <p style={{ fontStyle: "italic", color: "#6B6257" }}>Owner response: {truncate(review.ownerResponse, 180)}</p> : null}
                    </div>
                  ))}
                </>
              ) : null}
              <p>{googleReviewAnalysis || "Review analysis should be completed with Google Places data or manual profile review."}</p>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Competitor Comparison</h2>
              {competitors.length ? (
                <>
                  <table>
                    <thead><tr><th>Business</th><th>Rating</th><th>Reviews</th><th>Strengths</th><th>Weakness / Gap</th></tr></thead>
                    <tbody>
                      {competitorRows(audit.businessName, audit.rating, audit.reviewCount, competitors).map((row, index) => (
                        <tr key={row.name} style={index === 0 ? { background: "#F6F1E8" } : undefined}>
                          <td>{row.name}</td>
                          <td style={{ fontWeight: row.rating === maxRating(competitors, audit.rating) ? 700 : undefined }}>{row.rating || "N/A"}</td>
                          <td style={{ fontWeight: row.reviewCount === maxReviews(competitors, audit.reviewCount) ? 700 : undefined }}>{row.reviewCount || "N/A"}</td>
                          <td>{row.strengths}</td>
                          <td>{row.weaknesses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ marginTop: "10pt" }}>{competitorAnalysis}</p>
                </>
              ) : (
                <div className="card">Competitor data is collected during audit research. Verify the top 3-5 nearby competitors manually using Google Maps for rating, review count, and review themes.</div>
              )}
            </section>

            <section className="section grid-2">
              <div><h2 className="section-title">Pricing and Positioning</h2>{paragraphs(pricingAnalysis || "Pricing position needs manual review.")}</div>
              <div><h2 className="section-title">Instagram / Social Media</h2>{paragraphs(instagramAnalysis || "Instagram and social proof need manual review.")}</div>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Highest-Impact Growth Gaps</h2>
              <div className="grid-2">
                {gapGroups.map((group) => (
                  <div className="card" key={group.title}>
                    <h3 style={{ color: "#B96324" }}>{group.title}</h3>
                    <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ))}
              </div>
              <h2 className="section-title" style={{ marginTop: "16pt" }}>Recommended Quick Wins</h2>
              <div className="grid-2">
                {(quickWins.length ? quickWins : recommendations).slice(0, 6).map((item) => (
                  <div className="card bullet-row" key={item}><span className="bullet-dot" /><span>{item}</span></div>
                ))}
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">30 / 60 / 90 Day Growth Plan</h2>
              <div className="grid-3">
                <PlanColumn title="30 Days" sub="Foundation" color="#B96324" items={planColumns[0]} />
                <PlanColumn title="60 Days" sub="Demand Building" color="#D88A33" items={planColumns[1]} />
                <PlanColumn title="90 Days" sub="Scale Readiness" color="#657760" items={planColumns[2]} />
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">Recommended GrowingMonk Growth System</h2>
              {systemText ? paragraphs(systemText) : (
                <div className="grid-3">
                  <Phase title="Month 1" value="Visibility Foundation" detail="GBP, reviews, contact path, tracking" />
                  <Phase title="Month 2" value="Demand Building" detail="Instagram, Google posts, landing sections" />
                  <Phase title="Month 3" value="Scale Readiness" detail="Paid campaigns, reporting, optimization" />
                </div>
              )}
              <div style={{ marginTop: "12pt" }}>
                <p className="label">Research Limitations</p>
                <ul style={{ color: "#6B6257", fontSize: "9pt", fontStyle: "italic" }}>
                  {(limitations.length ? limitations : ["This audit is limited to provided public sources."]).slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </section>

            <section className="dark-page page-break">
              <div>
                <span style={{ fontWeight: 700, color: "#B96324", fontSize: "15pt" }}>GrowingMonk</span>
                <h1 style={{ color: "#1D1B18", fontSize: "20pt", marginTop: "22pt" }}>Book Your Growth Strategy Call</h1>
                <p style={{ color: "#6B6257", fontSize: "11pt", maxWidth: "360px", margin: "12pt auto" }}>
                  GrowingMonk can convert this audit into a focused 30-day execution sprint. Local visibility, trust proof, conversion flow, tracking, and demand generation.
                </p>
                <div style={{ border: "1.5pt solid #E4D9C8", background: "#F6F1E8", padding: "14pt", margin: "24pt auto 0", maxWidth: "320px" }}>
                  <p className="label">Recommended Next Step</p>
                  <p style={{ color: "#1D1B18", fontSize: "13pt", fontWeight: 700 }}>{suggestedOffer || "30-Day Growth Sprint"}</p>
                </div>
                <div style={{ marginTop: "34pt", color: "#6B6257", fontSize: "8.5pt" }}>
                  <p>growingmonk.com | Growth Intelligence Report | {preparedDate}</p>
                  <p>Generated by MonkAudit · For {audit.businessName} · Confidential</p>
                </div>
              </div>
            </section>
          </main>
        </body>
      </html>
    </>
  );
}

function scoreChipStyle(score: number): string {
  if (score === 0) return "background:#F6F1E8;border:1px solid #E4D9C8;color:#6B6257";
  if (score <= 39) return "background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C";
  if (score <= 64) return "background:#FFFBEB;border:1px solid #FDE68A;color:#B45309";
  if (score <= 79) return "background:#F0FDF4;border:1px solid #BBF7D0;color:#15803D";
  return "background:#ECFDF5;border:1px solid #6EE7B7;color:#065F46";
}

function parseStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
}

function parseTextOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function evidenceLabel(text: string): { label: string; color: string } | null {
  if (text.startsWith("Verified:")) return { label: "Verified", color: "#657760" };
  if (text.startsWith("Observed:")) return { label: "Observed", color: "#B96324" };
  if (text.startsWith("Inferred:")) return { label: "Inferred", color: "#6B6257" };
  if (text.startsWith("Needs Manual Review:")) return { label: "Needs Review", color: "#B45309" };
  if (text.startsWith("Not Found:")) return { label: "Not Found", color: "#B91C1C" };
  return null;
}

function formatDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isFinite(date.getTime()) ? date : new Date();
  return validDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function parseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseScoreBreakdown(value: unknown): ScoreItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((item) => typeof item.label === "string" && typeof item.value === "number").map((item) => ({
    label: String(item.label),
    value: Number(item.value),
    tone: parseTextOrEmpty(item.tone),
    detail: parseTextOrEmpty(item.detail)
  }));
}

function parseFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((item) => typeof item.title === "string").map((item) => ({
    title: parseTextOrEmpty(item.title),
    detail: parseTextOrEmpty(item.detail),
    action: parseTextOrEmpty(item.action)
  }));
}

function parseGoogleReviews(value: unknown): GoogleReviews | null {
  const record = parseRecord(value);
  if (!Object.keys(record).length) return null;
  return {
    rating: typeof record.rating === "number" ? record.rating : undefined,
    reviewCount: typeof record.reviewCount === "number" ? record.reviewCount : undefined,
    positiveSignals: parseStringList(record.positiveSignals),
    riskSignals: parseStringList(record.riskSignals),
    staffSignals: parseStringList(record.staffSignals),
    loyaltySignals: parseStringList(record.loyaltySignals),
    pricingSignals: parseStringList(record.pricingSignals),
    bookingSignals: parseStringList(record.bookingSignals),
    sampleReviews: Array.isArray(record.sampleReviews) ? record.sampleReviews.map((item) => parseRecord(item)).map((item) => ({
      author: parseTextOrEmpty(item.author),
      rating: typeof item.rating === "number" ? item.rating : undefined,
      relativeTime: parseTextOrEmpty(item.relativeTime),
      text: parseTextOrEmpty(item.text),
      ownerResponse: parseTextOrEmpty(item.ownerResponse)
    })) : [],
    reviewHealthSummary: parseTextOrEmpty(record.reviewHealthSummary),
    latestReviewDate: parseTextOrEmpty(record.latestReviewDate)
  };
}

function parseCompetitors(value: unknown): Competitor[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((item) => typeof item.name === "string").map((item) => ({
    name: parseTextOrEmpty(item.name),
    rating: typeof item.rating === "number" ? item.rating : undefined,
    reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : undefined,
    winningFactors: parseStringList(item.winningFactors),
    possibleWeaknesses: parseStringList(item.possibleWeaknesses)
  }));
}

function styleObject(style: string): React.CSSProperties {
  return Object.fromEntries(style.split(";").filter(Boolean).map((rule) => {
    const [key, value] = rule.split(":");
    return [key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value];
  })) as React.CSSProperties;
}

function Coverage({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return <div className="card"><p className="label">{label}</p><p style={{ fontWeight: 700, color: positive ? "#657760" : "#6B6257" }}>{value}</p></div>;
}

function EvidenceLine({ text }: { text: string }) {
  const evidence = evidenceLabel(text);
  const stripped = evidence ? text.replace(new RegExp(`^${evidence.label === "Needs Review" ? "Needs Manual Review" : evidence.label}:\\s*`), "") : text;
  return <p><span className="badge" style={{ borderColor: evidence?.color || "#E4D9C8", color: evidence?.color || "#6B6257" }}>{evidence?.label || "Evidence"}</span> {stripped}</p>;
}

function Legend({ label, color }: { label: string; color: string }) {
  return <span style={{ color, fontWeight: 700, marginRight: "8pt" }}>{label}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="label">{label}</p><p style={{ fontWeight: 700 }}>{value}</p></div>;
}

function SignalBlock({ title, color, groups }: { title: string; color: string; groups: string[][] }) {
  const items = groups.flat().filter(Boolean).slice(0, 10);
  return <div style={{ borderLeft: `3pt solid ${color}`, paddingLeft: "8pt" }}><h3>{title}</h3><ul>{(items.length ? items : ["Needs manual review."]).map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function competitorRows(subject: string, rating: number, reviews: number, competitors: Competitor[]) {
  return [
    { name: subject, rating, reviewCount: reviews, strengths: "Subject business", weaknesses: "Use report gaps for improvement focus" },
    ...competitors.slice(0, 5).map((item) => ({
      name: item.name,
      rating: item.rating || 0,
      reviewCount: item.reviewCount || 0,
      strengths: item.winningFactors.join(", ") || "Needs manual review",
      weaknesses: item.possibleWeaknesses.join(", ") || "Verify service proof and contact flow"
    }))
  ];
}

function maxRating(competitors: Competitor[], own: number) {
  return Math.max(own || 0, ...competitors.map((item) => item.rating || 0));
}

function maxReviews(competitors: Competitor[], own: number) {
  return Math.max(own || 0, ...competitors.map((item) => item.reviewCount || 0));
}

function paragraphs(text: string) {
  return text.split(/\n{2,}/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function extractMarkdownSection(markdown: string, title: string) {
  const pattern = new RegExp(`^#{1,3}\\s+${escapeRegex(title)}\\s*$([\\s\\S]*?)(?=^#{1,3}\\s+|\\z)`, "im");
  return markdown.match(pattern)?.[1]?.trim() || "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildGapGroups(markdown: string, findings: Finding[]) {
  const titles = ["Visibility Improvements", "Trust Improvements", "Conversion Improvements", "Social Improvements", "Paid Growth Readiness"];
  return titles.map((title, index) => {
    const text = extractMarkdownSection(markdown, title);
    const items = text ? text.split("\n").map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean).slice(0, 4) : findings.slice(index, index + 2).map((finding) => finding.detail || finding.title);
    return { title, items: items.length ? items : ["Needs manual review and prioritization."] };
  });
}

function splitPlan(items: string[]) {
  const source = items.length ? items : [
    "Fix GBP completeness, reviews, contact path, and tracking.",
    "Build demand with Instagram, Google posts, and landing sections.",
    "Prepare paid campaigns, reporting, and optimization rhythm."
  ];
  const size = Math.ceil(source.length / 3);
  return [source.slice(0, size), source.slice(size, size * 2), source.slice(size * 2)];
}

function PlanColumn({ title, sub, color, items }: { title: string; sub: string; color: string; items: string[] }) {
  return <div className="card" style={{ borderTop: `3pt solid ${color}` }}><h3 style={{ color }}>{title}</h3><p className="label">{sub}</p><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function Phase({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="card"><p className="label">{title}</p><h3 style={{ color: "#B96324" }}>{value}</h3><p>{detail}</p></div>;
}

function fallbackFindings(): Finding[] {
  return [
    { title: "Visibility needs review", detail: "Confirm GBP, website, social proof, and source consistency.", action: "Complete manual source review." },
    { title: "Trust proof needs structure", detail: "Reviews, photos, services, and proof should be clearer before outreach.", action: "Prioritize GBP and review improvements." },
    { title: "Conversion flow needs validation", detail: "Calls, WhatsApp, booking, and tracking should be checked.", action: "Audit contact path and tracking." }
  ];
}
