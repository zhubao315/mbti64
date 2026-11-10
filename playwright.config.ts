import { defineConfig, devices } from "@playwright/test";

/**
 * CI smoke E2E：只跑一条高价值路径
 *   首页 → 点「精简版」→ 连续选第一项直到完成 → 结果页出现六维雷达与型别编码
 *   → 点一个「相似型别」链接 → 型别页标题与 OG meta 存在
 *
 * webServer 直接在 out-pages/（或 out-local/）上起静态服务，不依赖真实浏览器网络。
 */
const BASE_PORT = Number(process.env.E2E_PORT || 4321);
const OUT_DIR = process.env.E2E_OUT_DIR || "out-local";
// out-local 是根路径产物（无 /mbti64 前缀），out-pages 才带前缀
const MOUNT = process.env.E2E_BASE_PATH ?? (OUT_DIR === "out-pages" ? "/mbti64" : "");
const MOUNTED = MOUNT ? `${MOUNT}/` : "/";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    // baseURL 带子路径且以 / 结尾：out-pages 产物里的资源都写成 /mbti64/...
    // 末尾斜杠很重要——测试里用相对路径（"index.html"）时才能正确落到子路径下。
    baseURL: `http://127.0.0.1:${BASE_PORT}${MOUNTED}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // 关闭动画：题卡有 260ms 的进出动画，动画会让点击目标不稳定
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node scripts/serve-static.mjs ${OUT_DIR} ${BASE_PORT} ${MOUNT}`,
    url: `http://127.0.0.1:${BASE_PORT}${MOUNTED}index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
