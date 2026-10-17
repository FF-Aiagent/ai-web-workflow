import { DISCLAIMER_ZH } from "./disclaimer";
import {
  formatAllPlatforms,
  normalizeAmazon,
  normalizeDtc,
  normalizeShopee,
} from "./platforms";
import type {
  AmazonFields,
  DtcFields,
  ListingInput,
  HookPack,
  ListingPack,
  PlatformBundle,
  ShopeeFields,
} from "./types";

export interface ListingGenerator {
  generateListingPack(input: ListingInput): Promise<ListingPack>;
}

function featureBits(features: string): string[] {
  const parts = features
    .split(/[,，、;/｜|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return ["轻便", "耐用", "高性价比"];
  return parts;
}

function mockPlatforms(input: ListingInput): PlatformBundle {
  const name = input.productName.trim() || "未命名商品";
  const market = input.targetMarket.trim() || "美国站";
  const features = input.keyFeatures.trim() || "轻便、耐用、高性价比";
  const category = input.category.trim() || "通用";
  const tone = input.tone?.trim() || "专业简洁";
  const bits = featureBits(features);

  const amazonTitleRaw = `${name} ${bits[0]} ${category} for ${market}`
    .replace(/\s+/g, " ")
    .trim();
  const amazonTitle =
    [...amazonTitleRaw].length <= 75
      ? amazonTitleRaw
      : [...amazonTitleRaw].slice(0, 75).join("").trim();

  const amazon: AmazonFields = {
    title: amazonTitle,
    variants:
      bits.length >= 3
        ? [bits[0], bits[1], bits[2]]
        : ([bits[0], bits[1] || `${name} 标准款`] as [string, string]),
    bullets: [
      `【核心卖点】${features}`,
      `【适用场景】日常使用 / 礼品 / 旅行，适配 ${market} 买家习惯`,
      `【品质承诺】精选材料与细节打磨，类目：${category}`,
      `【差异化】${tone} 表达，突出「${bits[0]}」`,
      `【售后安心】上架前请按站点规范自查合规与关键词`,
    ],
    backendSearchTerms: [name, category, ...bits, market, "gift"]
      .join(" ")
      .toLowerCase(),
  };

  const shopee: ShopeeFields = {
    title: `${name}｜${bits[0]}｜${category}`,
    description: [
      `${name} 专为 ${market} / 东南亚买家设计。`,
      `亮点：${features}。`,
      `类目：${category}。语气：${tone}。`,
      `上架前请按 Shopee 站点规则调整禁限售与本地化表述。`,
    ].join("\n"),
    // Category placeholder may be empty per Brief / QA gate.
    keyAttributes: category
      ? `类目：${category}\n卖点：${bits.slice(0, 3).join(" / ")}`
      : "",
  };

  const dtc: DtcFields = {
    title: name,
    shortDescription: `${bits[0]} · ${category} — 为 ${market} 买家准备的 ${name}。`,
    longDescription: [
      `欢迎了解 ${name}。`,
      `我们聚焦「${features}」，用${tone}的表达帮你快速讲清价值。`,
      `无论是自用还是送礼，都能在独立站详情页完成种草到下单。`,
      `请在发布前按自有品牌语气与合规要求再审一遍。`,
    ].join("\n\n"),
    cta: `立即选购 ${name} →`,
  };

  return { amazon, shopee, dtc };
}


function mockHooks(input: ListingInput): [HookPack, HookPack, HookPack] {
  const name = input.productName.trim() || "未命名商品";
  const market = input.targetMarket.trim() || "美国站";
  const features = input.keyFeatures.trim() || "轻便、耐用、高性价比";
  const category = input.category.trim() || "通用";
  const bits = featureBits(features);

  const a: HookPack = {
    hook: `还在为 ${category} 纠结？${name} 专为 ${market} 买家准备。`,
    storyboard: [
      "0–3s：产品特写 / 开箱冲击",
      "3–8s：使用场景快切（2–3 镜）",
      "8–12s：卖点字幕叠画面",
      "12–15s：产品 + CTA 字幕定格",
    ],
    voiceover: `还在找靠谱的 ${category}？看看 ${name}。${features} —— 现在主页下单。`,
    cta: `立即了解 ${name} →`,
  };
  const b: HookPack = {
    hook: `3 秒看懂：为什么 ${market} 卖家都在推 ${name}。`,
    storyboard: [
      "0–3s：痛点字幕（犹豫/踩坑）",
      "3–7s：产品入画解决痛点",
      "7–12s：细节特写 + 卖点 ${bits[0]}",
      "12–15s：口播 CTA + 链接提示",
      "可选：对比前后结果一镜",
    ],
    voiceover: `别再踩坑。${name} 主打 ${bits[0]}，适合 ${market}。点进主页看详情。`,
    cta: `主页链接下单 ${name}`,
  };
  const c: HookPack = {
    hook: `如果你只看一条：${name} 的 ${bits[0]} 值不值得买？`,
    storyboard: [
      "0–4s：问句钩子大字幕",
      "4–9s：演示核心卖点",
      "9–13s：社会证明/场景收尾",
      "13–15s：CTA 强提示",
    ],
    voiceover: `${name}，${features}。想试？简介点链接。`,
    cta: `马上选购 ${name}`,
  };
  return [a, b, c];
}

function formatHooksScript(hooks: [HookPack, HookPack, HookPack]): string {
  return hooks
    .map((h, i) => {
      const label = String.fromCharCode(65 + i);
      return [
        `【钩子 ${label}】${h.hook}`,
        "",
        "分镜：",
        ...h.storyboard.map((s) => `- ${s}`),
        "",
        `口播：${h.voiceover}`,
        `CTA：${h.cta}`,
      ].join("\n");
    })
    .join("\n\n——\n\n");
}

function mockScript(input: ListingInput): string {
  const name = input.productName.trim() || "未命名商品";
  const market = input.targetMarket.trim() || "美国站";
  const features = input.keyFeatures.trim() || "轻便、耐用、高性价比";
  const category = input.category.trim() || "通用";

  return [
    `【约 15 秒短视频脚本】${name}`,
    "",
    `0–3s  画面：产品特写 / 开箱`,
    `旁白：还在找靠谱的 ${category}？看看 ${name}。`,
    "",
    `3–8s  画面：使用场景快切（2–3 镜）`,
    `旁白：${features} —— 专为 ${market} 用户设计。`,
    "",
    `8–12s 画面：细节特写 + 对比/结果`,
    `旁白：轻一点、稳一点、更省心。`,
    "",
    `12–15s 画面：产品 + CTA 字幕`,
    `旁白：现在下单，主页链接见简介。`,
    `字幕：立即购买 | ${name}`,
  ].join("\n");
}

function mockPack(input: ListingInput): ListingPack {
  const platforms = mockPlatforms(input);
  const hooks = mockHooks(input);
  return {
    copy: formatAllPlatforms(platforms),
    script: formatHooksScript(hooks),
    imagePlaceholder: "/placeholders/product.svg",
    disclaimer: DISCLAIMER_ZH,
    generatedAt: new Date().toISOString(),
    mode: "mock",
    platforms,
    hooks,
  };
}

type LivePlatformsPayload = {
  amazon?: Partial<AmazonFields>;
  shopee?: Partial<ShopeeFields>;
  dtc?: Partial<DtcFields>;
  script?: string;
  hooks?: Partial<HookPack>[];
};


function normalizeHook(raw: Partial<HookPack> | undefined, fallback: HookPack): HookPack {
  const storyboard = Array.isArray(raw?.storyboard)
    ? raw!.storyboard!.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const steps =
    storyboard.length >= 3
      ? storyboard.slice(0, 5)
      : fallback.storyboard;
  return {
    hook: (raw?.hook || fallback.hook).trim() || fallback.hook,
    storyboard: steps,
    voiceover: (raw?.voiceover || fallback.voiceover).trim() || fallback.voiceover,
    cta: (raw?.cta || fallback.cta).trim() || fallback.cta,
  };
}

function normalizeHooks(
  raw: Partial<HookPack>[] | undefined,
  fallback: [HookPack, HookPack, HookPack],
): [HookPack, HookPack, HookPack] {
  return [
    normalizeHook(raw?.[0], fallback[0]),
    normalizeHook(raw?.[1], fallback[1]),
    normalizeHook(raw?.[2], fallback[2]),
  ];
}

async function liveOpenAI(input: ListingInput): Promise<ListingPack> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return mockPack(input);
  }

  const fallback = mockPlatforms(input);

  const prompt = `你是跨境电商 listing 文案助手。根据商品信息，用中文输出 JSON（不要 markdown 围栏），结构必须为：
{
  "amazon": {
    "title": "字符串，尽量≤75字符",
    "variants": ["变体1","变体2"] 或 三个元素,
    "bullets": ["1","2","3","4","5"],
    "backendSearchTerms": "空格分隔后台搜索词"
  },
  "shopee": {
    "title": "标题",
    "description": "描述",
    "keyAttributes": "关键属性，类目可空字符串"
  },
  "dtc": {
    "title": "标题",
    "shortDescription": "短描述",
    "longDescription": "长描述",
    "cta": "一行行动号召"
  },
  "script": "可选：汇总脚本纯文本",
  "hooks": [
    {"hook":"钩子一句","storyboard":["步骤1","步骤2","步骤3"],"voiceover":"口播草稿","cta":"CTA"},
    {"hook":"钩子B","storyboard":["步骤1","步骤2","步骤3","步骤4"],"voiceover":"口播","cta":"CTA"},
    {"hook":"钩子C","storyboard":["步骤1","步骤2","步骤3"],"voiceover":"口播","cta":"CTA"}
  ]
}
商品名：${input.productName}
类目：${input.category}
卖点：${input.keyFeatures}
目标市场：${input.targetMarket}
语气：${input.tone || "专业简洁"}`;

  try {
    const base = (
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "只返回合法 JSON 对象。" },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error("OpenAI error", res.status, await res.text());
      return mockPack(input);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(
      raw.replace(/^```json\s*|\s*```$/g, "").trim(),
    ) as LivePlatformsPayload;

    const platforms: PlatformBundle = {
      amazon: normalizeAmazon(parsed.amazon, fallback.amazon),
      shopee: normalizeShopee(parsed.shopee, fallback.shopee),
      dtc: normalizeDtc(parsed.dtc, fallback.dtc),
    };

    const hooksFallback = mockHooks(input);
    const hooks = normalizeHooks(parsed.hooks, hooksFallback);
    return {
      copy: formatAllPlatforms(platforms),
      script: parsed.script || formatHooksScript(hooks),
      imagePlaceholder: "/placeholders/product.svg",
      disclaimer: DISCLAIMER_ZH,
      generatedAt: new Date().toISOString(),
      mode: "live",
      platforms,
      hooks,
    };
  } catch (err) {
    console.error("liveOpenAI failed, falling back to mock", err);
    return mockPack(input);
  }
}

class DefaultGenerator implements ListingGenerator {
  async generateListingPack(input: ListingInput): Promise<ListingPack> {
    if (process.env.OPENAI_API_KEY) {
      return liveOpenAI(input);
    }
    return mockPack(input);
  }
}

export const listingGenerator: ListingGenerator = new DefaultGenerator();

export async function generateListingPack(
  input: ListingInput,
): Promise<ListingPack> {
  return listingGenerator.generateListingPack(input);
}
