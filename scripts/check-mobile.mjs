/**
 * 移动端详情页验收（阶段五-B）
 * 用 node:http 伺服 out/ 静态导出，Playwright 无头 Edge（回退 Chrome）
 * 在 375 / 390 / 768px 三视口检查四个代表型别详情页。
 *
 * 检查项：横向溢出、触控目标 ≥44px、罗盘四态与 aria-pressed、
 *         标题截断、图片越界、Tab 焦点可见性（375px）、控制台错误。
 *
 * 用法：先 npm run build，再 node scripts/check-mobile.mjs
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const OUT_DIR = path.join(process.cwd(), "out");
const PORT = 4189;
const VIEWPORTS = [375, 390, 768];
const PAGES = ["INFJ-A-O", "ISTJ-C-H", "ESTP-A-O", "INFP-C-O"];

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

async function checkPage(page, code, vw) {
  const failures = [];
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(`http://localhost:${PORT}/type/${code}/`, { waitUntil: "networkidle" });

  /* 1. 横向溢出（含肇事元素定位） */
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    if (doc.scrollWidth <= doc.clientWidth) return null;
    const offenders = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 || r.left < -1) {
        const cls = typeof el.className === "string" ? el.className.trim().slice(0, 60) : "";
        offenders.push(`${el.tagName.toLowerCase()}.${cls}`);
        if (offenders.length >= 5) break;
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
  });
  if (overflow) {
    failures.push(
      `横向溢出 scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}：${overflow.offenders.join(" | ")}`,
    );
  }

  /* 2. 触控目标 ≥44px（跳过 sr-only；行内链接按 WCAG 2.5.8 inline 例外豁免） */
  const shortTargets = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a[href]")) {
      if (el.closest(".sr-only") || el.classList.contains("sr-only")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.display === "inline") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.height < 43.5) {
        const label = (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20);
        out.push(`${el.tagName.toLowerCase()} "${label}" h=${Math.round(r.height)}`);
      }
    }
    return out.slice(0, 12);
  });
  if (shortTargets.length) failures.push(`触控高度不足 44px：${shortTargets.join(" | ")}`);

  /* 3. 罗盘四态：按钮数、aria-pressed 切换、区块文案变化 */
  const compass = page.locator("section", { has: page.locator("button[aria-pressed]") }).first();
  const compassBtns = compass.locator("button[aria-pressed]");
  const compassCount = await compassBtns.count();
  if (compassCount !== 4) {
    failures.push(`罗盘按钮数=${compassCount}，预期 4`);
  } else {
    const before = await compass.innerText();
    await compassBtns.nth(1).click();
    const after = await compass.innerText();
    const pressedNow = [];
    for (let i = 0; i < 4; i++) pressedNow.push(await compassBtns.nth(i).getAttribute("aria-pressed"));
    if (pressedNow[1] !== "true" || pressedNow.filter((v) => v === "true").length !== 1) {
      failures.push(`aria-pressed 未随切换正确更新：${pressedNow.join(",")}`);
    }
    if (after === before) failures.push("罗盘切换后区块文案未变化");
  }

  /* 4. 标题截断 */
  const clipped = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("h1, h2")) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.tagName} "${el.textContent.trim().slice(0, 24)}"`);
    }
    return out;
  });
  if (clipped.length) failures.push(`标题截断：${clipped.join(" | ")}`);

  /* 5. 图片越界 */
  const imgOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const out = [];
    for (const el of document.querySelectorAll("img")) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 || r.left < -1) out.push(el.getAttribute("src") || el.alt);
    }
    return out;
  });
  if (imgOverflow.length) failures.push(`图片越界：${imgOverflow.join(" | ")}`);

  /* 6. Tab 焦点可见性采样（仅 375px，前 12 个停靠点） */
  if (vw === 375) {
    const stops = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const outlineVisible = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
        const shadowVisible = style.boxShadow !== "none";
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24),
          visible: outlineVisible || shadowVisible,
        };
      });
      if (info) stops.push(info);
    }
    const invisible = stops.filter((s) => !s.visible);
    if (invisible.length) {
      failures.push(`焦点不可见：${invisible.map((s) => `${s.tag} "${s.text}"`).join(" | ")}`);
    }
  }

  /* 7. 控制台错误 */
  if (consoleErrors.length) failures.push(`控制台错误：${consoleErrors.slice(0, 3).join(" | ")}`);

  return failures;
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

  let failCount = 0;
  let total = 0;
  for (const vw of VIEWPORTS) {
    for (const code of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: 800 } });
      const page = await ctx.newPage();
      const failures = await checkPage(page, code, vw);
      total++;
      if (failures.length) {
        failCount++;
        console.log(`\n❌ ${vw}px  /type/${code}/`);
        for (const f of failures) console.log(`   - ${f}`);
      } else {
        console.log(`✅ ${vw}px  /type/${code}/`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  console.log(`\n${failCount === 0 ? "✅" : "❌"} 移动端验收：${total - failCount}/${total} 通过`);
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
