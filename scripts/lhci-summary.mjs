#!/usr/bin/env node
/**
 * Lighthouse 结果汇总 → Markdown
 *
 * 读 .lighthouseci/lhr-*.json，输出：
 *   - 每个 URL 的 Performance / LCP / CLS / TBT
 *   - 与上一次（.lighthouseci-baseline/ 或 git 上一次 main 的结果）对比的得分变化
 *
 * 输出 lighthouse-summary.md，供 CI artifact 与 PR 评论使用。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LHR_DIR = path.join(ROOT, ".lighthouseci");
const OUT = path.join(ROOT, "lighthouse-summary.md");

function readLhrs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f.startsWith("lhr-"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor((s.length - 1) / 2);
  return s.length % 2 ? s[mid] : (s[mid] + s[mid + 1]) / 2;
}

function summarize(lhrs) {
  const byUrl = new Map();
  for (const lhr of lhrs) {
    const url = lhr.finalUrl || lhr.requestedUrl || "?";
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(lhr);
  }
  const out = [];
  for (const [url, runs] of byUrl) {
    const pick = (fn) => median(runs.map(fn));
    out.push({
      url,
      path: url.replace(/^https?:\/\/[^/]+/, ""),
      perf: Math.round(pick((l) => (l.categories?.performance?.score ?? 0) * 100)),
      lcp: Math.round(pick((l) => l.audits?.["largest-contentful-paint"]?.numericValue ?? 0)),
      cls: Number(pick((l) => l.audits?.["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
      tbt: Math.round(pick((l) => l.audits?.["total-blocking-time"]?.numericValue ?? 0)),
      fcp: Math.round(pick((l) => l.audits?.["first-contentful-paint"]?.numericValue ?? 0)),
    });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const current = summarize(readLhrs(LHR_DIR));
const baseline = summarize(readLhrs(path.join(ROOT, ".lighthouseci-baseline")));

const baseMap = new Map(baseline.map((b) => [b.path, b]));

const lines = [];
lines.push("## Lighthouse 移动端得分");
lines.push("");
lines.push("| 页面 | Performance | LCP | CLS | TBT | 变化 |");
lines.push("|---|---:|---:|---:|---:|---:|");
for (const c of current) {
  const b = baseMap.get(c.path);
  const delta = b ? `${c.perf - b.perf >= 0 ? "+" : ""}${c.perf - b.perf}` : "—";
  lines.push(
    `| \`${c.path}\` | ${c.perf} | ${c.lcp} ms | ${c.cls} | ${c.tbt} ms | ${delta} |`,
  );
}
lines.push("");
lines.push(
  "> 门禁：静态页 Performance ≥ 90 / LCP ≤ 2500ms / CLS ≤ 0.1 / TBT ≤ 300ms；" +
    "客户端渲染页（答题页、结果页）LCP ≤ 3500ms（内容需等 React 水合）。",
);
lines.push("");

const md = lines.join("\n");
fs.writeFileSync(OUT, md, "utf8");
console.log(md);
