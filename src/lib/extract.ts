import type { ListingInput } from "./types";

/** Soft cap for pasted detail text (~20k chars). */
export const MAX_PASTE_CHARS = 20_000;

/** Cap for fetched HTML body (100 KiB). */
export const MAX_FETCH_BYTES = 100 * 1024;

export type ExtractPartial = Partial<
  Pick<ListingInput, "productName" | "category" | "keyFeatures" | "targetMarket">
>;

export type ExtractFailCode =
  | "empty"
  | "oversized"
  | "bad_url"
  | "unreachable"
  | "no_content";

export class ExtractError extends Error {
  code: ExtractFailCode;
  constructor(code: ExtractFailCode, message: string) {
    super(message);
    this.code = code;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function metaContent(html: string, key: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  return decodeEntities((m?.[1] || m?.[2] || "").trim());
}

function tagText(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  return decodeEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function stripHtmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function guessMarket(hay: string): string | undefined {
  const h = hay.toLowerCase();
  if (/shopee|虾皮| Lazada|lazada/.test(hay) || /shopee/.test(h)) {
    return "东南亚 Shopee";
  }
  if (/amazon\.co\.uk|英国/.test(h)) return "英国 Amazon";
  if (/amazon\.de|德国/.test(h)) return "德国 Amazon";
  if (/amazon\.com|美国 amazon|us amazon/.test(h)) return "美国 Amazon";
  if (/amazon/.test(h)) return "美国 Amazon";
  if (/独立站|shopify|woocommerce|dtc/.test(h)) return "独立站 DTC";
  return undefined;
}

function labeledValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*[:：]\\s*(.+?)(?=\\n|$)`,
      "im",
    );
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

/** Heuristic extract from pasted product detail text. */
export function extractFromText(raw: string): ExtractPartial {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    throw new ExtractError("empty", "内容为空：请粘贴商品详情，或改填下方表单。");
  }
  if ([...text].length > MAX_PASTE_CHARS) {
    throw new ExtractError(
      "oversized",
      `内容过长（超过 ${MAX_PASTE_CHARS} 字符）：请缩短后再试，或直接手动填写表单。`,
    );
  }

  const productName =
    labeledValue(text, [
      "商品名",
      "产品名",
      "品名",
      "标题",
      "Title",
      "Product Name",
      "Product",
    ]) ||
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^https?:\/\//i.test(l) && l.length <= 120) ||
    "";

  const category =
    labeledValue(text, ["类目", "分类", "Category", "品类"]) || "";

  const featureBlock =
    labeledValue(text, [
      "关键卖点",
      "卖点",
      "特点",
      "亮点",
      "Features",
      "Key Features",
      "Bullet Points",
    ]) || "";

  let keyFeatures = featureBlock;
  if (!keyFeatures) {
    const bullets = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[-*•·\d]+[.)、\s]/.test(l))
      .map((l) => l.replace(/^[-*•·\d]+[.)、\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
    if (bullets.length) {
      keyFeatures = bullets.join("、");
    } else {
      // Take a mid chunk of prose as features seed (editable).
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && l !== productName);
      keyFeatures = lines.slice(0, 6).join("、").slice(0, 500);
    }
  }

  const targetMarket =
    labeledValue(text, ["目标市场", "市场", "站点", "Market", "Marketplace"]) ||
    guessMarket(text);

  const out: ExtractPartial = {};
  if (productName) out.productName = productName.slice(0, 200);
  if (category) out.category = category.slice(0, 120);
  if (keyFeatures) out.keyFeatures = keyFeatures.slice(0, 2000);
  if (targetMarket) out.targetMarket = targetMarket;

  if (!out.productName && !out.keyFeatures) {
    throw new ExtractError(
      "no_content",
      "未能从文本识别商品信息：请调整粘贴内容，或直接手动填写表单。",
    );
  }
  return out;
}

/** Heuristic extract from HTML (title / og / meta / body text). */
export function extractFromHtml(html: string, pageUrl?: string): ExtractPartial {
  if (!html.trim()) {
    throw new ExtractError(
      "no_content",
      "页面无有效内容：请换链接，或粘贴详情文本 / 手动填写表单。",
    );
  }
  if (html.length > MAX_FETCH_BYTES * 2) {
    // Guard against huge strings passed in unexpectedly.
    html = html.slice(0, MAX_FETCH_BYTES);
  }

  const ogTitle = metaContent(html, "og:title");
  const title = ogTitle || tagText(html, "title");
  const ogDesc =
    metaContent(html, "og:description") ||
    metaContent(html, "description") ||
    metaContent(html, "twitter:description");
  const plain = stripHtmlToText(html).slice(0, 8000);
  const hay = `${title}\n${ogDesc}\n${plain}\n${pageUrl || ""}`;

  const productName = (title || "")
    .replace(/\s*[|\-–—].*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  const keyFeatures = (ogDesc || plain.split("\n").slice(0, 8).join("、"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  const category =
    labeledValue(plain, ["类目", "分类", "Category", "品类"]) || "";

  const targetMarket = guessMarket(hay);

  const out: ExtractPartial = {};
  if (productName) out.productName = productName;
  if (category) out.category = category.slice(0, 120);
  if (keyFeatures) out.keyFeatures = keyFeatures;
  if (targetMarket) out.targetMarket = targetMarket;

  if (!out.productName && !out.keyFeatures) {
    throw new ExtractError(
      "no_content",
      "未能从页面抽取可用字段：请粘贴详情文本，或直接手动填写表单。",
    );
  }
  return out;
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

export function assertPublicHttpUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ExtractError("empty", "链接为空：请粘贴 URL，或改用详情文本 / 手动填表。");
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ExtractError(
      "bad_url",
      "链接无效：请粘贴以 http:// 或 https:// 开头的完整 URL，或改用详情文本 / 手动填表。",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ExtractError(
      "bad_url",
      "仅支持 http/https 链接：请更换 URL，或粘贴详情文本 / 手动填表。",
    );
  }
  if (isPrivateHostname(url.hostname)) {
    throw new ExtractError(
      "bad_url",
      "无法访问该地址（内网/本机链接不支持）：请换公网商品页，或粘贴详情文本 / 手动填表。",
    );
  }
  return url;
}

/** Server-side fetch + extract. */
export async function extractFromUrl(rawUrl: string): Promise<ExtractPartial> {
  const url = assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AiWebWorkflowBot/1.0; +https://ai-web-workflow.vercel.app)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      throw new ExtractError(
        "unreachable",
        `无法打开链接（HTTP ${res.status}）：请检查 URL，或粘贴详情文本 / 手动填写表单。`,
      );
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FETCH_BYTES) {
      throw new ExtractError(
        "oversized",
        `页面过大（超过 ${Math.round(MAX_FETCH_BYTES / 1024)}KB）：请粘贴关键详情文本，或手动填写表单。`,
      );
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return extractFromHtml(html, url.toString());
  } catch (err) {
    if (err instanceof ExtractError) throw err;
    throw new ExtractError(
      "unreachable",
      "链接无法访问或超时：请检查网络与 URL，或粘贴详情文本 / 手动填写表单。",
    );
  } finally {
    clearTimeout(timer);
  }
}
