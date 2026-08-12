import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Fly.io / Docker 部署用 standalone 输出,产物只带跑起来必需的文件
  output: "standalone",
  // 演示时不要有开发角标压在输入框上
  devIndicators: false,
};

export default nextConfig;
