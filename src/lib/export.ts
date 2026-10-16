import type { ListingPack } from "./types";

export function packToMarkdown(pack: ListingPack, productName: string): string {
  return [
    `# ${productName || "跨境 Listing 交付包"}`,
    "",
    `生成时间：${pack.generatedAt}`,
    `模式：${pack.mode === "live" ? "Live API" : "Mock（无 API Key）"}`,
    "",
    "## 主图文案",
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

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
