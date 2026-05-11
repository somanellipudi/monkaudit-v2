import "server-only";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { env } from "./env";

const execAsync = promisify(exec);
const stateCollection = "app_state";
const stateDocument = "sales_os";

export function assertFirestoreConfigured() {
  if (!env.googleCloudProject) {
    throw new Error("Firestore provider selected but GOOGLE_CLOUD_PROJECT is not configured.");
  }
  return {
    projectId: env.googleCloudProject,
    databaseId: env.firestoreDatabaseId
  };
}

export const firestoreAdapterStatus = {
  provider: "firestore",
  ready: Boolean(env.googleCloudProject),
  projectId: env.googleCloudProject || "not configured",
  databaseId: env.firestoreDatabaseId
};

export async function readFirestoreState<T>() {
  const config = assertFirestoreConfigured();
  const response = await firestoreFetch(config.projectId, config.databaseId);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore read failed with HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  const stateJson = payload.fields?.stateJson?.stringValue;
  return stateJson ? (JSON.parse(stateJson) as T) : null;
}

export async function writeFirestoreState<T>(state: T) {
  const config = assertFirestoreConfigured();
  const response = await firestoreFetch(config.projectId, config.databaseId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        stateJson: { stringValue: JSON.stringify(state) },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    })
  });
  if (!response.ok) {
    throw new Error(`Firestore write failed with HTTP ${response.status}: ${await response.text()}`);
  }
}

async function firestoreFetch(projectId: string, databaseId: string, init: RequestInit = {}) {
  let token = await googleAccessToken();
  let response = await fetch(firestoreDocumentUrl(projectId, databaseId), {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });
  if (response.status !== 401) return response;

  token = await googleAccessToken();
  response = await fetch(firestoreDocumentUrl(projectId, databaseId), {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });
  return response;
}

function firestoreDocumentUrl(projectId: string, databaseId: string) {
  const encodedProject = encodeURIComponent(projectId);
  const encodedDatabase = encodeURIComponent(databaseId);
  return `https://firestore.googleapis.com/v1/projects/${encodedProject}/databases/${encodedDatabase}/documents/${stateCollection}/${stateDocument}`;
}

async function googleAccessToken() {
  const metadataToken = await metadataAccessToken();
  if (metadataToken) return metadataToken;
  const gcloudToken = await gcloudAccessToken();
  if (gcloudToken) return gcloudToken;
  throw new Error("Firestore provider requires a Google access token. On Cloud Run, grant the service account Firestore access. Locally, run gcloud auth application-default login or gcloud auth login.");
}

async function metadataAccessToken() {
  try {
    const response = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
      cache: "no-store",
      signal: AbortSignal.timeout(1200)
    });
    if (!response.ok) return "";
    const payload = await response.json();
    return String(payload.access_token || "");
  } catch {
    return "";
  }
}

async function gcloudAccessToken() {
  for (const command of gcloudCommands()) {
    try {
      const { stdout } = await execAsync(`${quoteShell(command)} auth print-access-token`, { timeout: 5000 });
      const token = stdout.trim();
      if (token) return token;
    } catch {
      // Try the next common gcloud location.
    }
  }
  return "";
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
