import { formatAllPlatforms } from "./platforms";
import type { HookPack, ListingPack, PlatformBundle } from "./types";


export function formatOneHook(label: string, h: HookPack): string {
  return [
    `【钩子 ${label}】${h.hook}`,
    "",
    "分镜：",
    ...h.storyboard.map((s) => `- ${s}`),
    "",
    `口播：${h.voiceover}`,
    `CTA：${h.cta}`,
  ].join("\n");
}

export function formatAllHooks(hooks: HookPack[] | undefined): string {
  if (!hooks || hooks.length === 0) return "";
  return hooks
    .map((h, i) => formatOneHook(String.fromCharCode(65 + i), h))
    .join("\n\n——\n\n");
}

function hooksSection(hooks: HookPack[] | undefined): string[] {
  if (!hooks || hooks.length === 0) return [];
  return ["## 多钩子脚本包（A/B/C）", "", formatAllHooks(hooks), ""];
}

function platformSection(platforms: PlatformBundle | undefined): string[] {
  if (!platforms) return [];
  return [
    "## 多平台字段",
    "",
    formatAllPlatforms(platforms),
    "",
  ];
}

export function packToMarkdown(pack: ListingPack, productName: string): string {
  return [
    `# ${productName || "跨境 Listing 交付包"}`,
    "",
    `生成时间：${pack.generatedAt}`,
    `模式：${pack.mode === "live" ? "Live API" : "Mock（无 API Key）"}`,
    "",
    ...platformSection(pack.platforms),
    ...hooksSection(pack.hooks),
    "## 主图文案（汇总）",
    "",
    pack.copy,
    "",
    "## 约 15 秒短视频脚本",
    "",
    pack.script,
    "",
    "## 主图占位",
    "",
    pack.imagePlaceholder,
    "",
    "## 免责声明",
    "",
    pack.disclaimer,
    "",
  ].join("\n");
}

export function packToJson(pack: ListingPack, productName: string): string {
  return JSON.stringify(
    {
      productName,
      ...pack,
    },
    null,
    2,
  );
}

/** Plain-text export: platforms + script + disclaimer. */
export function packToTxt(pack: ListingPack, productName: string): string {
  const platformBlock = pack.platforms
    ? formatAllPlatforms(pack.platforms)
    : pack.copy;
  return [
    productName || "跨境 Listing 交付包",
    "",
    "—— 多平台字段 ——",
    "",
    platformBlock,
    "",
    "—— 多钩子脚本包 ——",
    "",
    formatAllHooks(pack.hooks) || pack.script,
    "",
    "—— 免责声明 ——",
    "",
    pack.disclaimer,
    "",
  ].join("\n");
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Clipboard helper; returns true if write succeeded. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
