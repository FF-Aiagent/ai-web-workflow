"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ListingInput, ListingPack, QuotaState } from "@/lib/types";
import {
  copyText,
  downloadText,
  packToJson,
  packToMarkdown,
  packToTxt,
} from "@/lib/export";
import { Disclaimer } from "./Disclaimer";
import { STORAGE_KEY } from "./WorkflowForm";

type Stored = {
  pack: ListingPack;
  input: ListingInput;
  quota: QuotaState;
};

type CopyTarget = "copy" | "script" | null;

export function ResultView() {
  const router = useRouter();
  const [data, setData] = useState<Stored | null>(null);
  const [copyEdit, setCopyEdit] = useState("");
  const [scriptEdit, setScriptEdit] = useState("");
  const [copied, setCopied] = useState<CopyTarget>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Stored;
      setData(parsed);
      setCopyEdit(parsed.pack.copy);
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
    if (!data) return null;
    return {
      ...data.pack,
      copy: copyEdit,
      script: scriptEdit,
    };
  }, [data, copyEdit, scriptEdit]);

  /** Persist edits so refresh/再看 still reflects what the seller typed. */
  useEffect(() => {
    if (!data || !editedPack) return;
    const next: Stored = { ...data, pack: editedPack };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [data, editedPack]);

  if (!data || !editedPack) {
    return <p className="muted">加载结果…</p>;
  }

  const name = data.input.productName || "listing";

  async function onCopy(target: "copy" | "script") {
    const text = target === "copy" ? copyEdit : scriptEdit;
    const ok = await copyText(text);
    if (ok) setCopied(target);
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
        文案与脚本可直接改；复制与导出（md / json / txt）都会用你改后的内容。
      </p>

      <section className="card section">
        <div className="section-head">
          <h2>① 主图文案</h2>
          <button
            type="button"
            className="secondary compact"
            onClick={() => onCopy("copy")}
          >
            {copied === "copy" ? "已复制" : "一键复制文案"}
          </button>
        </div>
        <textarea
          className="out out-edit"
          value={copyEdit}
          onChange={(e) => setCopyEdit(e.target.value)}
          rows={12}
          aria-label="主图文案（可编辑）"
          spellCheck
        />
      </section>

      <section className="card section">
        <div className="section-head">
          <h2>② 约 15 秒短视频脚本</h2>
          <button
            type="button"
            className="secondary compact"
            onClick={() => onCopy("script")}
          >
            {copied === "script" ? "已复制" : "一键复制脚本"}
          </button>
        </div>
        <textarea
          className="out out-edit"
          value={scriptEdit}
          onChange={(e) => setScriptEdit(e.target.value)}
          rows={14}
          aria-label="短视频脚本（可编辑）"
          spellCheck
        />
      </section>

      <section className="card section">
        <h2>③ 主图占位</h2>
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
