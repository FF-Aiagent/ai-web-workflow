import type {
  AmazonFields,
  DtcFields,
  PlatformBundle,
  PlatformId,
  ShopeeFields,
} from "./types";

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  amazon: "Amazon",
  shopee: "Shopee",
  dtc: "DTC / 独立站",
};

export const AMAZON_TITLE_MAX = 75;

export function amazonTitleHint(title: string): string | null {
  const n = [...title].length;
  if (n > AMAZON_TITLE_MAX) {
    return `已超限：${n}/${AMAZON_TITLE_MAX} 字符（Amazon 建议 ≤${AMAZON_TITLE_MAX}）`;
  }
  return null;
}

export function formatAmazonBlock(f: AmazonFields): string {
  return [
    "【Amazon】",
    `标题：${f.title}`,
    "",
    "变体名：",
    ...f.variants.map((v, i) => `${i + 1}. ${v}`),
    "",
    "五点描述：",
    ...f.bullets.map((b, i) => `${i + 1}. ${b}`),
    "",
    `后台搜索词：${f.backendSearchTerms}`,
  ].join("\n");
}

export function formatShopeeBlock(f: ShopeeFields): string {
  return [
    "【Shopee】",
    `标题：${f.title}`,
    "",
    "描述：",
    f.description,
    "",
    `关键属性：${f.keyAttributes || "（空）"}`,
  ].join("\n");
}

export function formatDtcBlock(f: DtcFields): string {
  return [
    "【DTC / 独立站】",
    `标题：${f.title}`,
    "",
    "短描述：",
    f.shortDescription,
    "",
    "长描述：",
    f.longDescription,
    "",
    `CTA：${f.cta}`,
  ].join("\n");
}

export function formatPlatformBlock(
  id: PlatformId,
  platforms: PlatformBundle,
): string {
  if (id === "amazon") return formatAmazonBlock(platforms.amazon);
  if (id === "shopee") return formatShopeeBlock(platforms.shopee);
  return formatDtcBlock(platforms.dtc);
}

export function formatAllPlatforms(platforms: PlatformBundle): string {
  return [
    formatAmazonBlock(platforms.amazon),
    "",
    "────────",
    "",
    formatShopeeBlock(platforms.shopee),
    "",
    "────────",
    "",
    formatDtcBlock(platforms.dtc),
  ].join("\n");
}

/** Normalize LLM / partial payloads into a full AmazonFields. */
export function normalizeAmazon(
  partial: Partial<AmazonFields> | undefined,
  fallback: AmazonFields,
): AmazonFields {
  const title = String(partial?.title ?? fallback.title);
  const rawVariants = Array.isArray(partial?.variants)
    ? partial!.variants.map((v) => String(v ?? "")).filter(Boolean)
    : [...fallback.variants];
  while (rawVariants.length < 2) rawVariants.push(fallback.variants[rawVariants.length] || `变体 ${rawVariants.length + 1}`);
  const variants = (
    rawVariants.length >= 3
      ? [rawVariants[0], rawVariants[1], rawVariants[2]]
      : [rawVariants[0], rawVariants[1]]
  ) as AmazonFields["variants"];
  const rawBullets = Array.isArray(partial?.bullets)
    ? partial!.bullets.map((b) => String(b ?? ""))
    : [...fallback.bullets];
  while (rawBullets.length < 5) {
    rawBullets.push(fallback.bullets[rawBullets.length] || `卖点 ${rawBullets.length + 1}`);
  }
  const bullets = rawBullets.slice(0, 5) as AmazonFields["bullets"];
  return {
    title,
    variants,
    bullets,
    backendSearchTerms: String(
      partial?.backendSearchTerms ?? fallback.backendSearchTerms,
    ),
  };
}

export function normalizeShopee(
  partial: Partial<ShopeeFields> | undefined,
  fallback: ShopeeFields,
): ShopeeFields {
  return {
    title: String(partial?.title ?? fallback.title),
    description: String(partial?.description ?? fallback.description),
    keyAttributes: String(partial?.keyAttributes ?? fallback.keyAttributes),
  };
}

export function normalizeDtc(
  partial: Partial<DtcFields> | undefined,
  fallback: DtcFields,
): DtcFields {
  return {
    title: String(partial?.title ?? fallback.title),
    shortDescription: String(
      partial?.shortDescription ?? fallback.shortDescription,
    ),
    longDescription: String(
      partial?.longDescription ?? fallback.longDescription,
    ),
    cta: String(partial?.cta ?? fallback.cta),
  };
}
