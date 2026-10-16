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

  async function claimLocal() {
    const res = await fetch("/api/quota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim-local" }),
    });
    const data = (await res.json()) as QuotaState;
    setQuota(data);
  }

  const canUpgrade =
    quota && !quota.hasLocalId && quota.used < 3 && quota.exhausted;

  return (
    <div className="card paywall">
      <h1>免费额度已用完</h1>
      <p>
        当前已用 {quota?.used ?? "—"} / {quota?.max ?? "—"} 次。
        付费解锁更高额度（定价暂缓，本页仅为占位，不会扣款）。
      </p>
      <ul className="stub-list">
        <li>订阅 / 买断：待 FF 定价格</li>
        <li>本页不接入真实支付</li>
        <li>无水印导出等权益后补</li>
      </ul>
      {canUpgrade && (
        <button type="button" className="primary" onClick={claimLocal}>
          启用本机额度（升至共 3 次）
        </button>
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
