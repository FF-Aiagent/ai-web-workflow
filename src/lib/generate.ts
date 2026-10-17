import { DISCLAIMER_ZH } from "./disclaimer";
import type { ListingInput, ListingPack } from "./types";

export interface ListingGenerator {
  generateListingPack(input: ListingInput): Promise<ListingPack>;
}

function mockPack(input: ListingInput): ListingPack {
  const name = input.productName.trim() || "未命名商品";
  const market = input.targetMarket.trim() || "美国站";
  const features = input.keyFeatures.trim() || "轻便、耐用、高性价比";
  const category = input.category.trim() || "通用";
  const tone = input.tone?.trim() || "专业简洁";

  const copy = [
    `【${name}】${category} · ${market} Listing 文案`,
    "",
    `标题建议：`,
    `${name} — ${features.split(/[,，、]/)[0] || features} | Ideal for ${market}`,
    "",
    `卖点（Bullet Points）：`,
    `• 核心卖点：${features}`,
    `• 适用场景：日常使用 / 礼品 / 旅行携带`,
    `• 品质承诺：精选材料，细节打磨，适配 ${market} 买家习惯`,
    `• 为什么选我们：${tone} 表达，突出差异化与信任感`,
    "",
    `五段描述：`,
    `欢迎来到 ${name}。我们专为 ${market} 买家打造这款 ${category} 产品，聚焦「${features}」。`,
    `无论是自用还是送礼，都能快速理解价值并完成下单。上架前请按目标站点规范调整关键词与合规表述。`,
  ].join("\n");

  const script = [
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

  return {
    copy,
    script,
    imagePlaceholder: "/placeholders/product.svg",
    disclaimer: DISCLAIMER_ZH,
    generatedAt: new Date().toISOString(),
    mode: "mock",
  };
}

async function liveOpenAI(input: ListingInput): Promise<ListingPack> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return mockPack(input);
  }

  const prompt = `你是跨境电商 listing 文案助手。根据以下商品信息，用中文输出 JSON（不要 markdown 围栏）：
{"copy":"主图/详情文案，含标题建议与卖点","script":"约15秒短视频分镜脚本（含时间码与旁白）"}
商品名：${input.productName}
类目：${input.category}
卖点：${input.keyFeatures}
目标市场：${input.targetMarket}
语气：${input.tone || "专业简洁"}`;

  try {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
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
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim()) as {
      copy?: string;
      script?: string;
    };

    return {
      copy: parsed.copy || mockPack(input).copy,
      script: parsed.script || mockPack(input).script,
      imagePlaceholder: "/placeholders/product.svg",
      disclaimer: DISCLAIMER_ZH,
      generatedAt: new Date().toISOString(),
      mode: "live",
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
