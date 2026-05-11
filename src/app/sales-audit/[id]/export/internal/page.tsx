import { getAudit, listReportsForAudit } from "@/lib/server/repositories";
import { auditModeLabel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScoreItem = { label: string; value: number; detail?: string };
type Finding = { title: string; detail: string; action: string };
type InternalBrief = {
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
  latestReviewDate?: string;
  winningFactors: string[];
  possibleWeaknesses: string[];
  lackingFactors: string[];
  socialSignals?: { hasInstagram?: boolean };
};

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
  .confidential-bar { background: #B91C1C; color: white; padding: 6pt 20mm;
                      font-size: 8pt; font-weight: 700; letter-spacing: 0.12em;
                      text-align: center; text-transform: uppercase;
                      position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
  @media print { .confidential-bar { position: static; } }
  .do-not-claim { border: 1.5pt solid #B91C1C; background: #FEF2F2;
                  padding: 10pt; margin-top: 12pt; }
  .do-not-claim h3 { color: #B91C1C; }
  .meta-table td:first-child { color: #6B6257; width: 38%; }
  .meta-table td:last-child { font-weight: 700; }
  .confidential-watermark { color: #B91C1C; font-size: 7.5pt; font-weight: 700;
                            letter-spacing: 0.12em; text-transform: uppercase; }
  .section-title { border-left: 3pt solid #B96324; padding-left: 8pt; }
`;

export default async function InternalExportPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  const reports = audit ? await listReportsForAudit(params.id) : [];
  const internalReport = reports
    .filter((report) => report.type === "internal_sales_brief")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!audit) return null;

  const finalData = audit.finalDataUsed || {};
  const discoveredData = audit.discoveredData || {};
  const briefMarkdown = internalReport?.internalBriefMarkdown || internalReport?.markdown || "";
  const internalSalesBrief = parseInternalBrief(finalData.internalSalesBrief);
  const scoreBreakdown = parseScoreBreakdown(finalData.scoreBreakdown);
  const verifiedFacts = parseStringList(finalData.verifiedFacts);
  const limitations = parseStringList(finalData.limitations);
  const generation = parseRecord(finalData.generation);
  const scoringWeights = parseNumberRecord(finalData.scoringWeights);
  const priorityFindings = parseFindings(finalData.priorityFindings);
  const quickWins = parseStringList(finalData.quickWins);
  const recommendations = parseStringList(finalData.recommendations);
  const competitorAnalysis = parseTextOrEmpty(finalData.competitorAnalysis);
  const googleReviews = parseRecord(discoveredData.googleReviews);
  const competitors = parseCompetitors(discoveredData.competitors);
  const competitorReviewPosition = parseRecord(discoveredData.competitorReviewPosition);
  const websiteSignals = parseRecord(discoveredData.websiteSignals);
  const instagram = parseRecord(discoveredData.instagram);
  const preparedDate = formatDate(internalReport?.updatedAt || audit.lastUpdated);
  const market = [audit.area || audit.city, audit.country !== "Unknown" ? audit.country : ""].filter(Boolean).join(", ") || audit.city;
  const sourceCoverage = [audit.hasGoogleBusinessProfile, audit.hasWebsite, audit.hasInstagram, Boolean(parseTextOrEmpty(googleReviews.phone) || parseTextOrEmpty(discoveredData.detectedPhone))].filter(Boolean).length;
  const doNotClaim = internalSalesBrief.doNotClaim.length ? internalSalesBrief.doNotClaim : [
    "Exact revenue loss or guaranteed revenue improvement",
    "Guaranteed ranking positions on Google or Maps",
    "Competitor names or specific performance claims without verification",
    "Internal cost, staff quality, or management assessments"
  ];

  return (
    <>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width" />
          <title>{audit.businessName} — Internal Sales Brief</title>
          <style>{baseCss}</style>
        </head>
        <body>
          <button className="print-btn" type="button" data-print-button>Print / Save PDF</button>
          <script dangerouslySetInnerHTML={{ __html: `document.addEventListener("click",function(e){if(e.target&&e.target.matches("[data-print-button]"))window.print();});` }} />
          <div className="confidential-bar">INTERNAL — CONFIDENTIAL — NOT FOR CLIENT DISTRIBUTION</div>

          <section style={{ paddingTop: "10mm", minHeight: "120mm", display: "flex", flexDirection: "column", background: "#FFFCF6", pageBreakAfter: "always", borderTop: "5pt solid #B96324" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#B96324", fontSize: "16pt" }}>GrowingMonk</span>
              <span className="badge" style={{ borderColor: "#B91C1C", color: "#B91C1C" }}>CONFIDENTIAL</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p className="label">MonkAudit Internal Sales Brief</p>
              <h1 style={{ fontSize: "26pt" }}>{audit.businessName}</h1>
              <p style={{ color: "#6B6257", fontSize: "12pt" }}>{market} · {audit.category}</p>
              <div className="grid-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1pt solid #E4D9C8", borderBottom: "1pt solid #E4D9C8", padding: "10pt", marginTop: "16pt" }}>
                <QuickRef label="Score" value={`${audit.score || "—"}/100`} styleText={scoreChipStyle(audit.score)} />
                <QuickRef label="Rating" value={audit.rating ? String(audit.rating) : "Not verified"} />
                <QuickRef label="Reviews" value={audit.reviewCount ? String(audit.reviewCount) : "Not verified"} />
                <QuickRef label="Audit Mode" value={auditModeLabel(audit.auditMode)} />
              </div>
              <table className="meta-table" style={{ marginTop: "20pt", width: "55%" }}>
                <tbody>
                  <Meta label="Prepared" value={preparedDate} />
                  <Meta label="Assigned to" value={audit.assignedTo} />
                  <Meta label="Reviewer" value={audit.assignedStrategist} />
                  <Meta label="Team" value={audit.teamId} />
                  <Meta label="Audit mode" value={auditModeLabel(audit.auditMode)} />
                  <Meta label="AI generation" value={parseTextOrEmpty(generation.status) === "gemini_generated" ? "Gemini" : "Fallback template"} />
                  <Meta label="Report status" value={internalReport?.reportStatus || "Draft Generated"} />
                </tbody>
              </table>
            </div>
            <div>
              <p className="label">Source Coverage</p>
              <SourceBadge label="GBP/Maps" positive={audit.hasGoogleBusinessProfile} />
              <SourceBadge label="Website" positive={audit.hasWebsite} />
              <SourceBadge label="Instagram" positive={audit.hasInstagram} />
              <SourceBadge label="Phone" positive={Boolean(parseTextOrEmpty(googleReviews.phone) || parseTextOrEmpty(discoveredData.detectedPhone))} />
            </div>
          </section>

          <main>
            <section className="section page-break">
              <h2 className="section-title">Deal Closing Snapshot</h2>
              <p className="label">Sales-ready guidance from public-source research.</p>
              <div className="grid-2">
                <Snapshot title="Pitch Angle" value={internalSalesBrief.pitchAngle || "Lead with local visibility, trust proof, and contact flow."} />
                <Snapshot title="Suggested Offer" value={internalSalesBrief.suggestedOffer || "30-Day Growth Sprint"} />
                <Snapshot title="Next Ask" value={internalSalesBrief.nextAction || "Request GBP, analytics, and social access."} />
                <Snapshot title="Source Confidence" value={`${audit.hasGoogleBusinessProfile ? "Medium" : "Low"}. Based on ${sourceCoverage}/4 public sources resolved.`} />
              </div>
              <h3 style={{ marginTop: "14pt" }}>Likely Pain Points</h3>
              <BulletList items={internalSalesBrief.likelyPainPoints.length ? internalSalesBrief.likelyPainPoints : ["Local visibility, trust proof, enquiry flow, and tracking may be incomplete."]} />
            </section>

            <section className="section">
              <h2 className="section-title">Priority Findings</h2>
              <div className="grid-3">
                {(priorityFindings.length ? priorityFindings : fallbackFindings()).slice(0, 3).map((finding, index) => (
                  <div className="card no-break" key={finding.title}>
                    <span style={{ display: "inline-flex", width: "18pt", height: "18pt", borderRadius: "50%", alignItems: "center", justifyContent: "center", background: "#B96324", color: "white", fontWeight: 700 }}>{index + 1}</span>
                    <h3 style={{ marginTop: "8pt" }}>{finding.title}</h3>
                    <p>{finding.detail}</p>
                    <p style={{ color: "#B96324", fontSize: "9pt" }}>→ {finding.action}</p>
                  </div>
                ))}
              </div>
              <div className="grid-2" style={{ marginTop: "14pt" }}>
                <div><h3>Recommended Next Moves</h3><ol>{recommendations.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ol></div>
                <div><h3>Quick Wins</h3><BulletList items={quickWins.slice(0, 6)} /></div>
              </div>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Sales Discovery Preparation</h2>
              <div className="grid-2">
                <div><h3>Discovery Questions</h3><ol>{internalSalesBrief.discoveryQuestions.map((item) => <li key={item}>{item}</li>)}</ol></div>
                <div>
                  <h3>Data to Request from Client</h3>
                  <BulletList items={["Google Business Profile access or screenshots", "Google Analytics / Search Console access", "Ad account access (if running ads)", "Instagram insights (screenshots)", "Monthly enquiry / booking volume", "Current monthly marketing spend"]} />
                </div>
              </div>
              <div className="card" style={{ marginTop: "12pt" }}>
                <h3>Objection Handling</h3>
                {paragraphs(internalSalesBrief.objectionHandling || "Keep the conversation anchored to verified public evidence, measurement gaps, and a low-risk first sprint.")}
              </div>
              <div className="do-not-claim no-break">
                <h3>⚠ Do Not Claim in Client Materials</h3>
                <ul>{doNotClaim.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Growth Readiness Scores + Evidence</h2>
              <table>
                <thead><tr><th>Category</th><th>Score</th><th>Weight</th><th>Detail</th></tr></thead>
                <tbody>
                  {scoreBreakdown.map((score) => (
                    <tr key={score.label}>
                      <td>{score.label}</td>
                      <td><span className="badge" style={styleObject(scoreChipStyle(score.value))}>{score.value}</span></td>
                      <td>{(((scoringWeights[score.label] || 0) as number) * 100).toFixed(0)}%</td>
                      <td>{score.detail || "Directional public-source evidence."}</td>
                    </tr>
                  ))}
                  <tr><td style={{ fontWeight: 700 }}>Overall Score</td><td>{audit.score}</td><td>—</td><td>Weighted composite</td></tr>
                </tbody>
              </table>
              <div className="grid-2" style={{ marginTop: "12pt" }}>
                <div><h3>Verified Public Data</h3>{verifiedFacts.slice(0, 10).map((fact) => <EvidenceLine key={fact} text={fact} />)}</div>
                <div><h3>Research Limitations</h3><ul style={{ color: "#B45309" }}>{limitations.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul><p>Access to GBP Insights, ad accounts, and analytics required for performance claims.</p></div>
              </div>
              <p className="label" style={{ marginTop: "12pt" }}>Source Links Used</p>
              <table><tbody>
                <Meta label="Google Maps" value={audit.sourceLinks?.googleMapsUrl || "Not provided"} />
                <Meta label="Website" value={audit.sourceLinks?.website || "Not provided"} />
                <Meta label="Instagram" value={audit.sourceLinks?.instagramUrl || "Not provided"} />
                <Meta label="Facebook" value={audit.sourceLinks?.facebookUrl || "Not provided"} />
              </tbody></table>
            </section>

            <section className="section">
              <h2 className="section-title">Competitor Intelligence</h2>
              {Object.keys(competitorReviewPosition).length ? (
                <div className="card" style={{ marginBottom: "12pt" }}>
                  <p>{parseTextOrEmpty(competitorReviewPosition.summary)}</p>
                  <p><strong>Review gap vs top:</strong> {String(competitorReviewPosition.reviewVolumeGapVsTop || "N/A")}</p>
                </div>
              ) : null}
              <table>
                <thead><tr><th>Business</th><th>Rating</th><th>Reviews</th><th>Latest Review</th><th>Social</th><th>Winning Factors</th><th>Gaps</th></tr></thead>
                <tbody>
                  <tr style={{ background: "#F6F1E8" }}><td>{audit.businessName}</td><td>{audit.rating || "N/A"}</td><td>{audit.reviewCount || "N/A"}</td><td>N/A</td><td>{audit.hasInstagram ? "Instagram ✓" : "Not found"}</td><td>Subject business</td><td>Review report gaps</td></tr>
                  {competitors.slice(0, 6).map((competitor) => (
                    <tr key={competitor.name}>
                      <td>{competitor.name}</td>
                      <td>{competitor.rating || "N/A"}</td>
                      <td>{competitor.reviewCount || "N/A"}</td>
                      <td>{competitor.latestReviewDate ? formatDate(competitor.latestReviewDate) : "N/A"}</td>
                      <td>{competitor.socialSignals?.hasInstagram ? "Instagram ✓" : "Not found"}</td>
                      <td>{competitor.winningFactors.join(", ") || "Needs review"}</td>
                      <td>{[...competitor.lackingFactors, ...competitor.possibleWeaknesses].join(", ") || "Needs review"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: "10pt" }}>{competitorAnalysis}</p>
            </section>

            <section className="section page-break">
              <h2 className="section-title">Research Metadata</h2>
              <p className="label">For internal audit quality and reproducibility records.</p>
              <table className="meta-table" style={{ width: "60%" }}><tbody>
                <Meta label="AI Provider" value={parseTextOrEmpty(generation.provider) || "fallback"} />
                <Meta label="AI Model" value={parseTextOrEmpty(generation.model) || "N/A"} />
                <Meta label="Generation" value={parseTextOrEmpty(generation.status) === "gemini_generated" ? "Gemini generated" : "Fallback template"} />
                <Meta label="Generated at" value={formatDate(parseTextOrEmpty(generation.generatedAt))} />
                <Meta label="Prompt version" value={parseTextOrEmpty(generation.promptVersion) || "N/A"} />
                <Meta label="Prompt size" value={typeof generation.promptChars === "number" ? `${generation.promptChars.toLocaleString()} characters` : "N/A"} />
                <Meta label="Response size" value={typeof generation.responseChars === "number" ? `${generation.responseChars.toLocaleString()} characters` : "N/A"} />
                <Meta label="Finish reason" value={parseTextOrEmpty(generation.finishReason) || "N/A"} />
                <Meta label="Audit mode" value={auditModeLabel(audit.auditMode)} />
                <Meta label="Report status" value={internalReport?.reportStatus || "Not saved"} />
                <Meta label="Last updated" value={formatDate(audit.lastUpdated)} />
              </tbody></table>
              <div className="card" style={{ marginTop: "12pt", background: parseTextOrEmpty(generation.status) === "gemini_generated" ? "#F0FDF4" : "#FFFBEB", borderColor: parseTextOrEmpty(generation.status) === "gemini_generated" ? "#BBF7D0" : "#FDE68A" }}>
                {parseTextOrEmpty(generation.status) === "gemini_generated" ? "Report was generated by Gemini AI from public source data." : "Report used the fallback template. Set GEMINI_API_KEY for AI generation."}
              </div>
              <div className="card" style={{ marginTop: "12pt" }}>
                <p className="label">Additional Internal Brief Markdown</p>
                {paragraphs(briefMarkdown || "No saved internal brief markdown.")}
              </div>
              <div style={{ borderTop: "1pt solid #E4D9C8", paddingTop: "8pt", marginTop: "20pt", fontSize: "8pt", color: "#6B6257", display: "flex", justifyContent: "space-between" }}>
                <span>INTERNAL — CONFIDENTIAL — NOT FOR CLIENT DISTRIBUTION</span>
                <span>MonkAudit · GrowingMonk · {formatDate()}</span>
              </div>
              <p className="confidential-watermark">Website signals: {Object.keys(websiteSignals).length ? "available" : "not available"} · Instagram: {Object.keys(instagram).length ? "available" : "not available"}</p>
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

function parseNumberRecord(value: unknown): Record<string, number> {
  const record = parseRecord(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

function parseInternalBrief(value: unknown): InternalBrief {
  const record = parseRecord(value);
  return {
    pitchAngle: parseTextOrEmpty(record.pitchAngle),
    likelyPainPoints: parseStringList(record.likelyPainPoints),
    discoveryQuestions: parseStringList(record.discoveryQuestions),
    suggestedOffer: parseTextOrEmpty(record.suggestedOffer),
    nextAction: parseTextOrEmpty(record.nextAction),
    objectionHandling: parseTextOrEmpty(record.objectionHandling),
    doNotClaim: parseStringList(record.doNotClaim)
  };
}

function parseScoreBreakdown(value: unknown): ScoreItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((item) => typeof item.label === "string" && typeof item.value === "number").map((item) => ({
    label: parseTextOrEmpty(item.label),
    value: Number(item.value),
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

function parseCompetitors(value: unknown): Competitor[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseRecord(item)).filter((item) => typeof item.name === "string").map((item) => {
    const socialSignals = parseRecord(item.socialSignals);
    return {
      name: parseTextOrEmpty(item.name),
      rating: typeof item.rating === "number" ? item.rating : undefined,
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : undefined,
      latestReviewDate: parseTextOrEmpty(item.latestReviewDate),
      winningFactors: parseStringList(item.winningFactors),
      possibleWeaknesses: parseStringList(item.possibleWeaknesses),
      lackingFactors: parseStringList(item.lackingFactors),
      socialSignals: { hasInstagram: Boolean(socialSignals.hasInstagram) }
    };
  });
}

function styleObject(style: string): React.CSSProperties {
  return Object.fromEntries(style.split(";").filter(Boolean).map((rule) => {
    const [key, value] = rule.split(":");
    return [key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value];
  })) as React.CSSProperties;
}

function QuickRef({ label, value, styleText }: { label: string; value: string; styleText?: string }) {
  return <div><p className="label">{label}</p><p style={styleText ? styleObject(styleText) : { fontWeight: 700, border: "none", background: "transparent" }}>{value}</p></div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <tr><td>{label}</td><td>{value}</td></tr>;
}

function SourceBadge({ label, positive }: { label: string; positive: boolean }) {
  return <span className="badge" style={{ marginRight: "6pt", borderColor: positive ? "#657760" : "#B91C1C", color: positive ? "#657760" : "#B91C1C", background: positive ? "#F0FDF4" : "#FEF2F2" }}>{label}: {positive ? "yes" : "no"}</span>;
}

function Snapshot({ title, value }: { title: string; value: string }) {
  return <div className="card"><p className="label">{title}</p><p style={{ fontWeight: 700 }}>{value}</p></div>;
}

function BulletList({ items }: { items: string[] }) {
  return <div>{(items.length ? items : ["Needs manual review."]).map((item) => <div className="bullet-row" key={item}><span className="bullet-dot" /><span>{item}</span></div>)}</div>;
}

function EvidenceLine({ text }: { text: string }) {
  const evidence = evidenceLabel(text);
  const stripped = evidence ? text.replace(new RegExp(`^${evidence.label === "Needs Review" ? "Needs Manual Review" : evidence.label}:\\s*`), "") : text;
  return <p><span className="badge" style={{ borderColor: evidence?.color || "#E4D9C8", color: evidence?.color || "#6B6257" }}>{evidence?.label || "Evidence"}</span> {stripped}</p>;
}

function paragraphs(text: string) {
  return text.split(/\n{2,}/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

function fallbackFindings(): Finding[] {
  return [
    { title: "Visibility needs review", detail: "Confirm GBP, website, social proof, and source consistency.", action: "Complete manual source review." },
    { title: "Trust proof needs structure", detail: "Reviews, photos, services, and proof should be clearer before outreach.", action: "Prioritize GBP and review improvements." },
    { title: "Conversion flow needs validation", detail: "Calls, WhatsApp, booking, and tracking should be checked.", action: "Audit contact path and tracking." }
  ];
}
