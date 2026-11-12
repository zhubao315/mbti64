#!/usr/bin/env node
/**
 * 《千分之一的你》3D 立体效果图 · 底图生成（moss-image）
 *
 * 【分工】
 * moss-image 只支持文生图，不支持图片编辑 —— 它没法直接拿真封面做「立体化」。
 * 所以这里的活是：**让 AI 画一本封面是纯色的书**。透视、材质、光影、纸页厚度、
 * 投影全部由 AI 给（这正是 AI 比脚本强的地方），真封面由
 * scripts/apply_cover.py 检测到封面四边形后透视贴回去，文字因此逐像素准确。
 *
 * 【moss-image 的脾气（实测）】
 * - 端点 http://219.142.87.233:18200/v1，无鉴权，模型名 moss-image
 * - 底层是 Flux2 架构：moss_image_sft_bf16 的 UNET + Qwen3.5-9B 的文本编码器
 *   + flux2-vae_small；固定 30 步、cfg 3.0、euler/sgm_uniform
 * - 支持 negative_prompt（KSampler 有负向分支，这条能用）
 * - 提示词会被自动加上 `moss_xvstyle,` 前缀（所以它天生爱往书上放英文标题，
 *   空白封面必须用负面提示词压住）
 * - 请求 2048x1536 回来的是 1632x1216（服务端自己降的档）
 * - 单张 50~200 秒
 *
 * 【封面色】
 * 统一用饱和青绿（H≈120）。它跟背景（灰）、纸页（米白）、桌面（浅灰）都拉得开，
 * 按色相就能把封面挑出来 —— scripts/apply_cover.py 依赖这一点。
 * 书脊一侧不要露出同色封面板（否则那一窄条会跟封面连成一片，四边形会歪），
 * 所以视角一律转成「右前方是纸页切口、书脊藏在背面」。
 *
 * 用法：
 *   node scripts/gen-moss-mockup.mjs                 # 全部视角
 *   node scripts/gen-moss-mockup.mjs --only hero-3q  # 单个
 *   node scripts/gen-moss-mockup.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "assets-hifi", "moss-mockup");

const BASE_URL = process.env.IMAGE_BASE_URL || "http://219.142.87.233:18200/v1";
const MODEL = process.env.IMAGE_MODEL || "moss-image";
const TIMEOUT_MS = 1200 * 1000;

/** 封面用的纯色：饱和青绿，H≈120，饱和度拉满 */
const COVER_COLOR = "saturated turquoise green";

/** 每个视角都强调这几句：纯色封面、无字无图、竖版、右侧露纸页 */
const COVER_RULES = [
  `the front cover is a completely BLANK solid ${COVER_COLOR} cover with absolutely no text, no lettering, no title, no logo, no graphics, no images, no patterns, no artwork of any kind`,
  "the front cover is a perfectly flat matte surface with an even colour",
  "a single tall portrait-format hardcover book, taller than it is wide, A5 proportions",
  "three-quarter view turned so the front cover faces slightly to the left of the camera and the right hand edge of the book shows the cream coloured page block, the spine is hidden behind",
].join(", ");

/** 书脊视角：同理，但着色的是那条窄书脊，且只能看到书脊 */
const SPINE_RULES = [
  `the spine is a completely BLANK solid ${COVER_COLOR} strip with absolutely no text, no lettering, no title, no logo, no graphics, no images, no patterns, no artwork of any kind`,
  "the spine is a perfectly flat matte surface with an even colour",
  "a single tall portrait-format hardcover book, taller than it is wide, A5 proportions",
  "viewed exactly edge-on from the side so that ONLY the narrow spine is visible facing the camera, the front cover and the pages are hidden behind the spine",
].join(", ");

const NEGATIVE =
  "text, letters, words, typography, title, subtitle, author, logo, watermark, signature, caption, pattern, graphic, illustration, decoration, book cover art, landscape format, wide book, multiple books, plant, hands, people, props, blurry";

const VIEWS = [
  {
    key: "hero-3q",
    label: "3/4 立体主图",
    size: "2048x1536",
    scene:
      "a hardcover book standing upright on a seamless light grey studio surface, photorealistic product photography, soft large softbox light from the upper left, gentle soft shadow falling to the lower right, the book occupies the centre of the frame with generous empty margin around it, sharp focus, 85mm lens",
  },
  {
    key: "front",
    label: "正面平视",
    size: "2048x1536",
    scene:
      "a hardcover book standing upright facing the camera almost straight on, slightly tilted back, on a seamless light grey studio surface, photorealistic product photography, soft large softbox light from the upper left, gentle soft shadow at the base, the book occupies the centre of the frame with generous empty margin around it, sharp focus, 85mm lens",
  },
  {
    key: "flat-lay",
    label: "平铺俯拍",
    size: "2048x1536",
    scene:
      "a hardcover book lying flat on a seamless light grey studio surface photographed from directly above, the front cover fully visible, soft even studio light, a very faint soft shadow around the book, the book occupies the centre of the frame with generous empty margin around it, photorealistic product photography, sharp focus",
  },
  {
    key: "scene-desk",
    label: "桌面场景",
    size: "2048x1536",
    scene:
      "a hardcover book leaning against a pale wall on a light oak desk, a slim black pen lying beside it as a size reference, soft window light from the left, warm clean interior, photorealistic lifestyle product photography, the book occupies the centre of the frame, sharp focus on the book, 50mm lens",
  },
  {
    key: "hero-white",
    label: "3/4 白底主图",
    size: "2048x1536",
    scene:
      "a hardcover book standing upright on a pure white seamless infinite studio background, pure white RGB 255 255 255 background, only a very faint soft grey shadow beneath the book, photorealistic product photography, soft large softbox light from the upper left, the book occupies the centre of the frame with generous empty white margin around it, sharp focus, 85mm lens",
  },
  {
    key: "spine",
    label: "书脊（正侧）",
    size: "2048x1536",
    scene:
      "a hardcover book standing upright viewed exactly edge-on from the side so that ONLY the narrow spine is visible facing the camera, the spine is a completely BLANK solid saturated turquoise green strip, the front cover and the pages are hidden behind the spine, on a seamless light grey studio surface, photorealistic product photography, soft large softbox light from the upper left, gentle soft shadow falling to the lower right, the book occupies the centre of the frame with generous empty margin around it, sharp focus, 85mm lens",
    coverIsSpine: true,
  },
];

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

async function generate(view) {
  const body = {
    model: MODEL,
    prompt: `${view.scene}, ${view.coverIsSpine ? SPINE_RULES : COVER_RULES}`,
    negative_prompt: NEGATIVE,
    size: view.size,
    n: 1,
  };
  if (dry) {
    console.log(`[dry] ${view.key} → ${view.label} (${view.size})`);
    return { ok: true, dry: true };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/images/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} ${text.slice(0, 300)}` };
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    const url = json?.data?.[0]?.url;
    if (!b64 && !url) {
      return { ok: false, error: `响应里没有图片：${JSON.stringify(json).slice(0, 200)}` };
    }
    const buf = b64
      ? Buffer.from(b64, "base64")
      : Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, `${view.key}.png`), buf);
    return { ok: true, bytes: buf.length, secs: Math.round((Date.now() - t0) / 1000) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

const targets = only ? VIEWS.filter((v) => v.key === only) : VIEWS;
if (targets.length === 0) {
  console.error(`没有匹配的视角。可用：${VIEWS.map((v) => v.key).join(", ")}`);
  process.exit(1);
}

console.log(`目标 ${targets.length} 张 · ${MODEL} · ${BASE_URL}`);
for (const view of targets) {
  const r = await generate(view);
  if (!r.ok) {
    console.error(`✗ ${view.key}：${r.error}`);
    process.exit(1);
  }
  console.log(
    r.dry
      ? `· ${view.key} ${view.label}`
      : `✓ ${view.key} ${view.label} ${(r.bytes / 1024).toFixed(0)}KB ${r.secs}s`,
  );
}
console.log(`\n产物在 ${path.relative(ROOT, OUT_DIR)}/`);
