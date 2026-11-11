#!/usr/bin/env node
/**
 * 双人合盘主视觉 · 资产处理
 *
 * 【做什么】
 *   1. 从 Qwen-Image 生成目录取出 PNG 原图
 *   2. 原图归档到 assets-hifi/chem/（已 gitignore，不进仓库、不进部署包）
 *   3. 转成 webp 落到 public/assets/chem/（站点唯一引用的运行时资产）
 *   4. 输出 data/chem-art.json（尺寸清单，供 <img> 写死宽高，避免 CLS）
 *
 * 【为什么只留 webp】
 * public/ 会被静态导出整目录复制进产物，只放运行时真正需要的格式。
 * PNG 原图只保留在 assets-hifi/ 供离线复用。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PLAN } from "./chem-art-plan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOWNLOADS = process.env.QWEN_DOWNLOADS || "/home/hermes/comfyui-qwen-image-2.1/downloads";
const OUT_DIR = path.join(ROOT, "public", "assets", "chem");
const HIFI_DIR = path.join(ROOT, "assets-hifi", "chem");
const MANIFEST = path.join(ROOT, "data", "chem-art.json");

/** 找一个文件名前缀匹配的 PNG */
function findPng(prefix) {
  const dir = DOWNLOADS;
  if (!fs.existsSync(dir)) return null;
  const hits = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.toLowerCase().endsWith(".png"))
    .sort();
  if (hits.length === 0) return null;
  return path.join(dir, hits[hits.length - 1]);
}

/**
 * 用 Pillow 量尺寸 + 裁掉白边 + 转 webp。
 *
 * 【为什么要裁白边】
 * 生成图按 1200×1600 / 1024×1024 出，但主体只占中间一小块，
 * 四边是纯白留白。直接用的话，页面里 140px 的图里角色会小到看不清。
 * 这里按「非白像素包围盒」自动裁紧（留 2% 呼吸位），主体就填满了画框。
 */
function toWebp(src, dest, quality, crop) {
  const py = `
import sys, json
from PIL import Image
src, dest, q = sys.argv[1], sys.argv[2], int(sys.argv[3])
crop = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None

im = Image.open(src).convert("RGB")

# 先按计划裁掉预留的空白区（比例）
if crop:
    w, h = im.size
    top = int(h * crop.get("top", 0))
    bottom = int(h * (1 - crop.get("bottom", 0)))
    im = im.crop((0, top, w, bottom))

# 非白像素掩码：阈值 246，把极淡的投影与网格噪点排除掉
mask = im.convert("L").point(lambda v: 255 if v < 246 else 0)
bbox = mask.getbbox()
if bbox:
    pad = int(max(im.size) * 0.02)
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(im.size[0], bbox[2] + pad)
    bottom = min(im.size[1], bbox[3] + pad)
    im = im.crop((left, top, right, bottom))

im.save(dest, "WEBP", quality=q, method=6)
print(im.size[0], im.size[1])
`;
  const out = execFileSync(
    "python3",
    ["-c", py, src, dest, String(quality), JSON.stringify(crop ?? null)],
    { encoding: "utf8" },
  );
  const [w, h] = out.trim().split(/\s+/).map(Number);
  return { width: w, height: h };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(HIFI_DIR, { recursive: true });

const manifest = {};
let missing = 0;

for (const item of PLAN) {
  const png = findPng(item.file);
  if (!png) {
    console.error(`⚠️  找不到生成结果: ${item.file}_*.png（跳过）`);
    missing += 1;
    continue;
  }
  // 原图归档
  fs.copyFileSync(png, path.join(HIFI_DIR, `${item.file}.png`));
  // 运行时 webp
  const webpPath = path.join(OUT_DIR, `${item.file}.webp`);
  const { width, height } = toWebp(png, webpPath, 82, item.crop);
  const bytes = fs.statSync(webpPath).size;
  manifest[item.key] = {
    file: `/assets/chem/${item.file}.webp`,
    label: item.label,
    width,
    height,
  };
  console.log(
    `✓ ${item.file}.webp  ${width}×${height}  ${(bytes / 1024).toFixed(0)} KB  （${item.label}）`,
  );
}

if (missing > 0) {
  console.error(`ERROR: 有 ${missing} 张图未生成`);
  process.exit(1);
}

fs.writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      model: "qwen-image-2.1",
      style: "日光棱镜 Solar-Poly 64",
      art: manifest,
    },
    null,
    2,
  ),
  "utf8",
);
console.log(`\n✓ 资产清单已写入 data/chem-art.json`);
