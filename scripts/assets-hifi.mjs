/**
 * 高保真原图移出 / 还原工具。
 *
 * 背景：`public/` 会被 Next 静态导出整目录复制进 `out/`。
 * 站点只引用 webp（人像）与 brand / og 的少量 PNG，
 * 但 `public/assets/` 下还放着 384 张高保真 PNG 原图（约 335 MB），
 * 它们仅供 `tools/gen_derived.py`、`gen_type_og.py` 等离线生成脚本使用，
 * 却会让部署产物凭胖 300 MB 以上。
 *
 * 用法：
 *   node scripts/assets-hifi.mjs stash    移出原图（build 前自动执行），并清理 out 里的旧副本
 *   node scripts/assets-hifi.mjs restore   放回到 public/，供离线生成脚本使用
 *   node scripts/assets-hifi.mjs status    查看两边数量与体积
 *
 * 原图保存在项目内 `assets-hifi/`，已加入 .gitignore：
 * 文件不丢失、不进仓库、不进部署产物，随时可一键还原。
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** [public 下的源目录, assets-hifi 下的归档目录] */
const PAIRS = [
  ["public/assets/portraits", "assets-hifi/portraits"],
  [
    "public/assets/portraits-light/thumb-512",
    "assets-hifi/portraits-light/thumb-512",
  ],
  [
    "public/assets/portraits-light/hero-1200x1600",
    "assets-hifi/portraits-light/hero-1200x1600",
  ],
  ["public/logo", "assets-hifi/logo"],
];

const isPng = (name) => name.toLowerCase().endsWith(".png");

function pngFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(isPng);
}

function sizeOf(dir) {
  return pngFiles(dir).reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
}

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

function movePngs(fromRel, toRel) {
  const from = join(ROOT, fromRel);
  const files = pngFiles(from);
  if (files.length === 0) return 0;

  const to = join(ROOT, toRel);
  mkdirSync(to, { recursive: true });
  let moved = 0;
  for (const f of files) {
    const src = join(from, f);
    const dst = join(to, f);
    if (existsSync(dst)) {
      console.warn(`  跳过（归档区已有同名文件）: ${toRel}/${f}`);
      continue;
    }
    renameSync(src, dst);
    moved += 1;
  }
  console.log(`  ${fromRel} -> ${toRel}: ${moved} 张`);
  return moved;
}

/** 静态导出不会删除 out/ 里的旧文件，需要主动清掉上一轮留下的 PNG 副本 */
function cleanOutCopy(publicRel) {
  const outDir = join(ROOT, "out", publicRel.replace(/^public\//, ""));
  const olds = pngFiles(outDir);
  for (const f of olds) rmSync(join(outDir, f));
  if (olds.length) {
    console.log(`  out/ 清除旧副本 ${olds.length} 张: ${outDir.replace(ROOT, ".")}`);
  }
  return olds.length;
}

function stash() {
  console.log("stash: 移出高保真 PNG 原图");
  let moved = 0;
  let cleaned = 0;
  for (const [fromRel, toRel] of PAIRS) {
    moved += movePngs(fromRel, toRel);
    cleaned += cleanOutCopy(fromRel);
  }
  console.log(`完成：移出 ${moved} 张原图，清除 out 旧副本 ${cleaned} 张。`);
  if (moved === 0) console.log("（原图已处于移出状态，无需重复执行）");
}

function restore() {
  console.log("restore: 放回高保真 PNG 原图");
  let moved = 0;
  for (const [fromRel, toRel] of PAIRS) {
    moved += movePngs(toRel, fromRel);
  }
  console.log(`完成：放回 ${moved} 张原图，可运行 tools/ 下的离线生成脚本。`);
}

function status() {
  console.log("目录                                              PNG   体积");
  for (const [fromRel, toRel] of PAIRS) {
    for (const [label, rel] of [["public  ", fromRel], ["归档区  ", toRel]]) {
      const dir = join(ROOT, rel);
      console.log(
        `${label} ${rel.padEnd(44)} ${String(pngFiles(dir).length).padStart(3)}   ${mb(sizeOf(dir))}`,
      );
    }
  }
  const outDir = join(ROOT, "out");
  console.log(
    `\nout/ 中残留 PNG: ${existsSync(outDir) ? pngFiles(join(outDir, "assets")).length : 0} 张（仅 assets 顶层）`,
  );
}

const command = process.argv[2] || "status";
const commands = { stash, restore, status };
if (!commands[command]) {
  console.error(`未知命令: ${command}\n可用: stash | restore | status`);
  process.exit(1);
}
commands[command]();
