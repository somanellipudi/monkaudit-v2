# GrowingMonk MonkAudit Data Contract

This is the production mapping for MonkAudit, the internal audit and report workspace. It keeps the audit flow fast, permission-aware, and ready for Firestore, Cloud Storage, queues, and Gemini workers.

The client portal should be a separate app later. Both apps can share selected Firestore collections, but they should not share navigation, routes, UI permissions, or external-user auth rules.

## Core UX Principle

The salesperson starts with one strong public identifier, preferably a Google Maps or Google Business Profile link. The system discovers the business identity and creates structured records. Optional social links and point-of-contact details improve matching, but should not block the first research run.

## Collections

| Collection | Purpose |
| --- | --- |
| `users` | Allowlisted Gmail users, role IDs, app access, team, active/disabled status. |
| `roles` | Role definitions mapped to permission strings. |
| `permissions` | Optional permission registry for admin UI and validation. |
| `teams` | Sales India, Sales USA, strategist/reviewer teams. |
| `leads` | Prospect record with owner, reviewer, team, visibility, source links, `leadStatus`, `salesStage`, `nextAction`, and next follow-up. |
| `audit_runs` | Research job, discovered data, manual overrides, final data, scores, reports, cost estimate. |
| `client_accounts` | Converted client accounts linked back to the original lead and audit. |
| `client_users` | External users who can access the future client portal. |
| `onboarding_projects` | Access collection, kickoff, tracking setup, and first sprint readiness. |
| `subscriptions` | Retainer, sprint, project, renewal, and billing cadence records. |
| `invoices` | Invoice metadata for Razorpay, Stripe, or manual payments. |
| `payments` | Provider transactions, receipts, failed payment attempts, and reconciliation. |
| `growth_sprints` | Delivery work after conversion across SEO, ads, content, tracking, and reporting. |
| `client_reports` | Monthly client-facing reports and portal-visible updates. |
| `support_threads` | Client requests, approvals, questions, and operational communication. |
| `follow_ups` | Calls, WhatsApp, email, meetings, due dates, next actions. |
| `reports` | Client-safe report and internal brief metadata, review gate, export/share state. |
| `files` | Cloud Storage metadata for PDFs, research JSON, screenshots, exports. |
| `ai_usage` | Gemini tokens, external API calls, estimated cost, job status. |
| `activity_logs` | Append-only audit trail for sensitive workflow actions. |
| `guardrail_checks` | Report safety checks for verified data, unsupported claims, and client-safe language. |
| `fraud_risk_signals` | Lightweight operational risk hooks for suspicious access, exports, duplicate leads, owner churn, and AI usage spikes. |
| `app_settings` | Feature flags, allowlist settings, cost thresholds, and operational defaults. |

## Query Rules

- List pages query indexed summary fields only.
- Detail pages load raw research JSON, report markdown, and file metadata on demand.
- Tables paginate by default.
- RBAC filters must be server-side, then reflected in UI.
- Common indexes: `assignedTo + leadStatus`, `assignedTo + salesStage`, `teamId + salesStage`, `assignedStrategist + auditStatus`, `reportStatus + updatedAt`, `nextFollowUpAt + assignedTo`, `auditMode + createdAt`, `userId + month`.

## Audit Creation Flow

1. Normalize source links.
2. Resolve Google Business Profile identity.
3. Discover website, contact paths, and social links.
4. Compare nearby competitors.
5. Generate directional scores.
6. Generate internal brief.
7. Generate client-safe report.
8. Run language cleanup.
9. Store report files and activity logs.

## Performance Rules

- Keep heavy evidence files in Cloud Storage.
- Do not store large raw HTML, screenshots, or PDF blobs directly in Firestore.
- Use summary fields for dashboards: lead status, sales stage, audit status, report status, owner, reviewer, score, city, category, next follow-up, updated time.
- Cache role metadata.
- Load report sections lazily in the editor.
- Avoid full-table client filtering once real data grows.

## Client Lifecycle Boundary

When a deal is won, do not mutate the sales lead into a client portal record. MonkAudit should create or request a handoff record with references to `sourceLeadId` and `sourceAuditRunId`. The future client portal app can create/read `client_accounts` and external-facing objects with its own auth boundary.

Future lifecycle:

1. Prospect: `leads`, `audit_runs`, `reports`, `follow_ups`.
2. Converted: create `client_accounts`, lock source audit/report context.
3. Onboarding: create `onboarding_projects` and access checklist.
4. Billing: create `subscriptions`, `invoices`, and `payments`.
5. Delivery: create `growth_sprints`, tasks, files, and internal notes.
6. Separate Client Portal app: expose approved `client_reports`, files, invoices, support requests, and meeting notes.
7. Renewal or churn: preserve account history, outcomes, and reason codes.

## Payment Design

Payments should be provider-agnostic:

- India: Razorpay.
- USA: Stripe.
- Manual bank transfers: recorded against the same invoice model.

Never make the payment provider the source of truth for the client account. The source of truth is `client_accounts`, `subscriptions`, `invoices`, and `payments`, owned by the future portal/billing app, not by MonkAudit.
