#!/usr/bin/env node
/**
 * 把新生成的参考底图提升为正式资产，并重排版全书插图与装帧
 *
 * 【为什么要分两步】
 * 生图（scripts/gen-book-refs.mjs）只产出「无文字底图」；
 * 书名、图题、图注、数据文字一律由 scripts/gen-book-art.mjs 在排版层叠加 ——
 * 这是视觉圣经的铁律「文字不入图」，AI 生成的图里不该有字。
 *
 * 【安全网】
 * 提升前先备份原图到 assets-hifi/book-refs-orig/，
 * 出问题可以一键回滚（node scripts/promote-book-refs.mjs --rollback）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFS = path.join(ROOT, "docs", "book-visual", "refs");
const NEW = path.join(ROOT, "assets-hifi", "book-refs-minimax");
const BACKUP = path.join(ROOT, "assets-hifi", "book-refs-orig");

const args = process.argv.slice(2);
const rollback = args.includes("--rollback");

function listPng(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
}

if (rollback) {
  if (!fs.existsSync(BACKUP)) {
    console.error(`ERROR: 没有备份目录 ${path.relative(ROOT, BACKUP)}`);
    process.exit(1);
  }
  let n = 0;
  for (const f of listPng(BACKUP)) {
    fs.copyFileSync(path.join(BACKUP, f), path.join(REFS, f));
    n += 1;
  }
  console.log(`✓ 已回滚 ${n} 张参考图到 docs/book-visual/refs/`);
  process.exit(0);
}

const newFiles = listPng(NEW);
if (newFiles.length === 0) {
  console.error(`ERROR: ${path.relative(ROOT, NEW)} 里没有新图，先跑 node scripts/gen-book-refs.mjs`);
  process.exit(1);
}

/**
 * 裁掉「实物相框」。
 *
 * minimax-h3-image 有时会把「书籍封面」理解成实物照片：
 * 最外一圈白边 + 一圈灰相框 + 纸面 + 投影。留着这层框，排版成品上会多一圈灰。
 *
 * 判据（三步，避免误伤主体贴边的正常图）：
 *   1. 四条边的外侧 10% 带状区里，灰色像素占比都超过 60% → 判定有相框；
 *      主体贴边的图（例如一把伸出画面的卡尺）只有细窄一条，占比不够，不会误判。
 *   2. 从边缘往里走，先越过灰框，再找第一段连续的近白像素 → 那是纸面起点。
 *   3. 四条边都算，裁出纸面区域。
 */
function cropMockup(file) {
  const py = `
import sys
from PIL import Image

path = sys.argv[1]
im = Image.open(path).convert("RGB")
W, H = im.size
g = im.convert("L")
px = g.load()
GREY_LO, GREY_HI, PAPER, RUN = 150, 244, 246, 20
BAND = max(8, int(min(W, H) * 0.10))

def is_grey(x, y):
    v = px[x, y]
    return GREY_LO <= v <= GREY_HI

def side_band_ratio(horizontal):
    """某一边外侧带状区里，最长连续灰线的占比（相框是一条贯通的灰带）"""
    n = W if horizontal else H
    best = 0.0
    for off in range(0, BAND):
        run = 0
        longest = 0
        for i in range(n):
            v = px[i, off] if horizontal else px[off, i]
            if GREY_LO <= v <= GREY_HI:
                run += 1
                if run > longest:
                    longest = run
            else:
                run = 0
        if longest / n > best:
            best = longest / n
    return best

def has_frame():
    # 四条边都要有贯通的灰带才算相框：主体贴边（伸出的卡尺等）只有细窄一条
    return (
        side_band_ratio(True) > 0.5     # 上下边
        and side_band_ratio(False) > 0.5  # 左右边
    )

def paper_run(horizontal, from_left):
    """从边缘往里：先越过灰框，再找第一段连续近白 → 纸面起点"""
    n = W if horizontal else H
    started = False
    run = 0
    for i in range(n):
        idx = i if from_left else n - 1 - i
        if not started:
            if is_grey(idx, H // 2) if horizontal else is_grey(W // 2, idx):
                started = True
            continue
        v = px[idx, H // 2] if horizontal else px[W // 2, idx]
        if v >= PAPER:
            run += 1
            if run >= RUN:
                return idx - run + 1
        else:
            run = 0
    return 0 if from_left else n - 1

if has_frame():
    l = paper_run(True, True)
    r = paper_run(True, False)
    t = paper_run(False, True)
    b = paper_run(False, False)
    if l > 2 or t > 2 or r < W - 3 or b < H - 3:
        im.crop((l, t, r + 1, b + 1)).save(path)
        print(f"    cropped frame {W}x{H} -> {r + 1 - l}x{b + 1 - t}")
    else:
        print(f"    frame but nothing to crop (kept {W}x{H})")
else:
    print(f"    no frame (kept {W}x{H})")
`;
  try {
    const out = execFileSync("python3", ["-c", py, file], { encoding: "utf8" });
    return out.trim();
  } catch {
    return "crop skipped";
  }
}

fs.mkdirSync(BACKUP, { recursive: true });
let promoted = 0;
let cropped = 0;
for (const f of newFiles) {
  const dst = path.join(REFS, f);
  if (fs.existsSync(dst)) {
    const bak = path.join(BACKUP, f);
    if (!fs.existsSync(bak)) fs.copyFileSync(dst, bak);
  }
  fs.copyFileSync(path.join(NEW, f), dst);
  const note = cropMockup(dst);
  if (note.startsWith("cropped")) cropped += 1;
  console.log(`  · ${f} ${note}`);
  promoted += 1;
}

console.log(`✓ 已提升 ${promoted} 张参考图到 docs/book-visual/refs/（其中 ${cropped} 张裁掉了实物相框）`);
console.log(`  原图备份在 ${path.relative(ROOT, BACKUP)}/`);
console.log(`\n下一步：node scripts/gen-book-art.mjs`);
