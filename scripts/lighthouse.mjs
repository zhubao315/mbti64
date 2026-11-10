#!/usr/bin/env node
/**
 * 一键跑 Lighthouse CI：
 *   1. 起本地静态服务器（挂载 /mbti64 子路径，结果页注入 localStorage 预置数据）
 *   2. lhci collect → lhci assert → lhci upload
 *   3. 关服务器
 *
 * 用法：npm run lighthouse
 *
 * @lhci/cli 不写进 package.json：它会拖进 puppeteer-core 的依赖树，
 * 其中的 proxy-agent 在 npm 10（CI 的 Node 20）与 npm 11 解析结果不同，
 * 会让 package-lock.json 在 CI 上 `npm ci` 失败。这里统一用 npx 按需拉取。
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const ROOT = process.cwd();
const PORT = Number(process.env.E2E_PORT || 4322);
const OUT_DIR = process.env.E2E_OUT_DIR || "out-pages";
const CONFIG = process.env.LHCI_CONFIG || "lighthouserc.cjs";

if (!fs.existsSync(path.join(ROOT, OUT_DIR))) {
  console.error(`ERROR: ${OUT_DIR}/ 不存在，请先运行 npm run build:pages`);
  process.exit(1);
}

const server = spawn(
  process.execPath,
  [path.join(ROOT, "scripts", "serve-lhci.mjs"), OUT_DIR, String(PORT)],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
);
server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/mbti64/index.html`);
      if (res.ok) return true;
    } catch {
      /* 还没起来 */
    }
    await sleep(300);
  }
  return false;
}

let exitCode = 0;
try {
  if (!(await waitForServer())) {
    console.error("ERROR: 本地静态服务器启动超时");
    exitCode = 1;
  } else {
    const lhci = spawnSync(
      "npx",
      ["@lhci/cli", "autorun", `--config=${CONFIG}`],
      { cwd: ROOT, stdio: "inherit", env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH } },
    );
    exitCode = lhci.status ?? 1;
  }
} finally {
  server.kill();
}

process.exit(exitCode);
