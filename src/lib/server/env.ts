export const env = {
  appEnv: process.env.APP_ENV ?? "local",
  authRequired: (process.env.AUTH_REQUIRED ?? "false").toLowerCase() === "true",
  dbProvider: process.env.DB_PROVIDER ?? "local",
  localDbPath: process.env.LOCAL_DB_PATH ?? ".data/growingmonk-sales-os.json",
  allowlistEmails: (process.env.ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION ?? "asia-south1",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID ?? "(default)",
  gcsBucket: process.env.GCS_BUCKET ?? "",
  geminiApiKeySecret: process.env.GEMINI_API_KEY_SECRET ?? "gemini-api-key",
  googleMapsApiKeySecret: process.env.GOOGLE_MAPS_API_KEY_SECRET ?? "google-maps-api-key"
};
