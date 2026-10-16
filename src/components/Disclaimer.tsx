import { DISCLAIMER_ZH } from "@/lib/disclaimer";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "disclaimer"} role="note">
      {DISCLAIMER_ZH}
    </p>
  );
}
