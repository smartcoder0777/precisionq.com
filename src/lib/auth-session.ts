import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getGeneralSettingsRow } from "@/models/settings/general-settings.model";

const AUTH_COOKIE = "care_hub_auth";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 1 day

export type AuthSession = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  roleId: number | null;
  permissions?: Record<string, string[]>;
  securityVerified: boolean;
  questionId: number | null;
  question: string | null;
};

function getSecret(): string {
  return process.env.SESSION_SECRET?.trim() || "dev-only-secret-change-me";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encodeSession(session: AuthSession): string {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decodeSession(raw: string): AuthSession | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    return JSON.parse(fromBase64Url(payload)) as AuthSession;
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

/** Re-issue the session cookie (extends TTL) after authenticated activity. */
export async function touchAuthSession(session: AuthSession): Promise<void> {
  await setAuthSession(session);
}

export async function setAuthSession(session: AuthSession): Promise<void> {
  let maxAge = DEFAULT_SESSION_TTL_SECONDS;
  try {
    const row = await getGeneralSettingsRow();
    const raw = Number(row?.session_ttl_seconds ?? DEFAULT_SESSION_TTL_SECONDS);
    if (Number.isFinite(raw)) maxAge = Math.max(300, Math.min(60 * 60 * 24 * 30, Math.trunc(raw)));
  } catch {
    maxAge = DEFAULT_SESSION_TTL_SECONDS;
  }
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
