import { NextResponse } from "next/server";
import { readQuota } from "@/lib/quota";

export async function GET() {
  const quota = await readQuota();
  return NextResponse.json(quota);
}

/** claim-local retired — POST is a no-op that returns current quota. */
export async function POST() {
  const quota = await readQuota();
  return NextResponse.json(quota);
}
