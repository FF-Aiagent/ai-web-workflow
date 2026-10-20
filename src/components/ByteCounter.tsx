import { BACKEND_TERMS_BYTE_LIMIT, utf8Bytes } from "@/lib/bytes";

export function ByteCounter({ value }: { value: string }) {
  const n = utf8Bytes(value);
  const over = n > BACKEND_TERMS_BYTE_LIMIT;
  return (
    <span
      className="byte-counter"
      style={{ color: over ? "#c0262d" : undefined, fontSize: 13 }}
      role={over ? "alert" : undefined}
    >
      {n} / {BACKEND_TERMS_BYTE_LIMIT} bytes
      {over ? " — over Amazon's limit, trim before saving" : ""}
    </span>
  );
}
