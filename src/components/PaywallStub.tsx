"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuotaState } from "@/lib/types";
import { Disclaimer } from "./Disclaimer";

export function PaywallStub() {
  const [quota, setQuota] = useState<QuotaState | null>(null);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => null);
  }, []);

  return (
    <div className="card paywall">
      <h1>额度已用完</h1>
      <p>
        {quota?.authenticated
          ? `当前余额 ${quota.remaining}。登录账户额度用尽后，请联系工程人工加余额（改库），本页不接入支付。`
          : `匿名试用 ${quota?.used ?? "—"} / ${quota?.max ?? "—"} 次已用完。登录可领取 10 次账户额度。`}
      </p>
      <ul className="stub-list">
        <li>无 Stripe / 充值 / 订阅按钮</li>
        <li>人工加余额：工程在 Supabase SQL 改 profiles.balance</li>
      </ul>
      {!quota?.authenticated && (
        <Link href="/login" className="primary btn-link">
          去邮箱登录
        </Link>
      )}
      {quota && !quota.exhausted && (
        <Link href="/" className="primary btn-link">
          返回继续生成
        </Link>
      )}
      <Link href="/" className="secondary btn-link">
        返回首页
      </Link>
      <Disclaimer />
    </div>
  );
}
