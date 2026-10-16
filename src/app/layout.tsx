import type { Metadata } from "next";
import "./globals.css";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "跨境交付包 · AI 工作流",
  description:
    "填商品信息 → 主图文案 + 约15秒短视频脚本 + 主图占位 → 一键导出",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="site-header">
            <h1>跨境交付包</h1>
            <p className="tagline">
              垂直工作流 MVP：输入 → 文案 + 15s 脚本 + 图位 → 导出
            </p>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <Disclaimer />
          </footer>
        </div>
      </body>
    </html>
  );
}
