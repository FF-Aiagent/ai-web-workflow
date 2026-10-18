/** Product input for the cross-border listing pack workflow. */
export type ListingInput = {
  productName: string;
  category: string;
  keyFeatures: string;
  targetMarket: string;
  tone?: string;
};

/** Locked required fields per platform (Feature ②). */
export type AmazonFields = {
  /** Marketplace title; UI warns when length > 75. */
  title: string;
  /** Variant / option names, 2–3 items. */
  variants: [string, string] | [string, string, string];
  /** Exactly five bullet points. */
  bullets: [string, string, string, string, string];
  /** Backend / search terms (not customer-facing). */
  backendSearchTerms: string;
};

export type ShopeeFields = {
  title: string;
  description: string;
  /** Key attributes; category placeholder may be empty. */
  keyAttributes: string;
};

export type DtcFields = {
  title: string;
  shortDescription: string;
  longDescription: string;
  /** One-line call to action. */
  cta: string;
};


/** One short-video hook pack (Feature 备选4). */
export type HookPack = {
  /** One-sentence opening hook. */
  hook: string;
  /** Storyboard steps, 3–5 lines. */
  storyboard: string[];
  /** Voiceover draft. */
  voiceover: string;
  /** Call to action. */
  cta: string;
};

/** One A+ content module (skeleton text only). */
export type APlusModule = {
  title: string;
  /** 2–4 sentences body. */
  body: string;
};

export type PlatformId = "amazon" | "shopee" | "dtc";

export type PlatformBundle = {
  amazon: AmazonFields;
  shopee: ShopeeFields;
  dtc: DtcFields;
};

export type ListingPack = {
  /** Flat “主图文案” mirror of the focused platform (kept for ① edit/export). */
  copy: string;
  script: string;
  imagePlaceholder: string;
  disclaimer: string;
  generatedAt: string;
  mode: "mock" | "live";
  /** All three platform field sets (Feature ②). */
  platforms: PlatformBundle;
  /** Three distinct short-video hook packs (Feature 备选4). */
  hooks: [HookPack, HookPack, HookPack];
  /** A+ module copy skeleton, 3–5 modules (no images). */
  aplus: APlusModule[];
};

/** Quota / balance view for header + generate gate. */
export type QuotaState = {
  /** anon = cookie 1-try; user = Supabase balance ledger. */
  mode: "anon" | "user";
  used: number;
  max: number;
  remaining: number;
  exhausted: boolean;
  /** Always false — claim3 / local-id stub retired. */
  hasLocalId: false;
  authenticated: boolean;
  email: string | null;
  /** False when NEXT_PUBLIC_SUPABASE_* missing. */
  authConfigured: boolean;
};

/** QA field map — shown in UI help. */
export const PLATFORM_FIELD_MAP: Record<
  PlatformId,
  { label: string; required: string[] }
> = {
  amazon: {
    label: "Amazon",
    required: [
      "标题 title（≤75，超限有提示）",
      "变体名 variants（2–3 个）",
      "五点描述 bullets（5 条）",
      "后台搜索词 backend search terms",
    ],
  },
  shopee: {
    label: "Shopee",
    required: [
      "标题 title",
      "描述 description",
      "关键属性 key attributes（类目占位可空）",
    ],
  },
  dtc: {
    label: "DTC / 独立站",
    required: [
      "标题 title",
      "短描述 short description",
      "长描述 long description",
      "一行 CTA",
    ],
  },
};
