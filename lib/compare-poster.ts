import { DIMS, DIM_ORDER } from "@/data/schema";
import { withBasePath } from "@/lib/site";
import { makeQrCanvas } from "@/lib/poster";
import type { ChemistryReport } from "@/lib/chemistry";

/**
 * 双人合盘分享卡（Canvas 1080×1440）
 *
 * 左 A 右 B 两个角色插画，中间六维对撞波形，下方核心金句，
 * 底部二维码 + 「测测你们的默契度」。
 *
 * 纯浏览器端绘制，不上传任何数据。
 */
export const CHEM_W = 1080;
export const CHEM_H = 1440;

const NAVY = "#0F2747";
const INK = "#172B45";
const MUTE = "#8B85A0";
const LINE = "#E2E6EE";

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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const chars = Array.from(text);
  let line = "";
  let cy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

/** 六维对撞波形：两张雷达多边形叠在一起 */
function drawCollision(
  ctx: CanvasRenderingContext2D,
  report: ChemistryReport,
  cx: number,
  cy: number,
  radius: number,
) {
  const n = DIM_ORDER.length;
  const angleOf = (i: number) => (i * (Math.PI * 2)) / n - Math.PI / 2;

  ctx.save();
  // 网格
  for (let ring = 1; ring <= 3; ring += 1) {
    ctx.beginPath();
    for (let i = 0; i <= n; i += 1) {
      const idx = i % n;
      const a = angleOf(idx);
      const r = (radius * ring) / 3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // 轴线与标签
  for (let i = 0; i < n; i += 1) {
    const a = angleOf(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = MUTE;
    ctx.font = "500 20px system-ui, -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(DIMS[DIM_ORDER[i]].name.replace(/（.*）/, ""), cx + Math.cos(a) * (radius + 34), cy + Math.sin(a) * (radius + 34));
  }

  // 两个人的多边形
  const drawPolygon = (side: "a" | "b", color: string, fill: string) => {
    ctx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const row = report.dims[i];
      const strength = (side === "a" ? row.aStrength : row.bStrength) / 100;
      const a = angleOf(i);
      const r = radius * Math.max(0.12, strength);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  };

  drawPolygon("a", "#4A90E2", "rgba(74,144,226,0.18)");
  drawPolygon("b", "#C97A2B", "rgba(201,122,43,0.16)");
  ctx.restore();
}

export interface ChemPosterInput {
  report: ChemistryReport;
  /** 二维码指向的链接（通常是 /compare?a=..&b=..） */
  url: string;
}

export async function renderChemPoster(input: ChemPosterInput): Promise<HTMLCanvasElement> {
  const { report } = input;
  const canvas = document.createElement("canvas");
  canvas.width = CHEM_W;
  canvas.height = CHEM_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CHEM_W, CHEM_H);

  // 顶部色带
  const grad = ctx.createLinearGradient(0, 0, CHEM_W, 0);
  grad.addColorStop(0, "#4A90E2");
  grad.addColorStop(1, "#C97A2B");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CHEM_W, 10);

  ctx.textBaseline = "alphabetic";

  /* 标题 */
  ctx.fillStyle = MUTE;
  ctx.font = "600 22px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("MBTI64 · 双人合盘", 64, 78);

  ctx.fillStyle = NAVY;
  ctx.font = "800 54px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText(report.quadrantLabel, 64, 146);

  ctx.fillStyle = INK;
  ctx.font = "500 30px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`契合度 ${report.score} · 张力 ${report.tension}`, CHEM_W - 64, 146);

  /* 两个角色插画 */
  const cardY = 190;
  const cardW = 440;
  const cardH = 520;
  const gap = (CHEM_W - 64 * 2 - cardW * 2) / 1;
  const ax = 64;
  const bx = 64 + cardW + gap;

  const [imgA, imgB] = await Promise.all([
    loadImage(withBasePath(`/assets/portraits-light/hero-1200x1600/${report.a.code}-hero-1200x1600.webp`)),
    loadImage(withBasePath(`/assets/portraits-light/hero-1200x1600/${report.b.code}-hero-1200x1600.webp`)),
  ]);

  for (const [img, x, type] of [
    [imgA, ax, report.a],
    [imgB, bx, report.b],
  ] as Array<[HTMLImageElement | null, number, (typeof report)["a"]]>) {
    ctx.save();
    roundRect(ctx, x, cardY, cardW, cardH, 20);
    ctx.fillStyle = "#F4F6FA";
    ctx.fill();
    ctx.clip();
    if (img) {
      const ratio = Math.max(cardW / img.width, cardH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, x + (cardW - w) / 2, cardY + (cardH - h) / 2, w, h);
    }
    ctx.restore();

    ctx.save();
    roundRect(ctx, x, cardY, cardW, cardH, 20);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 名字与编码
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = "700 30px system-ui, -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(type.name, x, cardY + cardH + 44);
    ctx.fillStyle = MUTE;
    ctx.font = "500 22px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(type.code, x, cardY + cardH + 78);
  }

  // 中间的「VS」
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY;
  ctx.font = "800 34px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("VS", (ax + bx + cardW) / 2, cardY + cardH / 2);

  /* 对撞波形 */
  drawCollision(ctx, report, CHEM_W / 2, cardY + cardH + 250, 165);

  /* 金句 */
  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  ctx.font = "700 30px system-ui, -apple-system, 'PingFang SC', sans-serif";
  const quoteY = cardY + cardH + 470;
  wrap(ctx, report.headline, 64, quoteY, CHEM_W - 128, 44);

  ctx.fillStyle = MUTE;
  ctx.font = "400 22px system-ui, -apple-system, 'PingFang SC', sans-serif";
  wrap(ctx, report.quadrantNote, 64, quoteY + 92, CHEM_W - 128, 32);

  /* 底部：二维码 + 文字 */
  const qr = await makeQrCanvas(input.url, 150);
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, 64, CHEM_H - 250, 150, 150, 14);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(qr, 64, CHEM_H - 250, 150, 150);

  ctx.fillStyle = NAVY;
  ctx.font = "700 30px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("测测你们的默契度", 244, CHEM_H - 210);
  ctx.fillStyle = MUTE;
  ctx.font = "400 22px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("zhubao315.github.io/mbti64/compare", 244, CHEM_H - 168);
  ctx.fillText("全部计算在你的浏览器里完成", 244, CHEM_H - 132);

  return canvas;
}

export function chemPosterDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function downloadChemPoster(canvas: HTMLCanvasElement, filename = "mbti64-chemistry.png") {
  const url = chemPosterDataUrl(canvas);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
