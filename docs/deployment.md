# Deployment Notes

GrowingMonk MonkAudit is a Next.js app with API routes and a local JSON database fallback.

## Local

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:3000
```

Health check:

```text
http://127.0.0.1:3000/api/health
```

## Environment

Copy `.env.example` to `.env.local`.

```text
APP_ENV=local
AUTH_REQUIRED=false
DB_PROVIDER=local
LOCAL_DB_PATH=.data/growingmonk-sales-os.json
ALLOWLIST_EMAILS=you@yourdomain.com,admin@yourdomain.com
GEMINI_FAST_MODEL=gemini-2.5-flash-lite
GEMINI_PRO_MODEL=gemini-2.5-pro
```

`GEMINI_FAST_MODEL` is used for routine audit generation to keep cost down. `GEMINI_PRO_MODEL` is reserved for audits with richer public-source evidence, competitor/review intelligence, or large prompts. Legacy `GEMINI_MODEL` is still accepted as the pro model fallback.

Gemini generation uses Google ADC / Vertex AI by default. Locally, run `gcloud auth application-default login` or `gcloud auth login`. On Cloud Run, grant the service account Vertex AI access. `GEMINI_API_KEY` and `GEMINI_API_KEY_SECRET` are optional escape hatches only if you want to use the Gemini API key endpoint.

## Auth Gate

Local development can run without a gate using `AUTH_REQUIRED=false`.
For production, set:

```text
AUTH_REQUIRED=true
ALLOWLIST_EMAILS=founder@yourdomain.com,sales@yourdomain.com
```

The current implementation uses a protected cookie path and allowlist enforcement as the app-level gate. Replace `/api/auth/dev-login` with Firebase Google login before giving access to a real team.

## Firestore Adapter Boundary

The app exposes Firestore adapter status in `/api/health`. When `DB_PROVIDER=firestore`, the app persists the normalized MonkAudit state to Firestore through the Google REST API.

Required production values:

```text
DB_PROVIDER=firestore
GOOGLE_CLOUD_PROJECT=growingmonk-...
FIRESTORE_DATABASE_ID=(default)
GCS_BUCKET=...
```

Do not run production traffic on `DB_PROVIDER=local`; Cloud Run filesystems are ephemeral.

Current Firestore document:

```text
projects/{GOOGLE_CLOUD_PROJECT}/databases/{FIRESTORE_DATABASE_ID}/documents/app_state/sales_os
```

This is the first durable GCP persistence cut. As usage grows, split large report markdown, PDFs, screenshots, and raw research into Cloud Storage and keep metadata in Firestore collections.

## Audit Pipeline

Local mode includes:

```text
POST /api/audits/:id/run
```

This simulates the worker pipeline and moves an audit to `Research Completed`. Production should replace this with Cloud Tasks/Pub/Sub plus a worker that performs Maps/site/social discovery, Gemini generation, report cleanup, and file writes.

## Report Persistence

Report drafts can be saved through:

```text
GET  /api/reports?auditRunId=...
POST /api/reports
```

Local mode stores report markdown in the JSON DB. Firestore mode stores the current normalized app state in Firestore. Production should eventually store long markdown/PDF artifacts in Cloud Storage and keep metadata in Firestore.

## Production Direction

Use Cloud Run for GrowingMonk MonkAudit and a shared Firestore database. Keep the client portal as a separate app later.

Recommended first production cut:

- Firebase Auth for Google login.
- Firestore for `users`, `leads`, `audit_runs`, `reports`, `follow_ups`, `files`, `ai_usage`, and `activity_logs`.
- Cloud Storage for PDFs, screenshots, raw research JSON, and report markdown.
- Secret Manager for Gemini, Google Maps, and other API secrets.
- Cloud Run in `asia-south1`.

## Container

```powershell
npm.cmd run verify
docker build -t growingmonk-sales-os .
docker run -p 8080:8080 growingmonk-sales-os
```

## Cloud Run

Recommended:

```powershell
npm.cmd run verify
npm.cmd run cloudrun:build
npm.cmd run cloudrun:deploy
```

Before deploy, create an Artifact Registry repository named `growingmonk-growth-os` in `asia-south1`, configure Secret Manager values, and set Cloud Run env vars/secrets.

## GitHub Actions CI/CD

The repo includes `.github/workflows/ci-cd.yml`.

On pull requests and pushes to `main`, CI runs:

```text
npm ci
npm run verify
```

On pushes to `main`, the deploy job builds the Docker image, pushes it to Artifact Registry, and deploys Cloud Run.

Required GitHub repository secrets:

```text
GCP_PROJECT_ID
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
```

Recommended GitHub repository variables:

```text
ALLOWLIST_EMAILS
FIRESTORE_DATABASE_ID
GCS_BUCKET
```

Required Google Secret Manager secrets:

```text
google-maps-api-key
```

## Important

The local JSON database is for development and demos. It is not durable enough for real team usage on Cloud Run because container filesystems are ephemeral. Production should use Firestore.
