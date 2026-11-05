/**
 * 正式运行环境路由验收（阶段五-C）
 *
 * output:"export" 项目没有 `next start`；正式托管形态就是静态文件伺服。
 * 本脚本用 node:http 伺服 out/（与生产静态托管行为一致：正确 MIME + 404 回退），
 * 用 Playwright 无头 Edge（回退 Chrome）验证：
 *   首页/rank 加载、详情页硬刷新、内部跳转、罗盘交互、镜像导师链接、
 *   章节卡渲染、浏览器前进后退、不存在的类型代码 404、375px 视口加载。
 * 记录：HTTP 状态、控制台错误、hydration 报错、RSC 请求数、失败请求（ERR_ABORTED 归因）。
 *
 * 用法：先 npm run build，再 node scripts/check-routes.mjs
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const OUT_DIR = path.join(process.cwd(), "out");
const PORT = 4190;
const BASE = `http://localhost:${PORT}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
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
      if (url === "/favicon.ico") {
        res.writeHead(204).end();
        return;
      }
      const nf = path.join(OUT_DIR, "404.html");
      res.writeHead(404, { "content-type": MIME[".html"] });
      res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "404");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

/** 给页面挂监听：控制台错误、hydration 报错、RSC 请求、失败请求 */
function watch(page, bag) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    if (bag.silence) return; // 故意触发 404 的检查窗口，文档 404 报错属预期
    const t = msg.text();
    const loc = msg.location()?.url ?? "";
    if (/favicon/.test(loc) || /favicon/.test(t)) return; // favicon 404 为静态托管环境噪音
    if (/hydration|did not match|Hydration/.test(t)) bag.hydration.push(t);
    else bag.consoleErrors.push(t);
  });
  page.on("pageerror", (err) => bag.consoleErrors.push(String(err)));
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("_next/data") || u.includes(".rsc")) bag.rsc.push(u);
  });
  page.on("requestfailed", (req) => {
    const u = req.url();
    const err = req.failure()?.errorText ?? "?";
    // 预取被后续导航取消（ERR_ABORTED 的 RSC 载荷 / favicon）属浏览器正常行为，记录但不计失败
    if (err.includes("ERR_ABORTED") && (u.includes("?_rsc=") || u.includes("favicon"))) {
      bag.aborted.push(`${err} ${u}`);
      return;
    }
    bag.failed.push(`${err} ${u}`);
  });
}

const results = [];
function report(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "✅" : "❌"} ${name}${details ? `  —— ${details}` : ""}`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error("❌ 未找到 out/ 目录，请先运行 npm run build");
    process.exit(1);
  }
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const bag = { consoleErrors: [], hydration: [], rsc: [], failed: [], aborted: [] };
  watch(page, bag);

  /* 1. 首页加载 */
  {
    const resp = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    const textLen = await page.evaluate(() => document.body.innerText.trim().length);
    report(
      "首页加载 /",
      resp?.status() === 200 && !!h1 && textLen > 100,
      `HTTP ${resp?.status()}，h1=${(h1 || "").trim().slice(0, 20)}，正文 ${textLen} 字`,
    );
  }

  /* 2. /rank/ 加载 */
  {
    const resp = await page.goto(`${BASE}/rank/`, { waitUntil: "networkidle" });
    const textLen = await page.evaluate(() => document.body.innerText.trim().length);
    report("榜单页加载 /rank/", resp?.status() === 200 && textLen > 100, `HTTP ${resp?.status()}，正文 ${textLen} 字`);
  }

  /* 3. /type/INFJ-A-O/ 硬刷新 */
  {
    const resp = await page.goto(`${BASE}/type/INFJ-A-O/`, { waitUntil: "networkidle" });
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    const hasCode = await page.evaluate(() => document.body.innerText.includes("INFJ-A-O"));
    report(
      "详情页硬刷新 /type/INFJ-A-O/",
      resp?.status() === 200 && !!h1 && hasCode,
      `HTTP ${resp?.status()}，h1=${(h1 || "").trim().slice(0, 20)}，含类型码=${hasCode}`,
    );
  }

  /* 4. 内部跳转：从 /rank/ 点击类型链接进入详情页 */
  {
    await page.goto(`${BASE}/rank/`, { waitUntil: "networkidle" });
    const link = page.locator('a[href*="/type/"]').first();
    const href = await link.getAttribute("href");
    await Promise.all([page.waitForURL(/\/type\//, { timeout: 8000 }), link.click()]);
    await page.waitForLoadState("networkidle");
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    report("内部跳转 /rank/ → 详情页", page.url().includes("/type/") && !!h1, `目标=${href}，h1=${(h1 || "").trim().slice(0, 20)}`);
    // 等待视口内链接的 RSC 预取完成，避免下一步 goto 取消预取产生干扰噪音
    await page.waitForTimeout(1200);
    await page.waitForLoadState("networkidle");
  }

  /* 5. 四季罗盘交互（在 INFJ-A-O 上点击非激活态） */
  {
    await page.goto(`${BASE}/type/INFJ-A-O/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.waitForLoadState("networkidle");
    const compass = page.locator("section", { has: page.locator("button[aria-pressed]") }).first();
    const btns = compass.locator("button[aria-pressed]");
    const before = await compass.innerText();
    let activeIdx = 0;
    for (let i = 0; i < 4; i++) {
      if ((await btns.nth(i).getAttribute("aria-pressed")) === "true") activeIdx = i;
    }
    const target = (activeIdx + 1) % 4;
    await btns.nth(target).click();
    const after = await compass.innerText();
    const pressed = await btns.nth(target).getAttribute("aria-pressed");
    report("四季罗盘交互", after !== before && pressed === "true", `点击第 ${target + 1} 态，aria-pressed=${pressed}，文案变化=${after !== before}`);
  }

  /* 6. 镜像导师链接（INFJ-A-O → ESTP-C-H） */
  {
    const mentor = page.locator("text=查看导师").first();
    await Promise.all([page.waitForURL(/\/type\/ESTP-C-H\//, { timeout: 8000 }), mentor.click()]);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await page.waitForLoadState("networkidle");
    const hasCode = await page.evaluate(() => document.body.innerText.includes("ESTP-C-H"));
    report("镜像导师链接", page.url().includes("/type/ESTP-C-H/") && hasCode, `URL=${new URL(page.url()).pathname}`);
  }

  /* 7. 书稿章节卡渲染（章节号可见） */
  {
    const chapterVisible = await page.evaluate(() => /第\d+章/.test(document.body.innerText));
    report("书稿章节卡渲染", chapterVisible, "章节号可见=" + chapterVisible);
  }

  /* 8. 浏览器前进 / 后退 */
  {
    await page.goBack();
    await page.waitForLoadState("networkidle");
    const backOk = page.url().includes("/type/INFJ-A-O/");
    const backCode = await page.evaluate(() => document.body.innerText.includes("INFJ-A-O"));
    await page.goForward();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await page.waitForLoadState("networkidle");
    const fwdOk = page.url().includes("/type/ESTP-C-H/");
    const fwdCode = await page.evaluate(() => document.body.innerText.includes("ESTP-C-H"));
    report("浏览器前进/后退", backOk && backCode && fwdOk && fwdCode, `后退=${backOk && backCode}，前进=${fwdOk && fwdCode}`);
  }

  /* 9. 不存在的类型代码 → 404 */
  {
    bag.silence = true; // 文档 404 的控制台报错属预期行为
    const resp = await page.goto(`${BASE}/type/ABCD-A-O/`, { waitUntil: "networkidle" });
    bag.silence = false;
    const text = await page.evaluate(() => document.body.innerText);
    report("不存在的类型代码 404", resp?.status() === 404 && /404|找不到|不存在/.test(text), `HTTP ${resp?.status()}`);
  }

  /* 10. 375px 视口加载详情页 */
  {
    const mctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const mpage = await mctx.newPage();
    const mbag = { consoleErrors: [], hydration: [], rsc: [], failed: [], aborted: [] };
    watch(mpage, mbag);
    const resp = await mpage.goto(`${BASE}/type/INFJ-A-O/`, { waitUntil: "networkidle" });
    const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    report(
      "375px 视口加载 /type/INFJ-A-O/",
      resp?.status() === 200 && !overflow && mbag.consoleErrors.length === 0,
      `HTTP ${resp?.status()}，横向溢出=${overflow}，控制台错误=${mbag.consoleErrors.length}`,
    );
    bag.consoleErrors.push(...mbag.consoleErrors);
    bag.hydration.push(...mbag.hydration);
    bag.failed.push(...mbag.failed);
    await mctx.close();
  }

  /* ---------- 汇总记录 ---------- */
  console.log("\n== 记录 ==");
  console.log(`RSC 请求数（_next/data / .rsc）：${bag.rsc.length}${bag.rsc.length === 0 ? "（静态导出无 RSC 请求，符合预期）" : ""}`);
  console.log(`hydration 报错：${bag.hydration.length === 0 ? "无" : bag.hydration.join(" | ")}`);
  console.log(`控制台错误：${bag.consoleErrors.length === 0 ? "无" : bag.consoleErrors.slice(0, 5).join(" | ")}`);
  if (bag.failed.length === 0) {
    console.log("失败请求：无");
  } else {
    console.log(`失败请求 ${bag.failed.length} 条：`);
    for (const f of bag.failed.slice(0, 10)) console.log(`   ${f}`);
  }
  if (bag.aborted?.length) {
    console.log(`良性中止（预取被导航取消，不计失败）${bag.aborted.length} 条：`);
    for (const f of bag.aborted.slice(0, 5)) console.log(`   ${f}`);
  }

  const navFails = bag.failed.filter((f) => /\.html|\/type\/|localhost.*\/$/.test(f));
  const failCount = results.filter((r) => !r.ok).length + bag.hydration.length + bag.consoleErrors.length + navFails.length;
  await browser.close();
  server.close();
  console.log(`\n${failCount === 0 ? "✅" : "❌"} 路由验收：${results.filter((r) => r.ok).length}/${results.length} 项通过`);
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
