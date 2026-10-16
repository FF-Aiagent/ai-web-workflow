import { cookies } from "next/headers";
import type { QuotaState } from "./types";

export const COOKIE_LOCAL_ID = "aww_local_id";
export const COOKIE_USED = "aww_quota_used";

const ANON_MAX = 1;
const LOCAL_MAX = 3;

function parseUsed(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function readQuota(): Promise<QuotaState> {
  const jar = await cookies();
  const hasLocalId = Boolean(jar.get(COOKIE_LOCAL_ID)?.value);
  const used = parseUsed(jar.get(COOKIE_USED)?.value);
  const max = hasLocalId ? LOCAL_MAX : ANON_MAX;
  const remaining = Math.max(0, max - used);
  return {
    used,
    max,
    remaining,
    hasLocalId,
    exhausted: remaining <= 0,
  };
}

export function buildSetCookie(
  name: string,
  value: string,
  maxAgeSec = 60 * 60 * 24 * 365,
): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}

export function newLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export { ANON_MAX, LOCAL_MAX };
