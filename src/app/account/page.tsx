import Link from "next/link";
import { Suspense } from "react";
import { getAuthUser } from "@/lib/balance";
import { createClient } from "@/lib/supabase/server";


type Row = { id: number; delta: number; reason: string; created_at: string };

function typeLabel(reason: string, delta: number): string {
  if (reason === "signup_grant") return "注册赠送";
  if (reason === "generate") return "生成扣减";
  if (delta > 0) return "人工加余额";
  return reason;
}

function withBalanceAfter(rows: Row[], current: number) {
  const out: (Row & { after: number })[] = [];
  let running = current;
  for (const r of rows) {
    out.push({ ...r, after: running });
    running -= r.delta;
  }
  return out;
}

const fmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

async function AccountContent() {
  const user = await getAuthUser();
  if (!user) {
    return (
      <div className="card">
        <h1>我的余额</h1>
        <p className="muted">请先登录后查看余额与明细。</p>
        <Link href="/login" className="primary btn-link">去登录</Link>
      </div>
    );
  }

  // RLS (profiles_select_own / ledger_select_own) limits to own rows.
  const supabase = await createClient();
  const [{ data: profile }, { data: ledger }] = await Promise.all([
    supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle(),
    supabase
      .from("credit_ledger")
      .select("id, delta, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50),
  ]);
  const balance = (profile?.balance as number | undefined) ?? 0;
  const rows = (ledger as Row[] | null) ?? [];
  const withAfter = withBalanceAfter(rows, balance);

  return (
    <div className="card">
      <h1>我的余额</h1>
      <p>
        当前余额：<strong>{balance}</strong>
        {user.email ? <span className="muted"> · {user.email}</span> : null}
      </p>
      <h2>最近明细（最多 50 条）</h2>
      {withAfter.length === 0 ? (
        <p className="muted">暂无记录。</p>
      ) : (
        <table className="ledger-table">
          <thead>
            <tr><th>类型</th><th>变动</th><th>变动后余额</th><th>时间 (PT)</th></tr>
          </thead>
          <tbody>
            {withAfter.map((r) => (
              <tr key={r.id}>
                <td>{typeLabel(r.reason, r.delta)}</td>
                <td>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                <td>{r.after}</td>
                <td>{fmt.format(new Date(r.created_at))} PT</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">仅供查看，不支持充值。</p>
      <Link href="/" className="secondary btn-link">返回首页</Link>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="card">加载中…</div>}>
      <AccountContent />
    </Suspense>
  );
}
