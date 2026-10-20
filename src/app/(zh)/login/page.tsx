"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";

function LoginForm() {
  const params = useSearchParams();
  const errParam = params.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(
    errParam === "not_configured"
      ? "Supabase 未配置：请在 1:1 粘贴项目 URL / anon key / service role。"
      : errParam === "auth_callback"
        ? "登录链接无效或已过期，请重新发送。"
        : null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message || data.error || "发送失败");
        return;
      }
      setStatus("sent");
      setMessage(data.message || "登录链接已发送，请查收邮箱");
    } catch {
      setStatus("error");
      setMessage("网络错误，请重试");
    }
  }

  return (
    <div className="card login-card">
      <h1>邮箱登录</h1>
      <p className="muted">
        发送 Magic Link（无密码）。新用户自动获得 <strong>10</strong>{" "}
        次生成额度。不做充值支付。
      </p>
      <form onSubmit={onSubmit} className="form">
        <label>
          邮箱
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "sending" || status === "sent"}
          />
        </label>
        {message && (
          <p
            className={status === "error" || errParam ? "error" : "extract-ok"}
            role="status"
          >
            {message}
          </p>
        )}
        <button
          type="submit"
          className="primary"
          disabled={status === "sending" || status === "sent"}
        >
          {status === "sending"
            ? "发送中…"
            : status === "sent"
              ? "已发送"
              : "发送登录链接"}
        </button>
      </form>
      <Link href="/" className="secondary btn-link">
        返回首页
      </Link>
      <Disclaimer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
