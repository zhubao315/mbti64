#!/usr/bin/env node
/**
 * 极简静态文件服务器（用于 Playwright smoke E2E 与本地预览）
 *
 * 用法：node scripts/serve-static.mjs <dir> [port] [basePath]
 * - 支持 trailingSlash 路由：/test/ → /test/index.html
 * - basePath：子路径部署（如 /mbti64）时挂载到该前缀下；留空则挂在根
 * - 不做缓存，便于每次跑都拿到最新产物
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || "out-local");
const PORT = Number(process.argv[3] || 4321);
const BASE_PATH = (process.argv[4] || "").replace(/\/$/, "");

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
  // 目录 → index.html
  const asDir = path.join(full, "index.html");
  if (fs.existsSync(asDir)) return asDir;
  return null;
}

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
  res.writeHead(200, {
    "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`static server: ${ROOT} → http://127.0.0.1:${PORT}/`);
});
