// 本地验收用静态服务：模拟 GitHub Pages 的 gzip + 静态资源缓存行为
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve("out");
const PORT = Number(process.env.PORT || 4182);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(ROOT, urlPath);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    const withHtml = path.join(ROOT, urlPath.replace(/\/$/, ""), "index.html");
    if (fs.existsSync(withHtml)) file = withHtml;
    else {
      res.writeHead(404, { "content-type": MIME[".html"] });
      res.end(fs.readFileSync(path.join(ROOT, "404.html")));
      return;
    }
  }

  const ext = path.extname(file).toLowerCase();
  const isText = [".html", ".css", ".js", ".json", ".txt", ".svg", ".xml"].includes(ext);
  const cache = urlPath.startsWith("/_next/static") || urlPath.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=600";
  const headers = { "content-type": MIME[ext] || "application/octet-stream", "cache-control": cache, vary: "Accept-Encoding" };

  const body = fs.readFileSync(file);
  if (isText && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    headers["content-encoding"] = "gzip";
    res.writeHead(200, headers);
    res.end(zlib.gzipSync(body));
  } else {
    headers["content-length"] = body.length;
    res.writeHead(200, headers);
    res.end(body);
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`));
