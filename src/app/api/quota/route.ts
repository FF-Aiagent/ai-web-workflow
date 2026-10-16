import { NextResponse } from "next/server";
import {
  COOKIE_LOCAL_ID,
  buildSetCookie,
  newLocalId,
  readQuota,
} from "@/lib/quota";

export async function GET() {
  const quota = await readQuota();
  return NextResponse.json(quota);
}

/** Upgrade anonymous → local id (max 3 total runs). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const quota = await readQuota();
  const headers = new Headers();

  if (body.action === "claim-local" && !quota.hasLocalId) {
    headers.append("Set-Cookie", buildSetCookie(COOKIE_LOCAL_ID, newLocalId()));
    const max = 3;
    const remaining = Math.max(0, max - quota.used);
    return NextResponse.json(
      {
        used: quota.used,
        max,
        remaining,
        hasLocalId: true,
        exhausted: remaining <= 0,
      },
      { headers },
    );
  }

  return NextResponse.json(quota, { headers });
}

