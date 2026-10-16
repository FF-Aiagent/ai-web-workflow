"use client";

import type { QuotaState } from "@/lib/types";

export function QuotaBadge({
  quota,
  onClaimLocal,
}: {
  quota: QuotaState | null;
  onClaimLocal?: () => void;
}) {
  if (!quota) return null;
  return (
    <div className="quota-badge">
      <span>
        免费额度：{quota.remaining}/{quota.max}
        {quota.hasLocalId ? "（本机）" : "（匿名）"}
      </span>
      {!quota.hasLocalId && onClaimLocal && (
        <button type="button" className="linkish" onClick={onClaimLocal}>
          启用本机额度（共 3 次）
        </button>
      )}
    </div>
  );
}
