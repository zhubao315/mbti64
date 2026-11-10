/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * 构建产物物理隔离：
 * - `npm run build`（根路径检查用）  → out-local/
 * - `npm run build:pages`（Pages 部署用）→ out-pages/
 *
 * Next 14 在 `output: "export"` 且 distDir !== ".next" 时，会把 distDir
 * 当作静态导出目录（内部构建缓存目录仍强制为 .next）。
 * 两条链路的产物因此物理隔离，根路径产物不可能被误当成 Pages 产物部署。
 */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // dev 用 .next 作为热更新缓存；生产构建用独立的导出目录实现产物隔离
  distDir: isDev
    ? ".next"
    : process.env.NEXT_DIST_DIR || process.env.NEXT_EXPORT_DIR || "out-local",
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
