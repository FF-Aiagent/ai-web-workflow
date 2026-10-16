"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ListingInput, ListingPack, QuotaState } from "@/lib/types";
import { downloadText, packToJson, packToMarkdown } from "@/lib/export";
import { Disclaimer } from "./Disclaimer";
import { STORAGE_KEY } from "./WorkflowForm";

type Stored = {
  pack: ListingPack;
  input: ListingInput;
  quota: QuotaState;
};

export function ResultView() {
  const router = useRouter();
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setData(JSON.parse(raw) as Stored);
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!data) {
    return <p className="muted">加载结果…</p>;
  }

  const { pack, input } = data;
  const name = input.productName || "listing";

  function exportMd() {
    downloadText(
      `${name}-listing.md`,
      packToMarkdown(pack, name),
      "text/markdown;charset=utf-8",
    );
  }

  function exportJson() {
    downloadText(
      `${name}-listing.json`,
      packToJson(pack, name),
      "application/json;charset=utf-8",
    );
  }

  return (
    <div className="stack">
      <div className="result-meta">
        <span className={`pill ${pack.mode}`}>
          {pack.mode === "live" ? "Live API" : "Mock 演示"}
        </span>
        <span className="muted">
          剩余免费次数：{data.quota.remaining}/{data.quota.max}
        </span>
      </div>

      <section className="card section">
        <h2>① 主图文案</h2>
        <pre className="out">{pack.copy}</pre>
      </section>

      <section className="card section">
        <h2>② 约 15 秒短视频脚本</h2>
        <pre className="out">{pack.script}</pre>
      </section>

      <section className="card section">
        <h2>③ 主图占位</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pack.imagePlaceholder}
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
        <Link href="/" className="secondary btn-link">
          再跑一次
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
