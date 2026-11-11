#!/usr/bin/env node
/**
 * 印刷版 3D 立体电商效果图
 *
 * 【为什么用 /images/edits 而不是文生图】
 * 电商效果图必须和实物一致：封面上「千分之一的你」这五个字、
 * 副标题、作者名，一个都不能错。文生图必然把中文画成乱码
 * （实测 minimax-h3-image 在第六卷扉页上写过「心理学书设第六卷扁」）。
 * 所以这里走图片编辑：把真实封面 PNG 作为 <Picture 1> 喂进去，
 * 让模型只做「立体化」这一件事，文字由模型尽量原样搬运。
 *
 * 【模型约束】
 * - 固定 6 步采样、CFG=1，无负面提示词通道 → 排除项写进正面描述
 * - 尺寸上限 2048×2048，单张以分钟计，超时给到 1200 秒
 *
 * 用法：
 *   node scripts/gen-book-mockup.mjs                    # 出全部预设视角
 *   node scripts/gen-book-mockup.mjs --angle 45         # 只出某个视角
 *   node scripts/gen-book-mockup.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COVER = path.join(ROOT, "书-千分之一的你", "装帧", "封面.png");
const OUT_DIR = path.join(ROOT, "assets-hifi", "book-mockup");

const BASE_URL = process.env.IMAGE_BASE_URL || "http://219.142.87.233:18199/v1";
const MODEL = process.env.IMAGE_MODEL || "minimax-h3-image";
const TIMEOUT_MS = 1200 * 1000;

/**
 * 预设视角。
 *
 * 电商上架一般需要：正面 3/4 俯视、侧立展示厚度、平铺俯拍、
 * 以及一张带道具的场景图。四张一组，正好覆盖详情页首屏到详情页中段。
 */
const ANGLES = [
  {
    key: "hero-3q",
    label: "3/4 俯视主图",
    size: "2048x1536",
    prompt: `把 <Picture 1> 这本书做成一张电商产品主图：精装书立在浅米白色无缝背景的台面上，书体呈 35 度角转向画面右前方、略微俯视，能看到封面、书脊侧面与下方一叠纸页的厚度。

画面是干净的产品摄影：正上方大面积柔光箱加右侧补光，书本在台面上投出一片柔和的灰调阴影（阴影边缘虚化），整体高明度、浅色系、克制。书本本体是 A5 开本、硬壳精装、封面为哑光特种纸，四个角挺括，纸页切面是温润的米白色，能看见一丝页纹。

严格保留 <Picture 1> 封面的全部内容与排版：白色底、四色几何棱镜环、暖金核心晶体，以及封面上的全部中文文字（书名、副标题、作者名）必须与 <Picture 1> 逐字一致、清晰可辨、不得改写、不得重排、不得替换成别的字形。文字的位置、大小与颜色保持不变。

这是一张平面设计的印刷品效果图，画面里只有这一本书，不要出现任何其他书籍、道具、植物、人物、手、标识或价格标签。`,
  },
  {
    key: "side-standing",
    label: "侧立厚度图",
    size: "2048x1536",
    prompt: `把 <Picture 1> 这本书做成一张电商侧面图：书立在浅米白色无缝背景台面上，正面朝向画面左侧约 70 度，能清楚看到书脊的完整竖排书名与书脊上的几何装饰，同时看到封面的一部分与纸页的厚度。

画面是干净的产品摄影：顶部柔光箱加左前方补光，书本在台面上投出柔和的灰调阴影，整体高明度、浅色系。书是 A5 开本硬壳精装，纸页切面温润米白，可见细密页纹，书脊挺括。

严格保留 <Picture 1> 封面的全部内容与排版：白色底、四色几何棱镜环、暖金核心晶体，以及封面上的全部中文文字（书名、副标题、作者名）必须与 <Picture 1> 逐字一致、清晰可辨、不得改写、不得重排。书脊上的中文竖排书名必须清晰正确。

画面里只有这一本书，不要出现其他书籍、道具、植物、人物、手、标识或价格标签。`,
  },
  {
    key: "flat-top",
    label: "平铺俯拍图",
    size: "2048x1536",
    prompt: `把 <Picture 1> 这本书做成一张电商平铺俯拍图：书平放在浅米白色无缝背景的台面上，正面完全朝向镜头，只有极轻微的自然透视，整本完整入画、四周留白均匀。

画面是干净的产品摄影：正上方大面积柔光箱，书在台面上投出极淡的灰调阴影，整体高明度、浅色系、克制。书是 A5 开本硬壳精装，纸页切面温润米白、可见细密页纹。

严格保留 <Picture 1> 封面的全部内容与排版：白色底、四色几何棱镜环、暖金核心晶体，以及封面上的全部中文文字（书名、副标题、作者名）必须与 <Picture 1> 逐字一致、清晰可辨、不得改写、不得重排、不得替换成别的字形。

画面里只有这一本书，不要出现其他书籍、道具、植物、人物、手、标识或价格标签。`,
  },
  {
    key: "scene-desk",
    label: "桌面场景图",
    size: "2048x1536",
    prompt: `把 <Picture 1> 这本书做成一张电商场景图：书斜靠在一面浅米白色墙面前、立在木质台面上，封面朝向镜头约 25 度角，旁边放一支极简的黑色签字笔作为尺寸参照物，背景是浅色书桌与柔和虚化的墙面。

画面是自然窗光的生活场景摄影：左侧窗户来的柔和漫射光，书本在墙面上投出淡淡的投影，色调温和干净、整体高明度。书是 A5 开本硬壳精装，纸页切面温润米白。

严格保留 <Picture 1> 封面的全部内容与排版：白色底、四色几何棱镜环、暖金核心晶体，以及封面上的全部中文文字（书名、副标题、作者名）必须与 <Picture 1> 逐字一致、清晰可辨、不得改写、不得重排。

画面里只有这一本书和一支笔，不要出现其他书籍、人物、手、标识或价格标签。`,
  },
];

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const onlyIdx = args.indexOf("--angle");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

/** 调 /images/edits（multipart）：第 1 张图 = <Picture 1> */
async function edit(item, dryRun) {
  if (dryRun) {
    console.log(`[dry] ${item.key} → ${item.label} (${item.size})`);
    return { ok: true, dry: true };
  }

  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", item.prompt);
  form.append("size", item.size);
  const buf = fs.readFileSync(COVER);
  form.append("image", new Blob([buf], { type: "image/png" }), "cover.png");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/images/edits`, {
      method: "POST",
      body: form,
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
    const img = b64
      ? Buffer.from(b64, "base64")
      : Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, `${item.key}.png`), img);
    return { ok: true, bytes: img.length, secs: Math.round((Date.now() - t0) / 1000) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

const targets = only ? ANGLES.filter((a) => a.key === only || a.label === only) : ANGLES;
if (targets.length === 0) {
  console.error(`没有匹配的视角。可用：${ANGLES.map((a) => a.key).join(", ")}`);
  process.exit(1);
}

console.log(`目标 ${targets.length} 张 · ${MODEL} · 编辑源：书-千分之一的你/装帧/封面.png`);
for (const item of targets) {
  const r = await edit(item, dry);
  if (!r.ok) {
    console.error(`✗ ${item.key}：${r.error}`);
    process.exit(1);
  }
  console.log(
    r.dry
      ? `· ${item.key} ${item.label}`
      : `✓ ${item.key} ${item.label} ${(r.bytes / 1024).toFixed(0)}KB ${r.secs}s`,
  );
}
console.log(`\n产物在 ${path.relative(ROOT, OUT_DIR)}/`);
