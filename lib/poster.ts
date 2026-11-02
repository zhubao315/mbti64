/**
 * 9:16 分享海报（Canvas 2D）
 *
 * 尺寸：1080 × 1920（导出 2x 视觉密度，手机端清晰）
 * 层级：渐变底 → 光斑 → 头像 → 型别名 → 稀有度 → 雷达水印 → 二维码 → 免责声明
 *
 * 为什么不用 html2canvas：字体、渐变、混合模式在 html2canvas 里损耗大，
 * 直接 draw 能保证「所见即所得」，而且零依赖（qrcode 只用于生成二维码矩阵）。
 */

import QRCode from "qrcode";
import type { DimKey, DimScore } from "@/data/schema";
import { DIM_ORDER, GROUP_META, type GroupKey } from "@/data/schema";
import type { RankedType } from "@/lib/rarity";
import { per1000Text } from "@/lib/rarity";

export const POSTER_W = 1080;
export const POSTER_H = 1920;

export interface PosterInput {
  code: string;
  typeName: string;
  group: GroupKey;
  emoji: string;
  tagline: string;
  dims: Record<DimKey, DimScore>;
  rarity: RankedType;
  url: string;
  /** 3–5 个关键词，印在型别名下方 */
  keywords: string[];
}

const FONT_STACK =
  '"PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif';

/** 圆角矩形 */
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

/** 柔光斑（径向渐变） */
function blob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha = 0.5,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 六维雷达（作为水印绘制，透明度低） */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  dims: Record<DimKey, DimScore>,
  color: string,
  alpha: number,
) {
  const n = DIM_ORDER.length;
  const angle = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / n;
  const value = (k: DimKey) => Math.max(0.12, dims[k].preferred / 100);

  ctx.save();
  ctx.globalAlpha = alpha;

  // 网格
  for (let ring = 1; ring <= 4; ring += 1) {
    const rr = (radius * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const a = angle(i);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = hexA(color, 0.22);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 轴线
  for (let i = 0; i < n; i += 1) {
    const a = angle(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.strokeStyle = hexA(color, 0.18);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 数据面
  ctx.beginPath();
  for (let i = 0; i < n; i += 1) {
    const a = angle(i);
    const r = radius * value(DIM_ORDER[i]);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  const fill = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  fill.addColorStop(0, hexA("#7C5CFF", 0.5));
  fill.addColorStop(1, hexA("#FF8A8A", 0.5));
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = hexA(color, 0.85);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

/** 生成二维码（返回离屏 canvas） */
export async function makeQrCanvas(text: string, size: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2B2540", light: "#FFFFFF" },
  });
  return canvas;
}

/**
 * 主绘制函数：返回 canvas（调用方负责 toDataURL / toBlob）
 */
export async function renderPoster(input: PosterInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用");

  const group = GROUP_META[input.group];

  // ---- 1. 底色渐变（紫 → 粉 → 青）
  const bg = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  bg.addColorStop(0, "#FFF6FB");
  bg.addColorStop(0.45, "#F3EEFF");
  bg.addColorStop(1, "#EAF7FB");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // ---- 2. 光斑
  blob(ctx, 150, 180, 420, "#7C5CFF", 0.28);
  blob(ctx, 950, 520, 460, "#FF8A8A", 0.22);
  blob(ctx, 220, 1500, 520, "#7FD1AE", 0.2);
  blob(ctx, 900, 1720, 380, "#5FA8E8", 0.18);

  // ---- 3. 顶部品牌条
  ctx.font = `600 34px ${FONT_STACK}`;
  ctx.fillStyle = "#5B5470";
  ctx.textAlign = "center";
  ctx.fillText("64 型人格稀有度测评", POSTER_W / 2, 150);

  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillStyle = "#8B85A0";
  ctx.fillText("· 本土化 · 六维 · 七档稀有度 ·", POSTER_W / 2, 192);

  // ---- 4. 头像（emoji 字形卡片）
  const cardSize = 300;
  const cardX = (POSTER_W - cardSize) / 2;
  const cardY = 300;
  ctx.save();
  ctx.shadowColor = hexA(group.color, 0.35);
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 84);
  const cardBg = ctx.createLinearGradient(cardX, cardY, cardX + cardSize, cardY + cardSize);
  cardBg.addColorStop(0, "#FFFFFF");
  cardBg.addColorStop(1, group.soft);
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `200px ${FONT_STACK}`;
  ctx.fillText(input.emoji, POSTER_W / 2, cardY + cardSize / 2 + 6);
  ctx.restore();

  // ---- 5. 型别名
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 76px ${FONT_STACK}`;
  ctx.fillStyle = "#2B2540";
  ctx.fillText(input.typeName, POSTER_W / 2, 740);

  // ---- 6. 编码 chip
  const chipW = 300;
  const chipH = 76;
  roundRect(ctx, (POSTER_W - chipW) / 2, 782, chipW, chipH, 38);
  ctx.fillStyle = hexA(group.color, 0.12);
  ctx.fill();
  ctx.font = `700 44px ${FONT_STACK}`;
  ctx.fillStyle = group.color;
  ctx.fillText(input.code, POSTER_W / 2, 838);

  // ---- 7. tagline
  ctx.font = `500 34px ${FONT_STACK}`;
  ctx.fillStyle = "#5B5470";
  wrapText(ctx, input.tagline, POSTER_W / 2, 920, 820, 54, 2);

  // ---- 8. 关键词
  drawKeywordRow(ctx, input.keywords.slice(0, 4), 1040, group.color);

  // ---- 9. 稀有度主视觉
  const tierY = 1130;
  roundRect(ctx, 120, tierY, POSTER_W - 240, 250, 40);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fill();
  ctx.strokeStyle = hexA(input.rarity.tier.color, 0.4);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = `600 30px ${FONT_STACK}`;
  ctx.fillStyle = "#8B85A0";
  ctx.fillText("稀 有 度", 170, tierY + 62);

  ctx.font = `800 62px ${FONT_STACK}`;
  ctx.fillStyle = input.rarity.tier.color;
  ctx.fillText(input.rarity.tier.name, 170, tierY + 140);

  ctx.font = `600 32px ${FONT_STACK}`;
  ctx.fillStyle = "#5B5470";
  ctx.fillText(per1000Text(input.rarity), 170, tierY + 196);

  // 右侧：名次
  ctx.textAlign = "right";
  ctx.font = `600 28px ${FONT_STACK}`;
  ctx.fillStyle = "#8B85A0";
  ctx.fillText("64 型名次", POSTER_W - 170, tierY + 62);
  ctx.font = `800 70px ${FONT_STACK}`;
  ctx.fillStyle = "#2B2540";
  ctx.fillText(`${input.rarity.rankLabel}`, POSTER_W - 170, tierY + 148);
  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillStyle = "#8B85A0";
  ctx.fillText(`超过 ${input.rarity.beatPercent}% 的人`, POSTER_W - 170, tierY + 196);

  // ---- 10. 雷达水印（低透明度，压在右下）
  drawRadar(ctx, 800, 1560, 190, input.dims, "#7C5CFF", 0.5);

  // ---- 11. 二维码
  try {
    const qr = await makeQrCanvas(input.url, 190);
    ctx.save();
    roundRect(ctx, 130, 1430, 240, 240, 32);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();
    ctx.drawImage(qr, 155, 1455, 190, 190);
    ctx.textAlign = "left";
    ctx.font = `500 24px ${FONT_STACK}`;
    ctx.fillStyle = "#5B5470";
    ctx.fillText("扫码测你的型", 132, 1730);
  } catch {
    /* 二维码失败不影响主图 */
  }

  // ---- 12. 免责声明
  ctx.textAlign = "center";
  ctx.font = `500 22px ${FONT_STACK}`;
  ctx.fillStyle = "#8B85A0";
  ctx.fillText("娱乐与自我探索为目的 · 不构成心理咨询或诊断", POSTER_W / 2, 1830);
  ctx.font = `400 20px ${FONT_STACK}`;
  ctx.fillStyle = hexA("#8B85A0", 0.8);
  ctx.fillText("64personalities-cn", POSTER_W / 2, 1868);

  return canvas;
}

function drawKeywordRow(ctx: CanvasRenderingContext2D, keywords: string[], y: number, color: string) {
  if (keywords.length === 0) return;
  ctx.save();
  ctx.font = `600 26px ${FONT_STACK}`;
  const gap = 18;
  const padX = 26;
  const heights = 58;
  const widths = keywords.map((k) => ctx.measureText(k).width + padX * 2);
  const totalW = widths.reduce((s, w) => s + w, 0) + gap * (keywords.length - 1);
  let x = (POSTER_W - totalW) / 2;
  keywords.forEach((k, i) => {
    roundRect(ctx, x, y, widths[i], heights, heights / 2);
    ctx.fillStyle = hexA(color, 0.12);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(k, x + padX, y + heights / 2 + 2);
    x += widths[i] + gap;
  });
  ctx.restore();
}

/** 中文按字断行（不用空格分词） */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
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
  ctx.textAlign = "center";
  lines.forEach((l, i) => {
    const shown = i === maxLines - 1 && lines.length === maxLines ? trimEllipsis(ctx, l, maxWidth) : l;
    ctx.fillText(shown, cx, y + i * lineHeight);
  });
  ctx.restore();
}

function trimEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export function posterDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** 触发下载（移动端 Safari 需要 target=_blank 兜底，这里给出 a[download] 方案） */
export function downloadPoster(canvas: HTMLCanvasElement, filename = "64personalities.png") {
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
