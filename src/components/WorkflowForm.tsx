"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingInput, QuotaState } from "@/lib/types";
import { PLATFORM_FIELD_MAP } from "@/lib/types";
import { QuotaBadge } from "./QuotaBadge";

const STORAGE_KEY = "aww_last_result";

export function WorkflowForm() {
  const router = useRouter();
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ListingInput>({
    productName: "",
    category: "家居/厨房",
    keyFeatures: "",
    targetMarket: "美国 Amazon",
    tone: "专业简洁",
  });

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => setQuota(null));
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (quota?.exhausted) {
      router.push("/paywall");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota(data.quota);
        router.push("/paywall");
        return;
      }
      if (!res.ok) {
        setError(data.message || data.error || "生成失败");
        return;
      }
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pack: data.pack, input: data.input, quota: data.quota }),
      );
      setQuota(data.quota);
      router.push("/result");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof ListingInput>(key: K, value: ListingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="card">
      <QuotaBadge quota={quota} onClaimLocal={claimLocal} />
      <details className="field-map-box">
        <summary>多平台必填字段（验收对照）</summary>
        <ul className="field-map-list">
          {(Object.keys(PLATFORM_FIELD_MAP) as Array<keyof typeof PLATFORM_FIELD_MAP>).map(
            (id) => (
              <li key={id}>
                <strong>{PLATFORM_FIELD_MAP[id].label}：</strong>
                {PLATFORM_FIELD_MAP[id].required.join(" · ")}
              </li>
            ),
          )}
        </ul>
        <p className="muted">一次生成 Amazon + Shopee + DTC 三版；结果页可切换编辑与按平台复制/导出。</p>
      </details>
      <form onSubmit={onSubmit} className="form">
        <label>
          商品名 <span className="req">*</span>
          <input
            required
            value={form.productName}
            onChange={(e) => set("productName", e.target.value)}
            placeholder="例如：折叠硅胶饭盒"
          />
        </label>
        <label>
          类目
          <input
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="家居/厨房"
          />
        </label>
        <label>
          关键卖点 <span className="req">*</span>
          <textarea
            required
            rows={3}
            value={form.keyFeatures}
            onChange={(e) => set("keyFeatures", e.target.value)}
            placeholder="轻便可折叠、食品级硅胶、微波炉可用…"
          />
        </label>
        <label>
          目标市场
          <input
            value={form.targetMarket}
            onChange={(e) => set("targetMarket", e.target.value)}
            placeholder="美国 Amazon"
          />
        </label>
        <label>
          语气
          <select
            value={form.tone}
            onChange={(e) => set("tone", e.target.value)}
          >
            <option value="专业简洁">专业简洁</option>
            <option value="活泼种草">活泼种草</option>
            <option value="高端质感">高端质感</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? "生成中…" : "生成交付包"}
        </button>
      </form>
    </div>
  );
}

export { STORAGE_KEY };
