# 跨境交付包 · AI Web 工作流 MVP

方向 **A**：跨境电商垂直模板工作流。

填商品信息 → 生成 **Amazon / Shopee / DTC 三平台字段** + **约 15 秒短视频脚本** + **主图占位** → 可编辑后一键复制 / 导出 Markdown · JSON · TXT。

## 快速开始

```bash
cd /workspace/Projects/ai-web-workflow
npm install
npm run dev
```

打开 http://localhost:3000 。

生产构建：

```bash
npm run build
npm start
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 否 | 有则走 OpenAI Chat Completions；无则 **Mock** 确定性文案，UI 可完整演示 |
| `OPENAI_MODEL` | 否 | 默认 `gpt-4o-mini` |
| `NEXT_PUBLIC_SUPABASE_URL` | 登录/余额 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 登录/余额 | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 扣费 | 服务端扣减余额（勿暴露到浏览器） |

## Mock vs Live

| 模式 | 条件 | 行为 |
|------|------|------|
| **Mock** | 未设置 `OPENAI_API_KEY`，或 Live 调用失败 | `generateListingPack` 返回本地拼装的文案/脚本；结果页显示「Mock 演示」 |
| **Live** | 设置了有效 `OPENAI_API_KEY` | 调用 OpenAI；失败自动回退 Mock |

图：始终为静态占位 `/placeholders/product.svg`（真图生成不在本轮范围）。

## 用户 + 余额（Supabase）

- **匿名**：cookie `aww_quota_used`，最多 **1** 次试用。本机 claim3 stub **已退役**。
- **登录**（邮箱 Magic Link）：注册送 **10** 次；每次 `/api/generate` 成功前原子扣 **1**（`deduct_credit`）。
- 页头显示余额 / 试用剩余；额度用尽 → `/paywall`（引导登录或人工加余额，**无支付 UI**）。
- Schema：`supabase/schema.sql`（profiles + credit_ledger + trigger + RPC）。
- **人工加余额**（工程 SQL，无充值页）：

```sql
update public.profiles
set balance = balance + 10, updated_at = now()
where email = 'user@example.com';

insert into public.credit_ledger (user_id, delta, reason)
select id, 10, 'manual_topup'
from public.profiles where email = 'user@example.com';
```

## 页面

- `/` — 表单 + 链接/粘贴抽取预填
- `/result` — 多平台字段（Amazon / Shopee / DTC 可切换编辑）+ 脚本可编辑 + 图位；复制与导出按平台分栏，均读编辑后内容 + 免责声明
- `/login` — 邮箱 Magic Link
- `/paywall` — 额度用尽（无支付）

## 技术栈

Next.js (App Router) · TypeScript · Supabase Auth/Postgres · Route Handlers（`/api/generate`、`/api/quota`、`/api/auth/*`）

LLM 抽象：`src/lib/generate.ts` → `generateListingPack(input)`。


## 多平台字段（Feature ②）

| 平台 | 必填字段 |
|------|----------|
| Amazon | 标题（≤75，超限提示）· 变体名 2–3 · 五点 · 后台搜索词 |
| Shopee | 标题 · 描述 · 关键属性（类目占位可空） |
| DTC / 独立站 | 标题 · 短描述 · 长描述 · 一行 CTA |

一次生成三版；不做实时词库、自动上架、SP-API。


## 链接 / 粘贴抽取（Feature ③）

首页可粘贴 **商品 URL** 或 **详情文本** → 预填表单（可再改）→ 再生成。

| 失败场景 | 行为 |
|----------|------|
| 空内容 | FAIL 提示，表单仍可手填 |
| 粘贴过长（>20 000 字符）或页面 >100KB | FAIL 提示，可手填 |
| 坏链 / 无法访问 / 非 http(s) | FAIL 提示，可手填 |

不做 PDF OCR。抽取失败不挡手动填表与生成。

## 不做（本轮）

大全导航、多模型超市、BYOK、飞书/微信、真实支付 / IAP / Stripe / 运营后台。

## 假设

- 首发中文 UI；目标市场字段可填任意站点名。
- 未配置 Supabase 时仅匿名 1 次可用；登录需 FF 在 1:1 粘贴密钥。
- 导出为客户端下载 `.md` / `.json` / `.txt`（文案+脚本+免责）；结果页文案/脚本可改，复制与导出均用改后内容。
