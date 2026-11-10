import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  // 与 Next.js 一致使用 automatic JSX runtime（组件级测试必须）
  esbuild: {
    jsx: "automatic",
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    // 组件级测试（.test.tsx）需要 DOM 环境
    environmentMatchGlobs: [["tests/**/*.test.tsx", "jsdom"]],
    setupFiles: ["tests/setup-dom.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/scoring.ts", "lib/rarity.ts", "lib/match.ts", "data/questions*.ts"],
      thresholds: {
        "lib/scoring.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
      },
      reporter: ["text", "text-summary"],
    },
  },
});
