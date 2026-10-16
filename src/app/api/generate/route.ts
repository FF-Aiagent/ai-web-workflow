import { NextResponse } from "next/server";
import { generateListingPack } from "@/lib/generate";
import {
  COOKIE_USED,
  buildSetCookie,
  readQuota,
} from "@/lib/quota";
import type { ListingInput } from "@/lib/types";

export async function POST(req: Request) {
  const quota = await readQuota();
  if (quota.exhausted) {
    return NextResponse.json(
      { error: "quota_exhausted", quota },
      { status: 402 },
    );
  }

  let body: Partial<ListingInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input: ListingInput = {
    productName: String(body.productName ?? "").trim(),
    category: String(body.category ?? "").trim(),
    keyFeatures: String(body.keyFeatures ?? "").trim(),
    targetMarket: String(body.targetMarket ?? "").trim(),
    tone: body.tone ? String(body.tone).trim() : undefined,
  };

  if (!input.productName || !input.keyFeatures) {
    return NextResponse.json(
      { error: "missing_fields", message: "商品名与卖点必填" },
      { status: 400 },
    );
  }

  const pack = await generateListingPack(input);
  const used = quota.used + 1;
  const headers = new Headers();
  headers.append("Set-Cookie", buildSetCookie(COOKIE_USED, String(used)));

  const nextQuota = {
    used,
    max: quota.max,
    remaining: Math.max(0, quota.max - used),
    hasLocalId: quota.hasLocalId,
    exhausted: used >= quota.max,
  };

  return NextResponse.json({ pack, quota: nextQuota, input }, { headers });
}
