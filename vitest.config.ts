import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
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
