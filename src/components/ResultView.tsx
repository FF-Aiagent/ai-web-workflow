"use client";

import { ByteCounter } from "@/components/ByteCounter";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AmazonFields,
  DtcFields,
  APlusModule,
  HookLines,
  ListingInput,
  ListingPack,
  PlatformBundle,
  PlatformId,
  QuotaState,
  ShopeeFields,
} from "@/lib/types";
import { PLATFORM_FIELD_MAP } from "@/lib/types";
import {
  copyText,
  downloadText,
  formatAplus,
  formatOneHook,
  packToJson,
  packToMarkdown,
  packToTxt,
} from "@/lib/export";
import {
  AMAZON_TITLE_MAX,
  PLATFORM_LABEL,
  amazonTitleHint,
  formatAllPlatforms,
  formatPlatformBlock,
} from "@/lib/platforms";
import { Disclaimer } from "./Disclaimer";
import { STORAGE_KEY } from "./WorkflowForm";

type Stored = {
  pack: ListingPack;
  input: ListingInput;
  quota: QuotaState;
};

type CopyTarget = "platform" | "script" | "hook0" | "hook1" | "hook2" | "aplus" | null;

function emptyAmazon(): AmazonFields {
  return {
    title: "",
    variants: ["", ""],
    bullets: ["", "", "", "", ""],
    backendSearchTerms: "",
  };
}

function emptyShopee(): ShopeeFields {
  return { title: "", description: "", keyAttributes: "" };
}

function emptyDtc(): DtcFields {
  return {
    title: "",
    shortDescription: "",
    longDescription: "",
    cta: "",
  };
}


const HOOK_MAX = 120;

function clipHookLine(s: string): string {
  const t = (s || "").trim();
  if ([...t].length <= HOOK_MAX) return t;
  return [...t].slice(0, HOOK_MAX).join("").trim();
}

function coerceHookLine(raw: unknown): string {
  if (typeof raw === "string") return clipHookLine(raw);
  if (raw && typeof raw === "object" && "hook" in raw) {
    return clipHookLine(String((raw as { hook?: string }).hook ?? ""));
  }
  return "";
}

function ensureAplus(pack: ListingPack): APlusModule[] {
  if (pack.aplus && pack.aplus.length >= 3) return pack.aplus.slice(0, 5);
  return [
    { title: "", body: "" },
    { title: "", body: "" },
    { title: "", body: "" },
  ];
}

/** Accept M3 string[3] or legacy HookPack objects from sessionStorage. */
function ensureHooks(pack: ListingPack): HookLines {
  const raw = pack.hooks as unknown;
  if (Array.isArray(raw) && raw.length >= 3) {
    return [
      coerceHookLine(raw[0]),
      coerceHookLine(raw[1]),
      coerceHookLine(raw[2]),
    ];
  }
  return ["", "", ""];
}

function ensurePlatforms(pack: ListingPack): PlatformBundle {
  if (pack.platforms?.amazon && pack.platforms?.shopee && pack.platforms?.dtc) {
    return pack.platforms;
  }
  // Legacy packs (pre-②): keep script/copy, seed empty platform shells.
  return {
    amazon: emptyAmazon(),
    shopee: emptyShopee(),
    dtc: emptyDtc(),
  };
}

export function ResultView() {
  const router = useRouter();
  const [data, setData] = useState<Stored | null>(null);
  const [platforms, setPlatforms] = useState<PlatformBundle | null>(null);
  const [hooks, setHooks] = useState<HookLines | null>(null);
  const [aplus, setAplus] = useState<APlusModule[] | null>(null);
  const [scriptEdit, setScriptEdit] = useState("");
  const [tab, setTab] = useState<PlatformId>("amazon");
  const [copied, setCopied] = useState<CopyTarget>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Stored;
      const bundle = ensurePlatforms(parsed.pack);
      const hookBundle = ensureHooks(parsed.pack);
      setData(parsed);
      setPlatforms(bundle);
      setHooks(hookBundle);
      setAplus(ensureAplus(parsed.pack));
      setScriptEdit(parsed.pack.script);
    } catch {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const editedPack: ListingPack | null = useMemo(() => {
    if (!data || !platforms || !hooks || !aplus) return null;
    return {
      ...data.pack,
      platforms,
      hooks,
      aplus,
      copy: formatAllPlatforms(platforms),
      script: scriptEdit,
    };
  }, [data, platforms, hooks, aplus, scriptEdit]);

  useEffect(() => {
    if (!data || !editedPack) return;
    const next: Stored = { ...data, pack: editedPack };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [data, editedPack]);

  if (!data || !platforms || !hooks || !aplus || !editedPack) {
    return <p className="muted">加载结果…</p>;
  }

  const name = data.input.productName || "listing";
  const fieldHelp = PLATFORM_FIELD_MAP[tab];

  async function onCopyPlatform() {
    let text = formatPlatformBlock(tab, platforms!);
    if (tab === "amazon" && aplus) {
      const aplusBlock = formatAplus(aplus);
      if (aplusBlock) {
        text = text + "\n\n—— A+ 模块 ——\n\n" + aplusBlock;
      }
    }
    const ok = await copyText(text);
    if (ok) setCopied("platform");
  }

  async function onCopyAplus() {
    const ok = await copyText(formatAplus(aplus!));
    if (ok) setCopied("aplus");
  }

  function patchAplus(index: number, patch: Partial<APlusModule>) {
    setAplus((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function onCopyScript() {
    const ok = await copyText(scriptEdit);
    if (ok) setCopied("script");
  }

  async function onCopyHook(index: 0 | 1 | 2) {
    const label = String.fromCharCode(65 + index);
    const ok = await copyText(formatOneHook(label, hooks![index]));
    if (ok) setCopied((`hook${index}`) as CopyTarget);
  }

  function patchHookLine(index: 0 | 1 | 2, value: string) {
    setHooks((prev) => {
      if (!prev) return prev;
      const next = [...prev] as HookLines;
      next[index] = clipHookLine(value);
      return next;
    });
  }

  function exportMd() {
    downloadText(
      `${name}-listing.md`,
      packToMarkdown(editedPack!, name),
      "text/markdown;charset=utf-8",
    );
  }

  function exportJson() {
    downloadText(
      `${name}-listing.json`,
      packToJson(editedPack!, name),
      "application/json;charset=utf-8",
    );
  }

  function exportTxt() {
    downloadText(
      `${name}-listing.txt`,
      packToTxt(editedPack!, name),
      "text/plain;charset=utf-8",
    );
  }

  function patchAmazon(patch: Partial<AmazonFields>) {
    setPlatforms((p) =>
      p ? { ...p, amazon: { ...p.amazon, ...patch } } : p,
    );
  }

  function patchShopee(patch: Partial<ShopeeFields>) {
    setPlatforms((p) =>
      p ? { ...p, shopee: { ...p.shopee, ...patch } } : p,
    );
  }

  function patchDtc(patch: Partial<DtcFields>) {
    setPlatforms((p) => (p ? { ...p, dtc: { ...p.dtc, ...patch } } : p));
  }

  const titleLen = [...platforms.amazon.title].length;
  const titleWarn = amazonTitleHint(platforms.amazon.title);

  return (
    <div className="stack">
      <div className="result-meta">
        <span className={`pill ${editedPack.mode}`}>
          {editedPack.mode === "live" ? "Live API" : "Mock 演示"}
        </span>
        <span className="muted">
          {data.quota.authenticated
            ? `账户余额：${data.quota.remaining}`
            : `匿名试用剩余：${data.quota.remaining}/${data.quota.max}`}
        </span>
      </div>

      <p className="muted edit-hint">
        各平台字段可直接改；「复制本平台」与导出（md / json /
        txt）都会用你改后的内容。免责声明与界面一致。
      </p>

      <section className="card section">
        <div className="section-head">
          <h2>多平台字段</h2>
          <button
            type="button"
            className="secondary compact"
            onClick={onCopyPlatform}
          >
            {copied === "platform" ? "已复制" : "复制本平台"}
          </button>
        </div>

        <div className="platform-tabs" role="tablist" aria-label="平台">
          {(Object.keys(PLATFORM_LABEL) as PlatformId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`platform-tab ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              {PLATFORM_LABEL[id]}
            </button>
          ))}
        </div>

        <div className="field-map muted" role="note">
          <strong>{fieldHelp.label} 必填字段：</strong>
          {fieldHelp.required.join(" · ")}
        </div>

        {tab === "amazon" && (
          <div className="platform-fields">
            <label>
              标题（≤{AMAZON_TITLE_MAX}）
              <span
                className={`char-count ${titleWarn ? "over" : ""}`}
              >
                {titleLen}/{AMAZON_TITLE_MAX}
              </span>
              <input
                className={titleWarn ? "input-warn" : ""}
                value={platforms.amazon.title}
                onChange={(e) => patchAmazon({ title: e.target.value })}
                aria-label="Amazon 标题"
              />
              {titleWarn && <span className="warn-hint">{titleWarn}</span>}
            </label>
            <fieldset className="field-group">
              <legend>变体名（2–3）</legend>
              {platforms.amazon.variants.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => {
                    const next = [...platforms.amazon.variants] as string[];
                    next[i] = e.target.value;
                    const variants = (
                      next.length >= 3
                        ? [next[0], next[1], next[2]]
                        : [next[0], next[1]]
                    ) as AmazonFields["variants"];
                    patchAmazon({ variants });
                  }}
                  aria-label={`变体 ${i + 1}`}
                  placeholder={`变体 ${i + 1}`}
                />
              ))}
              {platforms.amazon.variants.length < 3 && (
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    patchAmazon({
                      variants: [
                        platforms.amazon.variants[0],
                        platforms.amazon.variants[1],
                        "",
                      ],
                    })
                  }
                >
                  + 第三变体
                </button>
              )}
            </fieldset>
            <fieldset className="field-group">
              <legend>五点描述</legend>
              {platforms.amazon.bullets.map((b, i) => (
                <textarea
                  key={i}
                  rows={2}
                  value={b}
                  onChange={(e) => {
                    const bullets = [...platforms.amazon.bullets] as [
                      string,
                      string,
                      string,
                      string,
                      string,
                    ];
                    bullets[i] = e.target.value;
                    patchAmazon({ bullets });
                  }}
                  aria-label={`Bullet ${i + 1}`}
                  placeholder={`Bullet ${i + 1}`}
                />
              ))}
            </fieldset>
            <label>
              后台搜索词
              <textarea
                rows={2}
                value={platforms.amazon.backendSearchTerms}
                onChange={(e) =>
                  patchAmazon({ backendSearchTerms: e.target.value })
                }
                aria-label="Amazon 后台搜索词"
              />
              <ByteCounter value={platforms.amazon.backendSearchTerms} />
            </label>
          </div>
        )}

        {tab === "shopee" && (
          <div className="platform-fields">
            <label>
              标题
              <input
                value={platforms.shopee.title}
                onChange={(e) => patchShopee({ title: e.target.value })}
                aria-label="Shopee 标题"
              />
            </label>
            <label>
              描述
              <textarea
                rows={6}
                value={platforms.shopee.description}
                onChange={(e) => patchShopee({ description: e.target.value })}
                aria-label="Shopee 描述"
              />
            </label>
            <label>
              关键属性
              <span className="muted field-note">（类目占位可空）</span>
              <textarea
                rows={3}
                value={platforms.shopee.keyAttributes}
                onChange={(e) =>
                  patchShopee({ keyAttributes: e.target.value })
                }
                aria-label="Shopee 关键属性"
                placeholder="可留空"
              />
            </label>
          </div>
        )}

        {tab === "dtc" && (
          <div className="platform-fields">
            <label>
              标题
              <input
                value={platforms.dtc.title}
                onChange={(e) => patchDtc({ title: e.target.value })}
                aria-label="DTC 标题"
              />
            </label>
            <label>
              短描述
              <textarea
                rows={3}
                value={platforms.dtc.shortDescription}
                onChange={(e) =>
                  patchDtc({ shortDescription: e.target.value })
                }
                aria-label="DTC 短描述"
              />
            </label>
            <label>
              长描述
              <textarea
                rows={6}
                value={platforms.dtc.longDescription}
                onChange={(e) =>
                  patchDtc({ longDescription: e.target.value })
                }
                aria-label="DTC 长描述"
              />
            </label>
            <label>
              一行 CTA
              <input
                value={platforms.dtc.cta}
                onChange={(e) => patchDtc({ cta: e.target.value })}
                aria-label="DTC CTA"
              />
            </label>
          </div>
        )}
      </section>


      <section className="card section">
        <div className="section-head">
          <h2>A+ 模块文案骨架</h2>
          <button
            type="button"
            className="secondary compact"
            onClick={onCopyAplus}
          >
            {copied === "aplus" ? "已复制" : "复制 A+"}
          </button>
        </div>
        <p className="muted edit-hint">
          3–5 个纯文本模块（标题 + 正文）。可编辑；导出 md/json/txt 含编辑态。Amazon「复制本平台」也会附带 A+。无真图。
        </p>
        <div className="platform-fields">
          {aplus.map((mod, i) => (
            <fieldset key={i} className="field-group">
              <legend>模块 {i + 1}</legend>
              <label>
                模块标题
                <input
                  value={mod.title}
                  onChange={(e) => patchAplus(i, { title: e.target.value })}
                  aria-label={`A+ 模块 ${i + 1} 标题`}
                />
              </label>
              <label>
                正文（2–4 句）
                <textarea
                  rows={4}
                  value={mod.body}
                  onChange={(e) => patchAplus(i, { body: e.target.value })}
                  aria-label={`A+ 模块 ${i + 1} 正文`}
                />
              </label>
            </fieldset>
          ))}
          {aplus.length < 5 && (
            <button
              type="button"
              className="linkish"
              onClick={() =>
                setAplus((prev) =>
                  prev && prev.length < 5
                    ? [...prev, { title: "", body: "" }]
                    : prev,
                )
              }
            >
              + 模块
            </button>
          )}
        </div>
      </section>

      <section className="card section">
        <div className="section-head">
          <h2>Hooks</h2>
        </div>
        <p className="muted edit-hint">
          同一次 generate 给出 3 条互异英文开场钩子（≤120 字符/条，广告 / 短视频前 3 秒口播）。可编辑；每条一键复制；导出 md / json / txt 含编辑后的 hooks[]。不另扣额度。
        </p>
        <div className="platform-fields">
          {([0, 1, 2] as const).map((i) => (
            <label key={i}>
              <span className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <span>Hook {String.fromCharCode(65 + i)}</span>
                <button
                  type="button"
                  className="secondary compact"
                  onClick={() => onCopyHook(i)}
                >
                  {copied === (`hook${i}` as CopyTarget) ? "已复制" : "复制"}
                </button>
              </span>
              <textarea
                rows={2}
                value={hooks[i]}
                maxLength={HOOK_MAX}
                onChange={(e) => patchHookLine(i, e.target.value)}
                aria-label={`Hook ${String.fromCharCode(65 + i)}`}
                spellCheck
              />
              <span className="muted" style={{ fontSize: "0.85em" }}>
                {[...hooks[i]].length}/{HOOK_MAX}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card section">
        <div className="section-head">
          <h2>汇总脚本（可编辑）</h2>
          <button
            type="button"
            className="secondary compact"
            onClick={onCopyScript}
          >
            {copied === "script" ? "已复制" : "一键复制脚本"}
          </button>
        </div>
        <textarea
          className="out out-edit"
          value={scriptEdit}
          onChange={(e) => setScriptEdit(e.target.value)}
          rows={10}
          aria-label="汇总短视频脚本（可编辑）"
          spellCheck
        />
      </section>

      <section className="card section">
        <h2>主图占位</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={editedPack.imagePlaceholder}
          alt="主图占位"
          className="placeholder-img"
        />
        <p className="muted">MVP 使用静态占位图；真图生成留待后续。</p>
      </section>

      <div className="actions">
        <button type="button" className="primary" onClick={exportMd}>
          导出 Markdown
        </button>
        <button type="button" className="secondary" onClick={exportJson}>
          导出 JSON
        </button>
        <button type="button" className="secondary" onClick={exportTxt}>
          导出 TXT
        </button>
        <Link href="/" className="secondary btn-link">
          再跑一次
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
