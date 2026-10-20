export const BACKEND_TERMS_BYTE_LIMIT = 249;

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Dedupe words and keep whole words within the byte limit. */
export function fitBackendTerms(
  raw: string,
  limit = BACKEND_TERMS_BYTE_LIMIT,
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  let bytes = 0;
  for (const w of raw.split(/[\s,;]+/).filter(Boolean)) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    const add = utf8Bytes(w) + (out.length ? 1 : 0);
    if (bytes + add > limit) continue;
    seen.add(k);
    out.push(w);
    bytes += add;
  }
  return out.join(" ");
}
