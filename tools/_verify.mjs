import { chromium } from "playwright-core";

const BASE = process.env.VERIFY_BASE || "http://127.0.0.1:4180";
const paths = ["/", "/rank", "/type/INTJ-A-O", "/test", "/result"];
const browser = await chromium.launch({ channel: "chrome", headless: true });

const results = [];
for (const [name, width, height] of [["mobile", 375, 812], ["desktop", 1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => ({
      sw: document.scrollingElement.scrollWidth,
      iw: window.innerWidth,
      h: document.scrollingElement.scrollHeight,
    }));
    results.push({ name, path: p, ...m, overflow: m.sw > m.iw + 1 });
    if (name === "mobile" && p !== "/result") {
      await page.screenshot({ path: `.screenshots/verify${p.replace(/\//g, "_") || "_home"}-375.png`, fullPage: true });
    }
    if (name === "desktop" && p === "/") {
      await page.screenshot({ path: ".screenshots/verify-home-1440.png", fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
