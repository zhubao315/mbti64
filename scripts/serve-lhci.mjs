#!/usr/bin/env node
/**
 * Lighthouse CI 用的静态服务器
 *
 * 在 scripts/serve-static.mjs 的基础上多一件事：
 * 对 /result/index.html 注入一段「预置结果」的脚本，
 * 让 Lighthouse 能测到真实的结果页（而不是「还没有完整的结果」空态）。
 *
 * 预置数据写在 p64:result:v1（结果快照键），与线上结果页的读取路径一致。
 * 注入只发生在本地测量服务器上，不影响部署产物。
 */
import http from "node:http";
import fs, { statSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(process.argv[2] || "out-pages");
const PORT = Number(process.argv[3] || 4322);
/**
 * 子路径挂载点：out-pages 的产物里资源都写成 /mbti64/...，
 * 直接挂在根路径会导致资源 404（Lighthouse 的 errors-in-console 会报）。
 * 因此这里按 /mbti64 前缀挂载，与线上一致。
 */
const BASE_PATH = (process.argv[4] || "/mbti64").replace(/\/$/, "");

/**
 * gzip 结果缓存：key = path + mtime + size。
 * 只按 path 缓存会在重新构建后返回旧内容（文件名 hash 变了但路径没变），
 * 导致 Lighthouse 拿到过期 HTML、资源 404。
 */
const gzipCache = new Map();

function gzipOf(file, buf) {
  const st = statSync(file);
  const key = `${file}:${st.mtimeMs}:${st.size}`;
  let hit = gzipCache.get(key);
  if (!hit) {
    hit = zlib.gzipSync(buf);
    // 保留最近 64 份，避免无限增长
    if (gzipCache.size > 64) gzipCache.clear();
    gzipCache.set(key, hit);
  }
  return hit;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  // 剥掉子路径前缀
  if (BASE_PATH && p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length) || "/";
  if (p.endsWith("/")) p += "index.html";
  const full = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
  if (!full.startsWith(ROOT)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  const asDir = path.join(full, "index.html");
  if (fs.existsSync(asDir)) return asDir;
  return null;
}

/** 结果页注入脚本：写好结果快照后再让应用启动 */
const SEED_SCRIPT = `
<script>
(function () {
  try {
    var SNAP = {
      base: "INFJ",
      code: "INFJ-A-O",
      displayCode: "INFJ-A-O",
      group: "diplomat",
      dims: {
        EI: { key: "EI", poleA: "E", poleB: "I", percentA: 62, percentB: 38, pole: "I", preferred: 62, strength: "moderate", answered: 20, total: 20, swing: false },
        SN: { key: "SN", poleA: "S", poleB: "N", percentA: 35, percentB: 65, pole: "N", preferred: 65, strength: "moderate", answered: 20, total: 20, swing: false },
        TF: { key: "TF", poleA: "T", poleB: "F", percentA: 55, percentB: 45, pole: "T", preferred: 55, strength: "moderate", answered: 20, total: 20, swing: false },
        JP: { key: "JP", poleA: "J", poleB: "P", percentA: 58, percentB: 42, pole: "J", preferred: 58, strength: "moderate", answered: 20, total: 20, swing: false },
        AC: { key: "AC", poleA: "A", poleB: "C", percentA: 60, percentB: 40, pole: "A", preferred: 60, strength: "moderate", answered: 20, total: 20, swing: false, binary: { a: 4, b: 1, total: 5, need: 4 } },
        OH: { key: "OH", poleA: "O", poleB: "H", percentA: 55, percentB: 45, pole: "O", preferred: 55, strength: "moderate", answered: 20, total: 20, swing: false, binary: { a: 3, b: 2, total: 5, need: 4 } }
      },
      swing: { AC: false, OH: false },
      mode: "full",
      answeredCount: 120,
      totalCount: 120,
      complete: true,
      scoredAt: Date.now()
    };
    localStorage.setItem("p64:result:v1", JSON.stringify(SNAP));
  } catch (e) {}
})();
</script>
`;

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url || "/");
  if (!file) {
    const notFound = path.join(ROOT, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "content-type": MIME[".html"] });
      fs.createReadStream(notFound).pipe(res);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404");
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const wantsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "");

  const send = (buf) => {
    const headers = {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-store",
    };
    if (wantsGzip && buf.length > 1024) {
      // gzip 结果按文件缓存：Lighthouse 会并发拉几十个 chunk，
      // 每次同步 gzip 会把 Node 事件循环堵住，拖慢所有并行请求，
      // 反而让「模拟节流」下的 LCP 估算被放大。
      const gz = gzipOf(file, buf);
      headers["content-encoding"] = "gzip";
      headers["content-length"] = String(gz.length);
      res.writeHead(200, headers);
      res.end(gz);
      return;
    }
    headers["content-length"] = String(buf.length);
    res.writeHead(200, headers);
    res.end(buf);
  };

  if (ext === ".html" && file.replace(/\\/g, "/").endsWith("result/index.html")) {
    // 结果页注入预置快照（模拟完成答题后的状态）
    const html = fs.readFileSync(file, "utf8");
    const injected = html.replace(/<head>/i, `<head>${SEED_SCRIPT}`);
    send(Buffer.from(injected, "utf8"));
    return;
  }

  send(fs.readFileSync(file));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`lhci static server: ${ROOT} → http://127.0.0.1:${PORT}/`);
});
