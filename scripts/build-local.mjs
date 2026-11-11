/**
 * 根路径构建（本地检查用）。
 *
 * 产物目录：out-local/（与 Pages 部署用的 out-pages/ 物理隔离），
 * 根路径产物不可能被误当成 Pages 产物部署。
 *
 * 注意：本脚本不注入 basePath，产物里的资源是 /_next/... 与 /assets/...，
 * 仅用于本地「静态导出能否跑通」的检查，不可部署。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = "out-local";

const env = {
  ...process.env,
  NEXT_PUBLIC_BASE_PATH: "",
  NEXT_EXPORT_DIR: OUT_DIR,
};
delete env.NEXT_PUBLIC_SITE_URL;

const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: "inherit" });

// 只读守卫：确认 public/ 里没有高保真原图（不移动任何文件）
const guard = run([path.join(ROOT, "scripts", "assets-hifi.mjs"), "guard"]);
if (guard.error) throw guard.error;
if (guard.status !== 0) process.exit(guard.status ?? 1);

// 拆分书稿深度数据 → public/data/book/<BASE>.json
// 结果页运行时按基础型取其中一份，这样书稿内容不进首屏包。
const split = run([path.join(ROOT, "scripts", "split-book-data.mjs")]);
if (split.error) throw split.error;
if (split.status !== 0) process.exit(split.status ?? 1);

const build = run([
  path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
  "build",
]);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const indexPath = path.join(ROOT, OUT_DIR, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error(`ERROR: ${OUT_DIR}/index.html 不存在，构建失败。`);
  process.exit(1);
}
console.log(`✓ 根路径构建完成：${OUT_DIR}/（仅供本地检查，不可部署）`);
