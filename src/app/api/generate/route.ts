import { NextResponse } from "next/server";
import { generateListingPack } from "@/lib/generate";
import {
  anonState,
  cookieFromUsed,
  gateGenerate,
  readAnonUsed,
  userState,
} from "@/lib/quota";
import { deductOneCredit, getAuthUser, refundOneCredit } from "@/lib/balance";
import type { ListingInput } from "@/lib/types";

export async function POST(req: Request) {
  const gate = await gateGenerate();
  if (!gate.ok) {
    return NextResponse.json(
      { error: "quota_exhausted", quota: gate.quota },
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
    termsLocale: body.termsLocale === "en" ? "en" : undefined,
  };

  if (!input.productName || !input.keyFeatures) {
    return NextResponse.json(
      { error: "missing_fields", message: "商品名与卖点必填" },
      { status: 400 },
    );
  }

  const { userId } = gate;
  let reservedBalance: number | null = null;

  if (userId) {
    reservedBalance = await deductOneCredit(userId);
    if (reservedBalance === null) {
      const user = await getAuthUser();
      return NextResponse.json(
        {
          error: "quota_exhausted",
          quota: userState(0, user?.email ?? null),
        },
        { status: 402 },
      );
    }
  }

  let pack;
  try {
    pack = await generateListingPack(input);
  } catch (err) {
    if (userId) {
      await refundOneCredit(userId);
    }
    console.error("generateListingPack failed", err);
    return NextResponse.json(
      { error: "generate_failed", message: "生成失败，请重试" },
      { status: 500 },
    );
  }

  const headers = new Headers();

  if (userId && reservedBalance !== null) {
    const user = await getAuthUser();
    const nextQuota = userState(reservedBalance, user?.email ?? null);
    return NextResponse.json({ pack, quota: nextQuota, input }, { headers });
  }

  const used = (await readAnonUsed()) + 1;
  headers.append("Set-Cookie", cookieFromUsed(used));
  const nextQuota = anonState(used);
  return NextResponse.json({ pack, quota: nextQuota, input }, { headers });
}
