import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/env";

export const SIGNUP_GRANT = 10;

export type AuthUser = {
  id: string;
  email: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** Ensure profile row exists (covers users created before trigger / race). */
export async function ensureProfile(
  userId: string,
  email: string | null,
): Promise<number> {
  if (!isSupabaseServiceConfigured()) {
    throw new Error("supabase_service_role_missing");
  }
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return existing.balance as number;
  }

  const { data: created, error } = await admin
    .from("profiles")
    .insert({ id: userId, email, balance: SIGNUP_GRANT })
    .select("balance")
    .single();

  if (error) {
    const { data: again } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle();
    if (again) return again.balance as number;
    throw error;
  }

  await admin.from("credit_ledger").insert({
    user_id: userId,
    delta: SIGNUP_GRANT,
    reason: "signup_grant",
  });

  return created.balance as number;
}

export async function readBalance(userId: string): Promise<number> {
  if (!isSupabaseServiceConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle();
    return (data?.balance as number | undefined) ?? 0;
  }
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

/** Reserve / deduct 1 credit (atomic). Returns new balance or null if insufficient. */
export async function deductOneCredit(userId: string): Promise<number | null> {
  if (!isSupabaseServiceConfigured()) {
    return null;
  }
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("deduct_credit", {
    p_user_id: userId,
    p_reason: "generate",
  });
  if (error) {
    console.error("deduct_credit failed", error.message);
    return null;
  }
  if (data === null || data === undefined) return null;
  return Number(data);
}

/** Refund 1 after a failed generate (atomic via refund_credit RPC; writes 失败退回 ledger row). */
export async function refundOneCredit(userId: string): Promise<number | null> {
  if (!isSupabaseServiceConfigured()) return null;
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("refund_credit", {
    p_user_id: userId,
  });
  if (error) {
    console.error("refund_credit failed", error.message);
    return null;
  }
  if (data === null || data === undefined) return null;
  return Number(data);
}
