#!/usr/bin/env node
/**
 * 参考底图 QC 拼版
 *
 * 把 assets-hifi/book-refs-minimax/ 下所有新图拼成一张联系表，
 * 方便一次看完 26 张 —— 主要看三件事：
 *   1. 有没有伪文字（模型不支持负面提示词，文字必须逐张盯）
 *   2. 有没有相框 / 实物感（第一轮出过灰相框）
 *   3. 主体有没有贴边、安全区是否还在
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "assets-hifi", "book-refs-minimax");
const OUT = path.join(ROOT, "assets-hifi", "book-refs-minimax", "_contact-sheet.jpg");

if (!fs.existsSync(SRC)) {
  console.error("ERROR: 没有新图目录");
  process.exit(1);
}

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.toLowerCase().endsWith(".png"))
  .sort();
if (files.length === 0) {
  console.error("ERROR: 目录里没有 PNG");
  process.exit(1);
}

const py = `
import sys, os, glob
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, "*.png")))
COLS, CELL, PAD, LABEL = 6, 300, 10, 26
rows = (len(files) + COLS - 1) // COLS
W = COLS * (CELL + PAD) + PAD
H = rows * (CELL + PAD + LABEL) + PAD
sheet = Image.new("RGB", (W, H), "#F2F2F2")
d = ImageDraw.Draw(sheet)

for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    im.thumbnail((CELL, CELL))
    c, r = i % COLS, i // COLS
    x = PAD + c * (CELL + PAD) + (CELL - im.width) // 2
    y = PAD + r * (CELL + PAD + LABEL) + (CELL - im.height) // 2
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + im.width, y + im.height], outline="#BBBBBB")
    name = os.path.basename(f)
    label = name[:-4] if len(name) > 30 else name
    d.text((PAD + c * (CELL + PAD), y + CELL + 4), label, fill="#222222")

sheet.save(out, "JPEG", quality=88)
print(out, sheet.size)
`;

console.log(
  execFileSync("python3", ["-c", py, SRC, OUT], { encoding: "utf8" }).trim(),
);
