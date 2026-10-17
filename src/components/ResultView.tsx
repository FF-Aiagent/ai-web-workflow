"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AmazonFields,
  DtcFields,
  HookPack,
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

type CopyTarget = "platform" | "script" | "hook" | null;
type HookTab = 0 | 1 | 2;

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


function emptyHook(): HookPack {
  return { hook: "", storyboard: ["", "", ""], voiceover: "", cta: "" };
}

function ensureHooks(pack: ListingPack): [HookPack, HookPack, HookPack] {
  if (pack.hooks && pack.hooks.length === 3) {
    return pack.hooks;
  }
  return [emptyHook(), emptyHook(), emptyHook()];
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
  const [hooks, setHooks] = useState<[HookPack, HookPack, HookPack] | null>(null);
  const [scriptEdit, setScriptEdit] = useState("");
  const [tab, setTab] = useState<PlatformId>("amazon");
  const [hookTab, setHookTab] = useState<HookTab>(0);
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
    if (!data || !platforms || !hooks) return null;
    return {
      ...data.pack,
      platforms,
      hooks,
      copy: formatAllPlatforms(platforms),
      script: scriptEdit,
    };
  }, [data, platforms, hooks, scriptEdit]);

  useEffect(() => {
    if (!data || !editedPack) return;
    const next: Stored = { ...data, pack: editedPack };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [data, editedPack]);

  if (!data || !platforms || !hooks || !editedPack) {
    return <p className="muted">加载结果…</p>;
  }

  const name = data.input.productName || "listing";
  const fieldHelp = PLATFORM_FIELD_MAP[tab];

  async function onCopyPlatform() {
    const text = formatPlatformBlock(tab, platforms!);
    const ok = await copyText(text);
    if (ok) setCopied("platform");
  }

  async function onCopyScript() {
    const ok = await copyText(scriptEdit);
    if (ok) setCopied("script");
  }

  async function onCopyHook() {
    const label = String.fromCharCode(65 + hookTab);
    const ok = await copyText(formatOneHook(label, hooks![hookTab]));
    if (ok) setCopied("hook");
  }

  function patchHook(index: HookTab, patch: Partial<HookPack>) {
    setHooks((prev) => {
      if (!prev) return prev;
      const next = [...prev] as [HookPack, HookPack, HookPack];
      next[index] = { ...next[index], ...patch };
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
          剩余免费次数：{data.quota.remaining}/{data.quota.max}
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
          <h2>多钩子脚本包</h2>
          <button
            type="button"
            className="secondary compact"
            onClick={onCopyHook}
          >
            {copied === "hook" ? "已复制" : "复制本钩子"}
          </button>
        </div>
        <p className="muted edit-hint">
          一次出 Hook A/B/C；每条含钩子一句、分镜、口播、CTA，均可改。「复制本钩子」只复制当前栏；导出
          md / json / txt 含三钩子的编辑态。
        </p>
        <div className="platform-tabs" role="tablist" aria-label="钩子">
          {([0, 1, 2] as HookTab[]).map((i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={hookTab === i}
              className={`platform-tab ${hookTab === i ? "active" : ""}`}
              onClick={() => setHookTab(i)}
            >
              Hook {String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
        <div className="platform-fields">
          <label>
            钩子一句
            <input
              value={hooks[hookTab].hook}
              onChange={(e) => patchHook(hookTab, { hook: e.target.value })}
              aria-label={`Hook ${String.fromCharCode(65 + hookTab)} 钩子`}
            />
          </label>
          <fieldset className="field-group">
            <legend>分镜（3–5 步）</legend>
            {hooks[hookTab].storyboard.map((step, si) => (
              <input
                key={si}
                value={step}
                onChange={(e) => {
                  const storyboard = [...hooks[hookTab].storyboard];
                  storyboard[si] = e.target.value;
                  patchHook(hookTab, { storyboard });
                }}
                aria-label={`分镜 ${si + 1}`}
                placeholder={`分镜 ${si + 1}`}
              />
            ))}
            {hooks[hookTab].storyboard.length < 5 && (
              <button
                type="button"
                className="linkish"
                onClick={() =>
                  patchHook(hookTab, {
                    storyboard: [...hooks[hookTab].storyboard, ""],
                  })
                }
              >
                + 分镜步骤
              </button>
            )}
          </fieldset>
          <label>
            口播草稿
            <textarea
              rows={4}
              value={hooks[hookTab].voiceover}
              onChange={(e) =>
                patchHook(hookTab, { voiceover: e.target.value })
              }
              aria-label="口播草稿"
            />
          </label>
          <label>
            CTA
            <input
              value={hooks[hookTab].cta}
              onChange={(e) => patchHook(hookTab, { cta: e.target.value })}
              aria-label="CTA"
            />
          </label>
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
