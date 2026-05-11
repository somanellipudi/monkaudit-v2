import { NextResponse } from "next/server";
import { getDbSummary } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";
import { firestoreAdapterStatus } from "@/lib/server/firestore-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDbSummary();
  return NextResponse.json({
    ok: true,
    app: "GrowingMonk MonkAudit",
    env: env.appEnv,
    authRequired: env.authRequired,
    cloud: {
      project: env.googleCloudProject || "not configured",
      location: env.googleCloudLocation,
      gcsBucket: env.gcsBucket || "not configured",
      geminiModel: env.geminiModel,
      geminiApiKey: env.geminiApiKey ? "env configured" : `Secret Manager fallback: ${env.geminiApiKeySecret}`,
      googleMapsApiKey: env.googleMapsApiKey ? "env configured" : `Secret Manager fallback: ${env.googleMapsApiKeySecret}`
    },
    adapters: {
      firestore: firestoreAdapterStatus
    },
    db
  });
}
