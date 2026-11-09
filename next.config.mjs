/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 允许 CI / 并行构建指定独立缓存目录，默认仍为 .next。
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // 静态导出：GitHub Pages 只能托管纯静态资源，因此不使用 API Route / ISR。
  // 统计接口的设计保留在 README，迁到 Node 托管时再启用 app/api/*。
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;
