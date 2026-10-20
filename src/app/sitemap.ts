import type { MetadataRoute } from "next";

const BASE = "https://ai-web-workflow.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/` },
    { url: `${BASE}/tools/amazon-backend-search-terms-generator` },
  ];
}
