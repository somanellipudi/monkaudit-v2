import type { Score } from "./types";

export const scores: Score[] = [
  { label: "Website Conversion", value: 62, tone: "good" },
  { label: "Local SEO / GBP", value: 48, tone: "gap" },
  { label: "Reputation", value: 74, tone: "strong" },
  { label: "Ads Readiness", value: 55, tone: "gap" },
  { label: "Social Content", value: 50, tone: "gap" },
  { label: "Tracking / Funnel", value: 40, tone: "foundational" },
  { label: "Overall Growth Readiness", value: 60, tone: "good" }
];

export const reportCoverageChecks = [
  { label: "Google Business Profile identity", status: "Verified", detail: "Business name, address, phone, category, rating, review count, Maps URL." },
  { label: "Visible review comparison", status: "Verified", detail: "Competitor ratings and review volumes are included when public data is available." },
  { label: "Website snapshot", status: "Needs Review", detail: "Check booking links, visible phone, WhatsApp links, services, and conversion CTAs." },
  { label: "Social presence", status: "Verified", detail: "Instagram or other public profiles are reviewed when links are present." },
  { label: "Contact flow", status: "Needs Review", detail: "Phone, WhatsApp, website CTA, and booking path should be checked separately." },
  { label: "Strengths", status: "Verified", detail: "Only positive visible signals supported by public data should appear here." },
  { label: "Growth opportunities", status: "Needs Review", detail: "Use careful language and avoid unsupported revenue or ranking claims." },
  { label: "30-day sprint roadmap", status: "Draft", detail: "Should be practical, high-level, and not reveal the full execution playbook." },
  { label: "Tracking notes", status: "Verified", detail: "Must state that full performance analysis requires access to GBP, analytics, ads, and booking/contact data." },
  { label: "Client-safe limitations", status: "Verified", detail: "The report must clearly state public-data limitations and missing values are not estimated." }
];
