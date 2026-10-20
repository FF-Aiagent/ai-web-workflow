"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ByteCounter } from "@/components/ByteCounter";

export function BackendTermsTool() {
  const [productName, setProductName] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [category, setCategory] = useState("");
  const [terms, setTerms] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "quota">("idle");
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setCopied(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          keyFeatures,
          category,
          targetMarket: "US",
        }),
      });
      if (res.status === 402) {
        setStatus("quota");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setTerms(String(data?.pack?.platforms?.amazon?.backendSearchTerms ?? ""));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(terms);
    setCopied(true);
  }

  return (
    <div className="card">
      <form onSubmit={onSubmit} className="form">
        <label>
          Product name
          <input required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Stainless steel water bottle" />
        </label>
        <label>
          Key features
          <textarea required rows={3} value={keyFeatures} onChange={(e) => setKeyFeatures(e.target.value)} placeholder="insulated, leak proof, 32 oz, BPA free" />
        </label>
        <label>
          Category (optional)
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Sports & Outdoors" />
        </label>
        <button type="submit" className="primary" disabled={status === "loading"}>
          {status === "loading" ? "Generating…" : "Generate"}
        </button>
      </form>
      {status === "error" && <p className="error">Something went wrong. Please try again.</p>}
      {status === "quota" && (
        <p className="error">
          Your free try is used up. <Link href="/login">Log in</Link> to get 10 free generations.
        </p>
      )}
      {terms && (
        <div className="form" style={{ marginTop: 12 }}>
          <label>
            Backend search terms
            <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </label>
          <ByteCounter value={terms} />
          <button type="button" className="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
