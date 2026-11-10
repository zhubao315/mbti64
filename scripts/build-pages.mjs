/**
 * GitHub Pages 子路径部署专用构建。
 *
 * 线上地址是 https://zhubao315.github.io/mbti64/，必须注入 basePath=/mbti64。
 * 一旦漏掉，产物里的资源会写成 /_next/... 与 /assets/...，部署后全部 404，
 * 页面只剩 HTML 空壳（2026-11-09 曾因此导致整站不可用）。
 *
 * 用 Node 脚本跨平台注入环境变量，还有两个好处：
 * - 不会像 npm script 那样受 Windows cmd / Git Bash 环境变量语法差异影响；
 * - Git Bash 会把 `/mbti64` 当 POSIX 路径转成 `D:/.../mbti64`，由 Node 传值可避开。
 *
 * 产物目录：out-pages/（与根路径检查用的 out-local/ 物理隔离）。
 * 构建结束会校验 out-pages/index.html 的资源前缀，不合规直接失败，防止坏产物被部署。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = "out-pages";

const env = {
  ...process.env,
  NEXT_PUBLIC_BASE_PATH: "/mbti64",
  NEXT_PUBLIC_SITE_URL: "https://zhubao315.github.io",
  NEXT_EXPORT_DIR: OUT_DIR,
};

const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: "inherit" });

// 只读守卫：确认 public/ 里没有高保真原图（不移动任何文件）
const guard = run([path.join(ROOT, "scripts", "assets-hifi.mjs"), "guard"]);
if (guard.error) throw guard.error;
if (guard.status !== 0) process.exit(guard.status ?? 1);

const build = run([
  path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
  "build",
]);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const indexPath = path.join(ROOT, OUT_DIR, "index.html");
const html = fs.readFileSync(indexPath, "utf8");
if (!html.includes("/mbti64/_next/")) {
  console.error(
    `ERROR: ${OUT_DIR}/index.html 缺少 /mbti64/_next/，basePath 未生效，禁止部署。`,
  );
  process.exit(1);
}
if (/(?:src|href)="\/(?:_next|assets)\//.test(html)) {
  console.error(
    `ERROR: ${OUT_DIR}/index.html 存在根路径资源引用，子路径部署会 404，禁止部署。`,
  );
  process.exit(1);
}
console.log("✓ basePath 校验通过：静态资源均带 /mbti64/ 前缀");
