import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // 演示时不要有开发角标压在输入框上
  devIndicators: false,
};

export default nextConfig;
