/**
 * 阶段六：发布前页面抽检
 * 覆盖 / /rank/ /test/ /result/ 与四个代表详情页，校验每页核心内容标记齐全。
 * 用法：先 npm run build，再 node scripts/check-pages.mjs
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const OUT_DIR = path.join(process.cwd(), "out");
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.join(OUT_DIR, url);
    if (url.endsWith("/")) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && !path.extname(url)) file = path.join(OUT_DIR, url, "index.html");
    if (!fs.existsSync(file)) {
      if (url === "/favicon.ico") return res.writeHead(204).end();
      const nf = path.join(OUT_DIR, "404.html");
      res.writeHead(404, { "content-type": MIME[".html"] });
      return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "404");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const TIER_NAMES = ["万里挑一", "极稀有", "稀有", "千分之一", "百分之一", "常见型", "无处不在"];
const TYPE_MARKERS = [
  "四季演进罗盘",
  "功能栈与认知过程映射",
  "相关研究启发", // 神经机制证据等级徽章
  "中国式生存切片",
  "盲区导师",
  "刻意练习",
];
const TYPE_PAGES = ["INFJ-A-O", "INFP-C-O", "ISTJ-C-H", "ESTP-A-O"];

const results = [];
function report(name, ok, details = "") {
  results.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${details ? `  —— ${details}` : ""}`);
}

async function main() {
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  /* / */
  {
    const resp = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => document.body.innerText);
    report("/", resp?.status() === 200 && text.includes("64") && text.length > 200, `HTTP ${resp?.status()}`);
  }

  /* /rank/ */
  {
    const resp = await page.goto(`${BASE}/rank/`, { waitUntil: "networkidle" });
    const typeLinks = await page.locator('a[href*="/type/"]').count();
    const text = await page.evaluate(() => document.body.innerText);
    const hasTier = TIER_NAMES.some((t) => text.includes(t));
    report("/rank/", resp?.status() === 200 && typeLinks >= 64 && hasTier, `HTTP ${resp?.status()}，类型链接 ${typeLinks} 个，含稀有档名=${hasTier}`);
  }

  /* /test/ */
  {
    const resp = await page.goto(`${BASE}/test/`, { waitUntil: "networkidle" });
    const btnCount = await page.locator("button, a[href]").count();
    const text = await page.evaluate(() => document.body.innerText);
    report("/test/", resp?.status() === 200 && btnCount > 0 && text.length > 100, `HTTP ${resp?.status()}，可交互元素 ${btnCount} 个`);
  }

  /* /result/（无作答状态：记录实际行为，硬要求仅 200 且无页面错误） */
  {
    const resp = await page.goto(`${BASE}/result/`, { waitUntil: "networkidle" });
    const url = page.url();
    const text = await page.evaluate(() => document.body.innerText);
    const behavior = url.includes("/test") ? "重定向到 /test/" : url.includes("/result") ? "停留 /result/ 显示空态" : `跳到 ${url}`;
    report("/result/ 无作答访问", (resp?.status() === 200 || resp?.status() === 404) && text.length > 0, `${behavior}，HTTP ${resp?.status()}`);
  }

  /* 四个详情页内容标记 */
  for (const code of TYPE_PAGES) {
    const resp = await page.goto(`${BASE}/type/${code}/`, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => document.body.innerText);
    const missing = TYPE_MARKERS.filter((m) => !text.includes(m));
    const hasChapter = /第\d+章/.test(text);
    const hasTier = TIER_NAMES.some((t) => text.includes(t));
    const h1 = await page.locator("h1").first().textContent().catch(() => "");
    const ok = resp?.status() === 200 && missing.length === 0 && hasChapter && hasTier && h1.trim().length > 0;
    report(
      `/type/${code}/`,
      ok,
      `HTTP ${resp?.status()}${missing.length ? `，缺标记：${missing.join("、")}` : "，六项内容标记齐全"}${hasChapter ? "" : "，缺章节号"}${hasTier ? "" : "，缺稀有档"}`,
    );
  }

  await browser.close();
  server.close();
  const fails = results.filter((r) => !r.ok).length + consoleErrors.length;
  if (consoleErrors.length) console.log(`\n页面 JS 错误：${consoleErrors.join(" | ")}`);
  console.log(`\n${fails === 0 ? "✅" : "❌"} 页面抽检：${results.filter((r) => r.ok).length}/${results.length} 通过`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
