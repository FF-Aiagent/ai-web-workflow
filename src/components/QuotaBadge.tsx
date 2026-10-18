"use client";

import Link from "next/link";
import type { QuotaState } from "@/lib/types";

export function QuotaBadge({
  quota,
}: {
  quota: QuotaState | null;
  /** @deprecated claim3 retired */
  onClaimLocal?: () => void;
}) {
  if (!quota) return null;
  return (
    <div className="quota-badge">
      {quota.authenticated ? (
        <span>
          账户余额：{quota.remaining}
          {quota.email ? `（${quota.email}）` : ""}
        </span>
      ) : (
        <span>
          匿名试用：{quota.remaining}/{quota.max}
        </span>
      )}
      {!quota.authenticated && (
        <Link href="/login" className="linkish">
          登录领 10 次额度
        </Link>
      )}
      {!quota.authConfigured && (
        <span className="muted">（Supabase 未配置，登录暂不可用）</span>
      )}
    </div>
  );
}
