#!/usr/bin/env node
/**
 * 《千分之一的你》参考底图再生成 · minimax-h3-image
 *
 * 【为什么重生成】
 * 原来的参考底图由上一代模型生成，风格已经和「日光棱镜 Solar-Poly 64」
 * 视觉圣经有偏差。这一轮用 minimax-h3-image 重出封面 / 封底 / 书脊、
 * 六卷扉页、16 基础原型与圆桌场景，再由 scripts/gen-book-art.mjs 重新排版合成。
 *
 * 【模型约束（必须遵守）】
 * - 固定 6 步采样、CFG=1，**不支持负面提示词**：要排除的内容写进正面描述
 *   （提示词包里每段末尾的「不要生成：…」已经在正面提示词里，直接沿用）
 * - 尺寸上限 2048×2048，不要传 4096 以上
 * - 单张以分钟计（首次含模型加载 300~370 秒），超时给到 1200 秒
 *
 * 用法：
 *   node scripts/gen-book-refs.mjs              # 全量
 *   node scripts/gen-book-refs.mjs C1 V1        # 只出指定条目
 *   node scripts/gen-book-refs.mjs --dry-run    # 只打印将要发什么
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPT_PACK = path.join(ROOT, "docs", "book-visual", "02-参考图提示词包.md");
const PROMPT_PACK_3 = path.join(ROOT, "docs", "book-visual", "05-批次3-基础原型提示词.md");
const REFS = path.join(ROOT, "docs", "book-visual", "refs");
const OUT_DIR = path.join(ROOT, "assets-hifi", "book-refs-minimax");

const BASE_URL = process.env.IMAGE_BASE_URL || "http://219.142.87.233:18199/v1";
const MODEL = process.env.IMAGE_MODEL || "minimax-h3-image";
const TIMEOUT_MS = 1200 * 1000;

/**
 * 从提示词包里解析 `prompt <ID> | <尺寸> | <文件名>` 段落。
 * 格式与 tools/gen_solarpoly_refs.mjs 解析的一致（同一份文件是唯一事实源）。
 */
function parsePromptPack(file) {
  const text = fs.readFileSync(file, "utf8");
  const re = /```prompt\s+([^\s|]+)\s*\|\s*([0-9]+)x([0-9]+)\s*\|\s*([^\s]+)\s*\n([\s\S]*?)```/g;
  const items = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    items.push({
      id: m[1],
      width: Number(m[2]),
      height: Number(m[3]),
      file: m[4],
      prompt: m[5].trim(),
    });
  }
  return items;
}

/**
 * minimax-h3-image 的已知脾气（第一轮实测出来的），需要在正面提示词里补三句：
 *
 * 1. 它默认会把「书籍封面」理解成「实物照片」——首轮出的封面带灰色相框、
 *    纸张边缘与桌面阴影。必须明说这是平面插画、满幅铺满画布。
 * 2. 它没有负面提示词通道，提示词包末尾的「不要生成：…」会被当成软指令。
 *    实测文字确实没出来，但相框这类「画面里多出来的东西」必须正面排除。
 * 3. 四季符号要单独点名，否则它会只画一种群落结构，丢掉另外三季。
 */
const MODEL_ADAPT = [
  "本图是用于印刷的平面矢量插画，图形内容直接铺满整个画布；画面里只有这一张平面设计，不要出现相框、画中画边框、书页边缘、纸张厚度、桌面、背景墙、倒角投影、拍摄台面的实物照片感、任何画布纹理或颗粒。",
  "画面里不出现任何汉字、字母、数字、符号、标识、印章或标签；所有留白区域都是纯净的白色纸面，不放任何内容。",
  "画面中同时出现四个季节的几何符号：细薄的彩色棱镜探针、向外破壁的几何箭头与折纸光带、稳定咬合的六边形秩序矩阵、半透明水晶几何保护罩，四者由彩色拓扑线连接成开放的循环。",
].join("\n");

/**
 * 尺寸换算：模型上限 2048×2048，超了就等比缩到上限内。
 * 横竖比例必须保持，否则排版层的安全区会算错。
 */
function fitSize(width, height) {
  const MAX = 2048;
  if (width <= MAX && height <= MAX) return `${width}x${height}`;
  const k = MAX / Math.max(width, height);
  return `${Math.round(width * k)}x${Math.round(height * k)}`;
}

/** 调 OpenAI 兼容的 /images/generations */
async function generate(item, dryRun) {
  const size = fitSize(item.width, item.height);
  const body = { model: MODEL, prompt: `${item.prompt}\n${MODEL_ADAPT}`, size, n: 1 };
  if (dryRun) {
    console.log(`[dry] ${item.id} → ${item.file} (${size})`);
    return { ok: true, dry: true };
  }

  const t0 = Date.now();
  // 生图服务会偶发断连（模型被换出显存后的第一次请求尤其不稳），
  // 单次失败不代表内容有问题，重试几次即可。
  let lastErr = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = `HTTP ${res.status} ${text.slice(0, 300)}`;
      } else {
        const json = await res.json();
        const b64 = json?.data?.[0]?.b64_json;
        const url = json?.data?.[0]?.url;
        if (!b64 && !url) {
          lastErr = `响应里没有图片：${JSON.stringify(json).slice(0, 200)}`;
        } else {
          const buf = b64
            ? Buffer.from(b64, "base64")
            : Buffer.from(await (await fetch(url)).arrayBuffer());
          fs.mkdirSync(OUT_DIR, { recursive: true });
          fs.writeFileSync(path.join(OUT_DIR, item.file), buf);
          return {
            ok: true,
            bytes: buf.length,
            secs: Math.round((Date.now() - t0) / 1000),
            attempt,
          };
        }
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    } finally {
      clearTimeout(timer);
    }
    console.warn(`  · ${item.id} 第 ${attempt} 次失败：${lastErr}，20 秒后重试`);
    await new Promise((r) => setTimeout(r, 20000));
  }
  return { ok: false, error: lastErr };
}

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const only = argv.filter((a) => !a.startsWith("--"));

/**
 * 本轮要重出的底图（id 取提示词包里的文件名，与 refs/ 里的实际文件同名）：
 *   封面三件套 + 六卷扉页 + 圆桌场景   → 02-参考图提示词包.md
 *   16 个基础原型                        → 05-批次3-基础原型提示词.md
 *
 * 注意：refs/ 里同一张图可能有多个版本（v01/v02/v03），
 * 这里只重出「当前生效的那一版」，避免生成一堆用不上的文件。
 */
const WANT_COVER = [
  "01_cover_front_v01",       // 封面正面
  "02_cover_back_v01",        // 封底
  "03_spine_v02",             // 书脊（v02：去伪文字）
  "04_volume_01_opening_v01", // 第一卷扉页
  "05_volume_02_v02",         // 第二卷扉页（v02：补左边缘安全区）
  "06_volume_03_opening_v01", // 第三卷扉页
  "07_volume_04_opening_v01", // 第四卷扉页
  "08_volume_05_opening_v01", // 第五卷扉页
  "09_volume_06_v02",         // 第六卷扉页（v02：去数字刻度）
  "15_scene_roundtable_INFJ_v02", // 圆桌场景（v02：右侧留白）
];

/** 16 个基础原型当前生效的版本（与 gen-book-art.mjs 的 baseRefFor 取法一致：取最高版本） */
const BASE_REFS = [
  "02_05_INTJ_base_v01", "02_06_INTP_base_v03", "02_07_ENTJ_base_v01", "02_08_ENTP_base_v03",
  "10_type-INFJ_base_v02", "03_10_INFP_base_v01", "03_11_ENFP_base_v01", "03_12_ENFJ_base_v01",
  "04_13_ISTJ_base_v01", "04_14_ISFJ_base_v03", "04_15_ESTJ_base_v01", "04_16_ESFJ_base_v03",
  "05_17_ISTP_base_v01", "05_18_ISFP_base_v03", "05_19_ESTP_base_v01", "05_20_ESFP_base_v01",
];

const items = [
  ...parsePromptPack(PROMPT_PACK),
  ...parsePromptPack(PROMPT_PACK_3),
];
const WANT = [...WANT_COVER, ...BASE_REFS];
if (items.length === 0) {
  console.error("ERROR: 提示词包里没解析到任何条目");
  process.exit(1);
}

const targets = only.length > 0 ? items.filter((i) => only.includes(i.id)) : items.filter((i) => WANT.includes(i.id));

if (targets.length === 0) {
  console.error(`没有匹配的条目。可用 ID：${items.map((i) => i.id).join(", ")}`);
  process.exit(1);
}

console.log(`目标 ${targets.length} 张 · ${MODEL} · ${BASE_URL}`);
for (const item of targets) {
  const r = await generate(item, dryRun);
  if (!r.ok) {
    console.error(`✗ ${item.id} (${item.file})：${r.error}`);
    process.exit(1);
  }
  console.log(
    r.dry
      ? `· ${item.id} ${item.file}`
      : `✓ ${item.id} ${item.file} ${(r.bytes / 1024).toFixed(0)}KB ${r.secs}s（第 ${r.attempt} 次）`,
  );
}
console.log(`\n全部完成，产物在 ${path.relative(ROOT, OUT_DIR)}/`);
