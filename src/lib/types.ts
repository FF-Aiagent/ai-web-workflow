/** Product input for the cross-border listing pack workflow. */
export type ListingInput = {
  productName: string;
  category: string;
  keyFeatures: string;
  targetMarket: string;
  tone?: string;
};

export type ListingPack = {
  copy: string;
  script: string;
  imagePlaceholder: string;
  disclaimer: string;
  generatedAt: string;
  mode: "mock" | "live";
};

export type QuotaState = {
  used: number;
  max: number;
  remaining: number;
  hasLocalId: boolean;
  exhausted: boolean;
};
