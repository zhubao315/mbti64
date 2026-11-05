/**
 * MBTI64 分享海报（Canvas 2D）
 *
 * 尺寸：1080 × 1440（3:4，适合微信朋友圈 / 手机相册 / 社交平台）
 *
 * 版式（v2）：
 * - 顶部 1000×1160 白色信息卡，承载品牌、型别、标签、一句话特质、六维与稀有度
 * - 底部留出独立底色区，二维码单独放置，与正文完全隔离，保证扫码识别
 * - 一句话特质总结固定夹在标签与六维进度条之间，是整张卡的「种草钩子」
 * - 复用：换插画 / 型号 / 标题 / 标语 / 标签 / 那句话，版式不改
 *
 * 为什么不用 html2canvas：字体、渐变在 html2canvas 里损耗大，
 * 直接 draw 能保证「所见即所得」，且零额外依赖（qrcode 只生成二维码矩阵）。
 */

import QRCode from "qrcode";
import type { DimKey, DimScore } from "@/data/schema";
import { DIM_ORDER, GROUP_META, type GroupKey } from "@/data/schema";
import type { RankedType } from "@/lib/rarity";
import { per1000Text } from "@/lib/rarity";

export const POSTER_W = 1080;
export const POSTER_H = 1440;

const NAVY = "#0F2747";
const INK = "#172B45";
const SECONDARY = "#5A6A7E";
const MUTED = "#5B6B80";
const BORDER = "#E8E8E8";
const BG = "#EEF2F7";

/** 白色信息卡的位置与尺寸：底部 240px 留给二维码底色区 */
const CARD = { x: 40, y: 40, w: 1000, h: 1160 };
const CONTENT_X = 96;
const CONTENT_W = 888;

export interface PosterInput {
  code: string;
  typeName: string;
  group: GroupKey;
  tagline: string;
  /** 一句话特质总结（每型一句，放在标签与六维之间） */
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

/** 四象限几何符号：四个圆角方块，2×2 排列 */
function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: [string, string, string, string],
) {
  const gap = size * 0.06;
  const cell = (size - gap) / 2;
  const r = cell * 0.18;
  const positions: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  positions.forEach(([cx, cy], i) => {
    const px = x + cx * (cell + gap);
    const py = y + cy * (cell + gap);
    roundRect(ctx, px, py, cell, cell, r);
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

/** 关键词标签：居中排布的一行小胶囊 */
function drawTags(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  centerY: number,
): void {
  if (!tags.length) return;
  const h = 40;
  const padX = 18;
  const gap = 10;
  ctx.font = `600 19px ${FONT_STACK}`;
  const widths = tags.map((t) => ctx.measureText(t).width + padX * 2);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1);
  let x = (POSTER_W - total) / 2;
  const y = centerY - h / 2;

  tags.forEach((tag, i) => {
    roundRect(ctx, x, y, widths[i], h, h / 2);
    ctx.fillStyle = "#F1F5F9";
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = SECONDARY;
    ctx.fillText(tag, x + widths[i] / 2, y + h / 2 + 1);
    x += widths[i] + gap;
  });

  ctx.textBaseline = "alphabetic";
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

export async function renderPoster(input: PosterInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用");

  const group = GROUP_META[input.group];

  // ---- 1. 海报底色（二维码所在区域，和信息卡明确分区）
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // ---- 2. 白色信息卡
  ctx.save();
  ctx.shadowColor = hexA(NAVY, 0.1);
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 32);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // 顶部族群色条（单色，8px）
  ctx.save();
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 32);
  ctx.clip();
  ctx.fillStyle = group.color;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, 8);
  ctx.restore();

  // ---- 3. 品牌头
  drawMark(ctx, 100, 96, 56, MARK_COLORS);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("MBTI64", 176, 144);

  ctx.textAlign = "right";
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("64 PERSONALITIES", CARD.x + CARD.w - 56, 122);
  ctx.font = `500 18px ${FONT_STACK}`;
  ctx.fillText("ONE UNIQUE YOU", CARD.x + CARD.w - 56, 150);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CONTENT_X, 192);
  ctx.lineTo(CONTENT_X + CONTENT_W, 192);
  ctx.stroke();

  // ---- 4. 型别身份区
  ctx.textAlign = "center";
  ctx.font = `700 27px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText(input.code, POSTER_W / 2, 252);

  ctx.font = `800 64px ${FONT_STACK}`;
  ctx.fillStyle = INK;
  ctx.fillText(input.typeName, POSTER_W / 2, 332);

  // 族群 chip
  ctx.font = `700 24px ${FONT_STACK}`;
  const groupText = group.cn;
  const chipW = ctx.measureText(groupText).width + 60;
  const chipH = 50;
  roundRect(ctx, (POSTER_W - chipW) / 2, 356, chipW, chipH, chipH / 2);
  ctx.fillStyle = group.soft;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = group.text;
  ctx.fillText(groupText, POSTER_W / 2, 382);
  ctx.textBaseline = "alphabetic";

  // tagline（单行，超出省略）
  ctx.textAlign = "center";
  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  wrapText(ctx, input.tagline, POSTER_W / 2, 452, 820, 34, 1);

  // ---- 5. 关键词标签
  drawTags(ctx, input.keywords.slice(0, 4), 500);

  // ---- 6. 一句话特质总结（种草钩子，标签与六维之间）
  const boxY = 552;
  const boxH = 172;
  roundRect(ctx, CONTENT_X, boxY, CONTENT_W, boxH, 20);
  ctx.fillStyle = group.light;
  ctx.fill();

  // 左侧族群色竖条
  ctx.save();
  roundRect(ctx, CONTENT_X, boxY, CONTENT_W, boxH, 20);
  ctx.clip();
  ctx.fillStyle = group.color;
  ctx.fillRect(CONTENT_X, boxY, 5, boxH);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.font = `700 19px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("一句话读懂你", CONTENT_X + 34, boxY + 42);

  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillStyle = INK;
  wrapTextLeft(ctx, input.essence, CONTENT_X + 34, boxY + 86, CONTENT_W - 68, 38, 3);

  // ---- 7. 六维横向读数（两列 × 三行）
  ctx.textAlign = "left";
  ctx.font = `700 25px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("六维倾向", CONTENT_X, 786);

  const colX = [CONTENT_X, CONTENT_X + 452];
  const rowTop = 816;
  const rowStep = 68;
  DIM_ORDER.forEach((k, i) => {
    const d = input.dims[k];
    const x = colX[i < 3 ? 0 : 1];
    const y = rowTop + (i % 3) * rowStep;

    ctx.textAlign = "left";
    ctx.font = `600 21px ${FONT_STACK}`;
    ctx.fillStyle = INK;
    ctx.fillText(DIM_LABEL[k], x, y + 16);

    const barX = x + 108;
    const barW = 218;
    const barH = 11;
    roundRect(ctx, barX, y + 6, barW, barH, barH / 2);
    ctx.fillStyle = BORDER;
    ctx.fill();

    const filled = Math.max(0.08, Math.min(1, d.preferred / 100));
    roundRect(ctx, barX, y + 6, barW * filled, barH, barH / 2);
    ctx.fillStyle = NAVY;
    ctx.fill();

    ctx.textAlign = "right";
    ctx.font = `700 20px ${FONT_STACK}`;
    ctx.fillStyle = NAVY;
    ctx.fillText(`${d.preferred}%`, x + 420, y + 16);
  });

  // ---- 8. 稀有度（独立中性刻度）
  const tierY = 1000;
  const tierH = 152;
  roundRect(ctx, CONTENT_X, tierY, CONTENT_W, tierH, 22);
  ctx.fillStyle = "#F8FAFC";
  ctx.fill();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = `600 20px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("稀有度", CONTENT_X + 32, tierY + 42);

  ctx.font = `800 46px ${FONT_STACK}`;
  ctx.fillStyle = input.rarity.tier.text;
  ctx.fillText(input.rarity.tier.name, CONTENT_X + 32, tierY + 100);

  ctx.font = `500 20px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText(per1000Text(input.rarity), CONTENT_X + 32, tierY + 132);

  ctx.textAlign = "right";
  ctx.font = `600 20px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("64 型名次", CONTENT_X + CONTENT_W - 32, tierY + 42);
  ctx.font = `800 52px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText(input.rarity.rankLabel, CONTENT_X + CONTENT_W - 32, tierY + 108);

  // ---- 9. 底部独立区：二维码与引导文案分离，彼此不重叠
  const qrBox = 204;
  const qrSize = 172;
  const qrX = POSTER_W - CONTENT_X - qrBox;
  const qrY = 1216;

  try {
    const qr = await makeQrCanvas(input.url, qrSize);
    ctx.save();
    ctx.shadowColor = hexA(NAVY, 0.12);
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, qrX, qrY, qrBox, qrBox, 20);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    roundRect(ctx, qrX, qrY, qrBox, qrBox, 20);
    ctx.stroke();

    ctx.drawImage(qr, qrX + (qrBox - qrSize) / 2, qrY + (qrBox - qrSize) / 2, qrSize, qrSize);
  } catch {
    /* 二维码失败不影响主图 */
  }

  const textX = CONTENT_X;
  const textMax = qrX - 40 - textX;

  ctx.textAlign = "left";
  ctx.font = `800 32px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("扫码看看你的 64 型", textX, 1276);

  ctx.font = `500 19px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  wrapTextLeft(ctx, "60 题约 8 分钟 · 结果只存在你的浏览器", textX, 1314, textMax, 28, 1);

  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("zhubao315.github.io/mbti64", textX, 1358);

  ctx.font = `400 16px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  wrapTextLeft(ctx, "娱乐与自我探索为目的 · 不构成心理咨询或诊断", textX, 1396, textMax, 24, 1);

  return canvas;
}

const DIM_LABEL: Record<DimKey, string> = {
  EI: "能量方向",
  SN: "信息获取",
  TF: "决策方式",
  JP: "生活节奏",
  AC: "自我姿态",
  OH: "变化偏好",
};

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
