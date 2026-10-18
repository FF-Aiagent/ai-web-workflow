import { cookies } from "next/headers";
import type { QuotaState } from "./types";
import {
  ensureProfile,
  getAuthUser,
  readBalance,
  SIGNUP_GRANT,
} from "./balance";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "./supabase/env";

/** Anonymous free-try cookie (claim3 / local-id stub retired). */
export const COOKIE_USED = "aww_quota_used";

/** @deprecated claim3 retired — kept so old cookies are ignored. */
export const COOKIE_LOCAL_ID = "aww_local_id";

const ANON_MAX = 1;

function parseUsed(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function anonState(used: number): QuotaState {
  const max = ANON_MAX;
  const remaining = Math.max(0, max - used);
  return {
    mode: "anon",
    used,
    max,
    remaining,
    exhausted: remaining <= 0,
    hasLocalId: false,
    authenticated: false,
    email: null,
    authConfigured: isSupabaseConfigured(),
  };
}

export function userState(
  balance: number,
  email: string | null,
): QuotaState {
  const remaining = Math.max(0, balance);
  const max = Math.max(SIGNUP_GRANT, remaining);
  const used = Math.max(0, max - remaining);
  return {
    mode: "user",
    used,
    max,
    remaining,
    exhausted: remaining <= 0,
    hasLocalId: false,
    authenticated: true,
    email,
    authConfigured: true,
  };
}

export async function readQuota(): Promise<QuotaState> {
  const user = await getAuthUser();
  if (user) {
    try {
      let balance: number;
      if (isSupabaseServiceConfigured()) {
        balance = await ensureProfile(user.id, user.email);
      } else {
        balance = await readBalance(user.id);
      }
      return userState(balance, user.email);
    } catch (err) {
      console.error("readQuota user path failed", err);
    }
  }

  const jar = await cookies();
  const used = parseUsed(jar.get(COOKIE_USED)?.value);
  return anonState(used);
}

export type QuotaGate =
  | { ok: true; quota: QuotaState; userId: string | null }
  | { ok: false; quota: QuotaState };

export async function gateGenerate(): Promise<QuotaGate> {
  const quota = await readQuota();
  if (quota.exhausted) {
    return { ok: false, quota };
  }
  if (quota.authenticated) {
    const user = await getAuthUser();
    if (!user) {
      return { ok: false, quota: { ...quota, exhausted: true, remaining: 0 } };
    }
    if (!isSupabaseServiceConfigured()) {
      return {
        ok: false,
        quota: {
          ...quota,
          exhausted: true,
          remaining: 0,
          authConfigured: false,
        },
      };
    }
    return { ok: true, quota, userId: user.id };
  }
  return { ok: true, quota, userId: null };
}

export function buildSetCookie(
  name: string,
  value: string,
  maxAgeSec = 60 * 60 * 24 * 365,
): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}

export function cookieFromUsed(used: number): string {
  return buildSetCookie(COOKIE_USED, String(used));
}

export async function readAnonUsed(): Promise<number> {
  const jar = await cookies();
  return parseUsed(jar.get(COOKIE_USED)?.value);
}

export { ANON_MAX, SIGNUP_GRANT as USER_MAX };
