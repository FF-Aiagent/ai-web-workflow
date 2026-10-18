import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "supabase_not_configured",
        message: "未配置 Supabase：请在 .env.local 填入 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY",
      },
      { status: 503 },
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "invalid_email", message: "请输入有效邮箱" },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("magic link error", error.message);
    return NextResponse.json(
      { error: "otp_failed", message: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "登录链接已发送，请查收邮箱" });
}
