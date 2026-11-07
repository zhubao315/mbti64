/**
 * MBTI64 分享海报（Canvas 2D）
 *
 * 尺寸：1080 × 1440（3:4，适合朋友圈 / 手机相册 / 社交平台）
 *
 * 版式（v3，正式海报）：
 * - 全幅海报，不做「多张卡片竖向堆叠」，只用留白、字号与细分隔线建立层级
 * - 自上而下：品牌头 → 型别标题 → 人物主视觉 → 一句话特质 → 三组关键数据 → 二维码
 * - 二维码单独放在底部底色区，与正文完全隔离
 * - 复用：换插画 / 型号 / 标题 / 标语 / 标签 / 那句话，版式不改
 *
 * 为什么不用 html2canvas：字体、渐变在 html2canvas 里损耗大，
 * 直接 draw 能保证「所见即所得」，且零额外依赖（qrcode 只生成二维码矩阵）。
 */

import QRCode from "qrcode";
import type { DimKey, DimScore } from "@/data/schema";
import { DIMS, DIM_ORDER, GROUP_META, type GroupKey } from "@/data/schema";
import type { RankedType } from "@/lib/rarity";
import { withBasePath } from "@/lib/site";

export const POSTER_W = 1080;
export const POSTER_H = 1440;

const NAVY = "#0F2747";
const INK = "#172B45";
const SECONDARY = "#5A6A7E";
const MUTED = "#5B6B80";
const HAIRLINE = "#E4E9F0";

/** 内容左右边界 */
const CONTENT_X = 96;
const CONTENT_W = 888;

/** 人物主视觉：3:4 原图比例，绝不拉伸 */
const PORTRAIT = { x: 310, y: 398, w: 460, h: 613 };
/** 插画自带白边，轻微内裁让人物更聚焦（仍保持完整构图） */
const PORTRAIT_ZOOM = 1.1;

export interface PosterInput {
  code: string;
  typeName: string;
  group: GroupKey;
  tagline: string;
  /** 一句话特质总结（每型一句，海报的核心种草钩子） */
  essence: string;
  dims: Record<DimKey, DimScore>;
  rarity: RankedType;
  url: string;
  /** 3–5 个关键词 */
  keywords: string[];
}

const FONT_STACK =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "Inter", sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 四象限色块：仅在品牌 SVG 加载失败时兜底 */
function drawFallbackMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: [string, string, string, string],
) {
  const gap = size * 0.06;
  const cell = (size - gap) / 2;
  const r = cell * 0.18;
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ].forEach(([cx, cy], i) => {
    roundRect(ctx, x + cx * (cell + gap), y + cy * (cell + gap), cell, cell, r);
    ctx.fillStyle = colors[i];
    ctx.fill();
  });
}

const MARK_COLORS: [string, string, string, string] = [
  GROUP_META.analyst.color,
  GROUP_META.diplomat.color,
  GROUP_META.guardian.color,
  GROUP_META.adventurer.color,
];

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 生成二维码（返回离屏 canvas） */
export async function makeQrCanvas(text: string, size: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: NAVY, light: "#FFFFFF" },
  });
  return canvas;
}

/** 单行文本，超宽时省略 */
function drawLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: CanvasTextAlign,
): void {
  ctx.save();
  ctx.textAlign = align;
  ctx.fillText(trimEllipsis(ctx, text, maxWidth), x, y);
  ctx.restore();
}

/** 左对齐多行文本（超出时末行省略号） */
function wrapTextLeft(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const chars = Array.from(text);
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line += ch;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  ctx.save();
  ctx.textAlign = "left";
  lines.forEach((l, i) => {
    const shown = i === maxLines - 1 && lines.length === maxLines ? trimEllipsis(ctx, l, maxWidth) : l;
    ctx.fillText(shown, x, y + i * lineHeight);
  });
  ctx.restore();
}

function trimEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** 型别名不超过 6 字：过长时自动缩小，避免换行破坏版式 */
function fitTitleSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  let size = 90;
  while (size > 64) {
    ctx.font = `900 ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

/** 分享海报的可选尺寸；portrait 为默认 4:5（朋友圈），square 为 1:1，og 为横版。 */
export type PosterSize = "portrait" | "square" | "og";

export const POSTER_VARIANTS: Record<PosterSize, { w: number; h: number; label: string }> = {
  portrait: { w: 1080, h: 1350, label: "4:5 朋友圈" },
  square: { w: 1080, h: 1080, label: "1:1 方形" },
  og: { w: 1200, h: 630, label: "横版 1200×630" },
};

/**
 * 把 1080×1440 的基础海报等比缩放合成到目标尺寸：
 * - portrait / square：整版等比缩放后居中，绝不裁切文字
 * - og：左侧等比缩放海报，右侧补品牌、代码、名称、标签与网址
 */
function composePoster(base: HTMLCanvasElement, size: PosterSize, input: PosterInput): HTMLCanvasElement {
  const preset = POSTER_VARIANTS[size];
  const out = document.createElement("canvas");
  out.width = preset.w;
  out.height = preset.h;
  const ctx = out.getContext("2d")!;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, preset.w, preset.h);

  if (size === "portrait" || size === "square") {
    const scale = preset.h / base.height;
    const w = base.width * scale;
    ctx.drawImage(base, (preset.w - w) / 2, 0, w, preset.h);
    return out;
  }

  // 横版：左侧海报 + 右侧信息区
  const scale = preset.h / base.height;
  const w = base.width * scale;
  ctx.drawImage(base, 20, 0, w, preset.h);

  const x = Math.round(w) + 64;
  ctx.fillStyle = NAVY;
  ctx.font = `800 20px ${FONT_STACK}`;
  ctx.fillText("MBTI64 · 64 PERSONALITIES", x, 170);

  ctx.font = `800 64px ${FONT_STACK}`;
  ctx.fillText(input.code, x, 260);

  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText(input.typeName, x, 316);

  ctx.fillStyle = SECONDARY;
  ctx.font = `400 22px ${FONT_STACK}`;
  wrapText(ctx, input.tagline, x, 366, preset.w - x - 48, 34, 2);

  ctx.fillStyle = MUTED;
  ctx.font = `500 18px ${FONT_STACK}`;
  ctx.fillText("仅供自我探索 · 不构成心理诊断", x, 560);
  ctx.fillText(input.url.replace(/^https?:\/\//, ""), x, 592);

  return out;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const chars = Array.from(text);
  let line = "";
  let lines = 0;
  for (const ch of chars) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = ch;
      lines += 1;
      if (lines >= maxLines) return;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

export async function renderPoster(input: PosterInput, size: PosterSize = "portrait"): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用");

  const group = GROUP_META[input.group];
  const strongest = DIM_ORDER.reduce((best, k) => (input.dims[k].preferred > input.dims[best].preferred ? k : best), DIM_ORDER[0]);

  const [logo, portrait, qr] = await Promise.all([
    loadImage(withBasePath("/assets/brand/logo-icon.svg")),
    loadImage(withBasePath(`/assets/portraits-light/hero-1200x1600/${input.code}-hero-1200x1600.webp`)),
    makeQrCanvas(input.url, 164).catch(() => null),
  ]);

  ctx.textBaseline = "alphabetic";

  // ---- 1. 底色：上浅下淡的整幅渐变，全幅无卡片边框
  const bg = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  bg.addColorStop(0, "#FFFFFF");
  bg.addColorStop(0.55, "#FAFBFD");
  bg.addColorStop(1, "#F2F6FB");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // 顶部族群色条：海报的身份色
  ctx.fillStyle = group.color;
  ctx.fillRect(0, 0, POSTER_W, 10);

  // 人物背后的光晕（不抢人物，只做氛围）
  const halo = ctx.createRadialGradient(POSTER_W / 2, 700, 60, POSTER_W / 2, 700, 340);
  halo.addColorStop(0, hexA(group.color, 0.16));
  halo.addColorStop(0.55, hexA(group.color, 0.07));
  halo.addColorStop(1, hexA(group.color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(POSTER_W / 2, 704, 340, 0, Math.PI * 2);
  ctx.fill();

  // ---- 2. 品牌头：与网站同一份 logo 源文件
  if (logo) {
    ctx.drawImage(logo, CONTENT_X, 56, 56, 56);
  } else {
    drawFallbackMark(ctx, CONTENT_X, 56, 56, MARK_COLORS);
  }
  ctx.textAlign = "left";
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("MBTI64", 166, 98);

  ctx.textAlign = "right";
  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("64 型人格测评", CONTENT_X + CONTENT_W, 98);

  // ---- 3. 型别标题区
  ctx.textAlign = "center";

  // 名称拆成「主名 + 后缀调性」：主名做视觉主角，后缀降级到 chip 里
  const nameParts = input.typeName.split(" · ");
  const mainName = nameParts[0] || input.typeName;
  const suffixName = nameParts.slice(1).join(" ");

  // 编码 + 族群 + 调性 chip
  ctx.font = `700 20px ${FONT_STACK}`;
  const chipText = suffixName ? `${input.code} · ${group.cn} · ${suffixName}` : `${input.code} · ${group.cn}`;
  const chipW = ctx.measureText(chipText).width + 56;
  roundRect(ctx, (POSTER_W - chipW) / 2, 150, chipW, 48, 24);
  ctx.fillStyle = group.soft;
  ctx.fill();
  ctx.textBaseline = "middle";
  ctx.fillStyle = group.text;
  ctx.fillText(chipText, POSTER_W / 2, 175);
  ctx.textBaseline = "alphabetic";

  // 型别名：整张海报最大的一行
  const titleSize = fitTitleSize(ctx, mainName, CONTENT_W);
  ctx.font = `900 ${titleSize}px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText(mainName, POSTER_W / 2, 296);

  // 标语：一行，弱化
  ctx.font = `400 26px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  drawLine(ctx, input.tagline, POSTER_W / 2, 344, 840, "center");

  // 标签：一行小字，不抢标题
  ctx.font = `600 19px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  drawLine(ctx, input.keywords.slice(0, 3).join("  ·  "), POSTER_W / 2, 382, 840, "center");

  // ---- 4. 人物主视觉（原图比例 3:4，圆角不裁切）
  ctx.save();
  ctx.shadowColor = hexA(NAVY, 0.18);
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h, 26);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h, 26);
  ctx.clip();
  if (portrait) {
    const gw = PORTRAIT.w * PORTRAIT_ZOOM;
    const gh = PORTRAIT.h * PORTRAIT_ZOOM;
    ctx.drawImage(
      portrait,
      PORTRAIT.x - (gw - PORTRAIT.w) / 2,
      PORTRAIT.y - (gh - PORTRAIT.h) / 2,
      gw,
      gh,
    );
  } else {
    // 插画缺失时不留空洞：用族群色块 + 品牌标记兜底
    ctx.fillStyle = group.light;
    ctx.fillRect(PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h);
    drawFallbackMark(ctx, POSTER_W / 2 - 50, PORTRAIT.y + PORTRAIT.h / 2 - 50, 100, MARK_COLORS);
  }
  ctx.restore();

  // 一圈极轻的族群色描边，让插画块像「版式的一部分」而不是贴上去的图片
  ctx.strokeStyle = hexA(group.color, 0.26);
  ctx.lineWidth = 2;
  roundRect(ctx, PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h, 26);
  ctx.stroke();

  // ---- 5. 一句话特质：海报的种草钩子，不再包成又一个卡片
  ctx.font = `700 64px Georgia, ${FONT_STACK}`;
  ctx.fillStyle = hexA(group.color, 0.45);
  ctx.textAlign = "left";
  ctx.fillText("“", CONTENT_X - 4, 1098);

  ctx.font = `500 27px ${FONT_STACK}`;
  ctx.fillStyle = INK;
  wrapTextLeft(ctx, input.essence, CONTENT_X + 62, 1058, CONTENT_W - 62, 36, 3);

  // ---- 6. 三组关键数据：只保留最值得晒的三项
  const labelY = 1162;
  const valueY = 1196;
  const cells = [CONTENT_X, CONTENT_X + 296, CONTENT_X + 592];
  const centers = cells.map((x) => x + 148);

  ctx.textAlign = "center";
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("最强维度", centers[0], labelY);
  ctx.fillText("稀有度", centers[1], labelY);
  ctx.fillText("64 型名次", centers[2], labelY);

  ctx.font = `800 27px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  drawLine(ctx, `${DIMS[strongest].name} ${input.dims[strongest].preferred}%`, centers[0], valueY, 272, "center");

  ctx.fillStyle = input.rarity.tier.text;
  drawLine(ctx, input.rarity.tier.name, centers[1], valueY, 272, "center");

  ctx.fillStyle = NAVY;
  drawLine(ctx, input.rarity.rankLabel, centers[2], valueY, 272, "center");

  // 细分隔线：数据区比标题弱一档
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  [CONTENT_X + 296, CONTENT_X + 592].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, labelY - 22);
    ctx.lineTo(x, valueY + 12);
    ctx.stroke();
  });

  // ---- 7. 底部分区线 + 二维码独立区
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CONTENT_X, 1216);
  ctx.lineTo(CONTENT_X + CONTENT_W, 1216);
  ctx.stroke();

  const qrBox = 196;
  const qrX = CONTENT_X + CONTENT_W - qrBox;
  const qrY = 1228;

  ctx.save();
  ctx.shadowColor = hexA(NAVY, 0.14);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, qrX, qrY, qrBox, qrBox, 22);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  roundRect(ctx, qrX, qrY, qrBox, qrBox, 22);
  ctx.stroke();

  if (qr) {
    ctx.drawImage(qr, qrX + (qrBox - 164) / 2, qrY + (qrBox - 164) / 2, 164, 164);
  }

  ctx.textAlign = "left";
  ctx.font = `800 32px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("扫码测测你的 64 型", CONTENT_X, 1292);

  ctx.font = `500 18px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText("60 题 · 约 8 分钟 · 免费", CONTENT_X, 1330);

  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillStyle = group.text;
  drawLine(ctx, input.url.replace(/^https?:\/\//, ""), CONTENT_X, 1370, qrX - 40 - CONTENT_X, "left");

  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("仅供娱乐与自我探索 · 不构成心理诊断", CONTENT_X, 1406);

  return composePoster(canvas, size, input);
}

export function posterDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function downloadPoster(canvas: HTMLCanvasElement, filename = "mbti64.png") {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

/** Web Share API 可用性（用于「直接分享图片」） */
export function canNativeShare(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (data: unknown) => boolean };
  return typeof nav.share === "function";
}
