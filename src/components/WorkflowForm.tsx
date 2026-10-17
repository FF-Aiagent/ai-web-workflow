"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingInput, QuotaState } from "@/lib/types";
import { PLATFORM_FIELD_MAP } from "@/lib/types";
import { MAX_PASTE_CHARS } from "@/lib/extract";
import { QuotaBadge } from "./QuotaBadge";

const STORAGE_KEY = "aww_last_result";

type ExtractMode = "url" | "text";

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

  const [extractMode, setExtractMode] = useState<ExtractMode>("text");
  const [extractUrl, setExtractUrl] = useState("");
  const [extractText, setExtractText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractOk, setExtractOk] = useState<string | null>(null);

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

  async function onExtract() {
    setExtractError(null);
    setExtractOk(null);

    const payload =
      extractMode === "url"
        ? { url: extractUrl.trim() }
        : { text: extractText };

    if (extractMode === "url" && !extractUrl.trim()) {
      setExtractError(
        "链接为空：请粘贴 URL，或改用详情文本 / 手动填写下方表单。",
      );
      return;
    }
    if (extractMode === "text" && !extractText.trim()) {
      setExtractError(
        "内容为空：请粘贴商品详情，或直接手动填写下方表单。",
      );
      return;
    }
    if (
      extractMode === "text" &&
      [...extractText].length > MAX_PASTE_CHARS
    ) {
      setExtractError(
        `内容过长（超过 ${MAX_PASTE_CHARS} 字符）：请缩短后再试，或直接手动填写表单。`,
      );
      return;
    }

    setExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        fields?: Partial<ListingInput>;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.fields) {
        setExtractError(
          data.message ||
            "抽取失败：请重试，或直接手动填写下方表单。",
        );
        return;
      }
      setForm((f) => ({
        ...f,
        ...(data.fields!.productName
          ? { productName: data.fields!.productName }
          : {}),
        ...(data.fields!.category ? { category: data.fields!.category } : {}),
        ...(data.fields!.keyFeatures
          ? { keyFeatures: data.fields!.keyFeatures }
          : {}),
        ...(data.fields!.targetMarket
          ? { targetMarket: data.fields!.targetMarket }
          : {}),
      }));
      setExtractOk("已预填表单，请检查并修改后再生成。");
    } catch {
      setExtractError(
        "网络错误，抽取失败：请重试，或直接手动填写下方表单。",
      );
    } finally {
      setExtracting(false);
    }
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
        JSON.stringify({
          pack: data.pack,
          input: data.input,
          quota: data.quota,
        }),
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

  const pasteLen = [...extractText].length;

  return (
    <div className="card">
      <QuotaBadge quota={quota} onClaimLocal={claimLocal} />
      <details className="field-map-box">
        <summary>多平台必填字段（验收对照）</summary>
        <ul className="field-map-list">
          {(
            Object.keys(PLATFORM_FIELD_MAP) as Array<
              keyof typeof PLATFORM_FIELD_MAP
            >
          ).map((id) => (
            <li key={id}>
              <strong>{PLATFORM_FIELD_MAP[id].label}：</strong>
              {PLATFORM_FIELD_MAP[id].required.join(" · ")}
            </li>
          ))}
        </ul>
        <p className="muted">
          一次生成 Amazon + Shopee + DTC 三版；结果页可切换编辑与按平台复制/导出。
        </p>
      </details>

      <section className="extract-panel" aria-label="链接或粘贴抽取">
        <h2 className="extract-title">链接 / 粘贴抽取 → 填表</h2>
        <p className="muted extract-help">
          粘贴商品页 URL 或详情文本，预填下方表单（可再改）。失败时仍可手动填写。不做
          PDF OCR。
        </p>
        <div className="platform-tabs extract-mode" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={extractMode === "text"}
            className={`platform-tab ${extractMode === "text" ? "active" : ""}`}
            onClick={() => {
              setExtractMode("text");
              setExtractError(null);
              setExtractOk(null);
            }}
          >
            粘贴详情
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={extractMode === "url"}
            className={`platform-tab ${extractMode === "url" ? "active" : ""}`}
            onClick={() => {
              setExtractMode("url");
              setExtractError(null);
              setExtractOk(null);
            }}
          >
            粘贴链接
          </button>
        </div>

        {extractMode === "url" ? (
          <label className="extract-field">
            商品页 URL
            <input
              type="url"
              value={extractUrl}
              onChange={(e) => {
                setExtractUrl(e.target.value);
                setExtractError(null);
                setExtractOk(null);
              }}
              placeholder="https://…"
              aria-label="商品页 URL"
            />
          </label>
        ) : (
          <label className="extract-field">
            详情文本
            <span
              className={`char-count ${pasteLen > MAX_PASTE_CHARS ? "over" : ""}`}
            >
              {pasteLen}/{MAX_PASTE_CHARS}
            </span>
            <textarea
              rows={5}
              value={extractText}
              onChange={(e) => {
                setExtractText(e.target.value);
                setExtractError(null);
                setExtractOk(null);
              }}
              placeholder={"商品名：…\n卖点：…\n或直接粘贴详情页正文"}
              aria-label="商品详情文本"
            />
          </label>
        )}

        {extractError && (
          <p className="error extract-fail" role="alert">
            FAIL：{extractError}
          </p>
        )}
        {extractOk && !extractError && (
          <p className="extract-ok" role="status">
            {extractOk}
          </p>
        )}

        <button
          type="button"
          className="secondary"
          onClick={onExtract}
          disabled={extracting}
        >
          {extracting ? "抽取中…" : "抽取并预填表单"}
        </button>
      </section>

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
