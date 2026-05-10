import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AI 六级作文老师",
  description: "按 CET-6 写作逻辑生成结构化批改报告的作文提分工具。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
