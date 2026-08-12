import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PhoneChrome } from "@/components/ui";

export const metadata: Metadata = {
  title: "小咪 · 会主动找你的 AI 朋友",
  description: "iMessage 式的多 agent 生活伴侣",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FDFCFA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="phone">
          <PhoneChrome />
          {children}
          <div className="hbar chrome" />
        </div>
      </body>
    </html>
  );
}
