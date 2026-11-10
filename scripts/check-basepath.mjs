// 构建产物 basePath 硬断言
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");

if (!fs.existsSync(OUT)) {
  console.error("ERROR: out/ 不存在");
  process.exit(1);
}

const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) {
      const rel = path.relative(OUT, p);
      if (rel === "404.html" || rel === "404" + path.sep + "index.html") continue;
      files.push(p);
    }
  }
}
walk(OUT);

const patterns = [
  /<script[^>]*\bsrc=["']([^"']+)["']/gi,
  /<link[^>]*rel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/gi,
  /<link[^>]*rel=["']preload["'][^>]*\bhref=["']([^"']+)["']/gi,
  /<meta[^>]*property=["']og:image["'][^>]*\bcontent=["']([^"']+)["']/gi,
];

const bad = [];
for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      if (url.startsWith("http://") || url.startsWith("data:") || url.startsWith("#")) continue;
      const ok =
        url.startsWith("/mbti64/") ||
        url.startsWith("https://zhubao315.github.io/mbti64/");
      if (!ok) bad.push({ file: path.relative(OUT, f), url });
    }
  }
}

if (bad.length > 0) {
  console.error("ERROR: 发现 " + bad.length + " 条不合规的资源地址：");
  for (const b of bad.slice(0, 20)) console.error("  " + b.file + ": " + b.url);
  process.exit(1);
}
console.log("basePath 校验通过：扫描 " + files.length + " 个 HTML，所有资源地址合规");