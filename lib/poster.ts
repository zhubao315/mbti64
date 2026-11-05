/**
 * MBTI64 分享海报（Canvas 2D）
 *
 * 尺寸：1080 × 1440（3:4，适合微信朋友圈 / 手机相册 / 社交平台）
 *
 * 视觉规范：
 * - 浅灰纸面 + 白色内容卡，顶部 8px 族群色条（单色，不叠加彩虹）
 * - 四象限几何 Logo + 深海军蓝 MBTI64 字标
 * - 六维横向 bar 统一使用 navy，族群色只出现在顶部条与族群 chip
 * - 稀有度使用独立中性刻度，不使用族群色与 emoji
 * - 底部：二维码 + 品牌地址 + 标语 + 免责声明
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
const SECONDARY = "#64748B";
const MUTED = "#94A3B8";
const BORDER = "#E8E8E8";
const BG = "#F8FAFC";

export interface PosterInput {
  code: string;
  typeName: string;
  group: GroupKey;
  tagline: string;
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
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: NAVY, light: "#FFFFFF" },
  });
  return canvas;
}

export async function renderPoster(input: PosterInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用");

  const group = GROUP_META[input.group];

  // ---- 1. 纸面 + 内容卡
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  const pad = 56;
  const cardW = POSTER_W - pad * 2;
  const cardH = POSTER_H - pad * 2;
  ctx.save();
  ctx.shadowColor = hexA(NAVY, 0.08);
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, pad, pad, cardW, cardH, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // 顶部族群色条（单色，8px）
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, 36);
  ctx.clip();
  ctx.fillStyle = group.color;
  ctx.fillRect(pad, pad, cardW, 8);
  ctx.restore();

  // ---- 2. 品牌头
  drawMark(ctx, 112, 118, 68, MARK_COLORS);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 40px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("MBTI64", 202, 170);

  ctx.textAlign = "right";
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("64 PERSONALITIES", POSTER_W - 112, 152);
  ctx.font = `500 20px ${FONT_STACK}`;
  ctx.fillText("ONE UNIQUE YOU", POSTER_W - 112, 180);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, 216);
  ctx.lineTo(POSTER_W - 112, 216);
  ctx.stroke();

  // ---- 3. 代码 / 名称 / 族群 chip
  ctx.textAlign = "center";
  ctx.font = `700 32px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText(input.code, POSTER_W / 2, 290);

  ctx.font = `800 74px ${FONT_STACK}`;
  ctx.fillStyle = INK;
  ctx.fillText(input.typeName, POSTER_W / 2, 380);

  // 族群 chip
  ctx.font = `700 26px ${FONT_STACK}`;
  const groupText = group.cn;
  const chipW = ctx.measureText(groupText).width + 64;
  const chipH = 54;
  roundRect(ctx, (POSTER_W - chipW) / 2, 410, chipW, chipH, chipH / 2);
  ctx.fillStyle = group.soft;
  ctx.fill();
  ctx.fillStyle = group.text;
  ctx.fillText(groupText, POSTER_W / 2, 449);

  // tagline
  ctx.font = `500 30px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  wrapText(ctx, input.tagline, POSTER_W / 2, 530, 860, 46, 2);

  // ---- 4. 六维横向读数
  ctx.textAlign = "left";
  ctx.font = `700 26px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("六维倾向", 112, 632);

  const rowTop = 672;
  const rowStep = 64;
  DIM_ORDER.forEach((k, i) => {
    const y = rowTop + i * rowStep;
    const d = input.dims[k];
    ctx.textAlign = "left";
    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = INK;
    ctx.fillText(DIM_LABEL[k], 112, y + 18);

    const barX = 360;
    const barW = 520;
    const barH = 12;
    roundRect(ctx, barX, y + 3, barW, barH, barH / 2);
    ctx.fillStyle = BORDER;
    ctx.fill();

    const filled = Math.max(0.08, Math.min(1, d.preferred / 100));
    roundRect(ctx, barX, y + 3, barW * filled, barH, barH / 2);
    ctx.fillStyle = NAVY;
    ctx.fill();

    ctx.textAlign = "right";
    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillStyle = NAVY;
    ctx.fillText(`${d.preferred}%`, 968, y + 18);
  });

  // ---- 5. 稀有度（独立中性刻度）
  const tierY = 1074;
  roundRect(ctx, 112, tierY, POSTER_W - 224, 152, 28);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = `600 22px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("稀有度", 144, tierY + 44);

  ctx.font = `800 52px ${FONT_STACK}`;
  ctx.fillStyle = input.rarity.tier.text;
  ctx.fillText(input.rarity.tier.name, 144, tierY + 106);

  ctx.font = `500 24px ${FONT_STACK}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText(per1000Text(input.rarity), 144, tierY + 142);

  ctx.textAlign = "right";
  ctx.font = `600 22px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("64 型名次", POSTER_W - 144, tierY + 44);
  ctx.font = `800 60px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText(input.rarity.rankLabel, POSTER_W - 144, tierY + 116);

  // ---- 6. 底部：二维码 + 品牌地址 + 标语
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, 1268);
  ctx.lineTo(POSTER_W - 112, 1268);
  ctx.stroke();

  try {
    const qr = await makeQrCanvas(input.url, 180);
    roundRect(ctx, POSTER_W - 292, 1296, 180, 180, 16);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.stroke();
    ctx.drawImage(qr, POSTER_W - 292, 1296, 180, 180);
  } catch {
    /* 二维码失败不影响主图 */
  }

  ctx.textAlign = "left";
  ctx.font = `700 28px ${FONT_STACK}`;
  ctx.fillStyle = NAVY;
  ctx.fillText("zhubao315.github.io/mbti64", 112, 1322);

  ctx.font = `600 20px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("64 PERSONALITIES · ONE UNIQUE YOU", 112, 1360);

  ctx.font = `400 18px ${FONT_STACK}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("娱乐与自我探索为目的 · 不构成心理咨询或诊断", 112, 1394);

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
