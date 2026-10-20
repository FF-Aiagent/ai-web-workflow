"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuotaState } from "@/lib/types";

export function AuthHeader() {
  const [quota, setQuota] = useState<QuotaState | null>(null);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);

  return (
    <div className="auth-header-bar">
      {quota?.authenticated ? (
        <>
          <span className="auth-balance" title={quota.email ?? undefined}>
            余额 {quota.remaining}
            {quota.email ? ` · ${quota.email}` : ""}
          </span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="linkish">
              退出
            </button>
          </form>
        </>
      ) : (
        <>
          <span className="auth-balance">
            {quota
              ? `试用 ${quota.remaining}/${quota.max}`
              : "试用 —"}
          </span>
          <Link href="/login" className="linkish">
            登录领 10 次
          </Link>
        </>
      )}
    </div>
  );
}
