import "server-only";

import { NextResponse } from "next/server";
import { canSeeRecord, hasPermission } from "@/lib/rbac";
import type { Permission } from "@/lib/types";
import { getSession } from "./repositories";

export function requestId() {
  return crypto.randomUUID();
}

export async function getRequestSession(request: Request, id = requestId()) {
  const cookie = request.headers.get("cookie") || "";
  const email = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("gm_user_email="))
    ?.split("=")[1];
  const session = await getSession(email ? decodeURIComponent(email) : undefined);
  if (!session.authenticated) {
    logEvent("warn", "unauthorized_access_attempt", { requestId: id, reason: session.accessDeniedReason });
  }
  return session;
}

export async function requirePermission(request: Request, permission: Permission, id = requestId()) {
  const session = await getRequestSession(request, id);
  if (!session.user) {
    return { ok: false as const, response: NextResponse.json({ error: "Access not approved. This workspace is private to the GrowingMonk team.", requestId: id }, { status: 403 }) };
  }
  if (!hasPermission(session.user.roleIds, permission)) {
    logEvent("warn", "permission_denied", { requestId: id, userId: session.user.email, permission });
    return { ok: false as const, response: NextResponse.json({ error: "You do not have permission for this action.", requestId: id }, { status: 403 }) };
  }
  return { ok: true as const, user: session.user, requestId: id };
}

export function canAccess(user: { email: string; teamId: string; roleIds: string[] }, record: Parameters<typeof canSeeRecord>[2]) {
  return canSeeRecord(user.roleIds, user, record);
}

export function logEvent(level: "info" | "warn" | "error", event: string, metadata: Record<string, unknown>) {
  const payload = { level, event, timestamp: new Date().toISOString(), ...metadata };
  console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](JSON.stringify(payload));
}
