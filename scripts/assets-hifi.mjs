/**
 * 高保真原图守卫（build 前只读校验，不再移动文件）。
 *
 * 背景：`public/` 会被 Next 静态导出整目录复制进 `out/`。
 * 站点运行时只引用 webp（人像）与 brand / og 的少量 PNG；
 * 384 张高保真 PNG 原图（约 335 MB）仅供 `tools/gen_derived.py`、
 * `gen_type_og.py` 等离线生成脚本使用，放在 `public/` 里会让部署产物凭空胖 300 MB。
 *
 * 设计（v2，消除 stash/restore 的有状态构建）：
 * - 原图的**唯一存放位置**是项目内 `assets-hifi/`（已 gitignore）；
 *   `public/` 只保留运行时真正需要的 webp / og / brand，天然只读。
 * - build 前只做 **guard**：扫描 public/ 是否混入了大尺寸 PNG 原图，
 *   一旦发现就**直接失败并给出修复指引**，绝不移动文件。
 * - 这样构建中断不会留下「半 stash」状态，`public/` 始终是只读输入。
 *
 * 用法：
 *   node scripts/assets-hifi.mjs guard     构建前守卫（build 流程自动执行，只读）
 *   node scripts/assets-hifi.mjs status    查看 public/ 与归档区数量与体积
 *   node scripts/assets-hifi.mjs restore   仅供离线生成脚本：临时把原图放回 public/
 *   node scripts/assets-hifi.mjs stash     与 restore 对逆，把原图移回归档区
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";
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

/** 单个 PNG 超过该体积即视为高保真原图 */
const PNG_SIZE_LIMIT = 200 * 1024;

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

/** 静态导出不会删除导出目录里的旧文件，需要主动清掉上一轮留下的 PNG 副本 */
function cleanOutCopy(publicRel, outDirs) {
  let cleaned = 0;
  for (const outRoot of outDirs) {
    const outDir = join(ROOT, outRoot, publicRel.replace(/^public\//, ""));
    if (!existsSync(outDir)) continue;
    const olds = pngFiles(outDir);
    for (const f of olds) rmSync(join(outDir, f));
    cleaned += olds.length;
  }
  return cleaned;
}

/** 递归扫描 public/ 下的 PNG（返回相对路径 + 体积） */
function scanPngs(dir, base = dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scanPngs(p, base, acc);
    else if (isPng(e.name)) {
      acc.push({ rel: relative(ROOT, p), size: statSync(p).size });
    }
  }
  return acc;
}

/**
 * 构建前守卫（只读）：public/ 里若混入了高保真原图，直接失败并给出修复指引。
 * 不移动任何文件 —— 保证 public/ 始终是只读输入，构建中断不留半 stash 状态。
 */
function guard() {
  const outDirs = ["out", "out-local", "out-pages"].filter((d) => existsSync(join(ROOT, d)));
  const violations = [];

  // 只检查「高保真原图可能残留」的这几个目录（PAIRS 的 public 侧）
  for (const [fromRel] of PAIRS) {
    for (const png of scanPngs(join(ROOT, fromRel))) {
      if (png.size > PNG_SIZE_LIMIT || png.rel.includes("portraits")) {
        violations.push({ rel: png.rel, size: png.size });
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `ERROR: public/ 中发现 ${violations.length} 个高保真原图（不应进入构建）：\n` +
        violations
          .slice(0, 8)
          .map((v) => `   ${v.rel} (${mb(v.size)})`)
          .join("\n") +
        `\n\n修复：node scripts/assets-hifi.mjs stash（把原图移出 public/）`,
    );
    process.exit(1);
  }

  // 只清理导出目录里的旧 PNG 副本（不动 public/）
  let cleaned = 0;
  for (const [fromRel] of PAIRS) cleaned += cleanOutCopy(fromRel, outDirs);
  if (cleaned > 0) console.log(`  导出目录清除旧 PNG 副本 ${cleaned} 张`);

  console.log("✓ guard 通过：public/ 只含运行时资产，无高保真原图。");
}

function stash() {
  console.log("stash: 移出高保真 PNG 原图");
  let moved = 0;
  let cleaned = 0;
  const outDirs = ["out", "out-local", "out-pages"].filter((d) => existsSync(join(ROOT, d)));
  for (const [fromRel, toRel] of PAIRS) {
    moved += movePngs(fromRel, toRel);
    cleaned += cleanOutCopy(fromRel, outDirs);
  }
  console.log(`完成：移出 ${moved} 张原图，清除导出目录旧副本 ${cleaned} 张。`);
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
  for (const d of ["out", "out-local", "out-pages"]) {
    const outDir = join(ROOT, d);
    if (!existsSync(outDir)) continue;
    console.log(
      `\n${d}/ 中残留 PNG: ${pngFiles(join(outDir, "assets")).length} 张（仅 assets 顶层）`,
    );
  }
}

const command = process.argv[2] || "status";
const commands = { guard, stash, restore, status };
if (!commands[command]) {
  console.error(`未知命令: ${command}\n可用: guard | stash | restore | status`);
  process.exit(1);
}
commands[command]();
