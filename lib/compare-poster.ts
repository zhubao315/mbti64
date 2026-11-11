import { DIMS, DIM_ORDER } from "@/data/schema";
import { withBasePath } from "@/lib/site";
import { makeQrCanvas } from "@/lib/poster";
import chemArt from "@/data/chem-art.json";
import type { ChemistryReport } from "@/lib/chemistry";

/**
 * 双人合盘分享卡（Canvas 1080×1440）
 *
 * 版面（自上而下）：
 *   0    –10    顶部渐变色带
 *   26   –166   象限徽记（Qwen-Image-2.1 生成，右上角）
 *   64   –190   标题区：eyebrow / 象限名 / 契合度·张力
 *   210  –700   左右两个角色肖像卡（440×490）+ 中间 VS
 *   730  –1070  六维对撞波形（雷达）
 *   1090 –1180  核心金句
 *   1190 –1260  象限说明
 *   1260 –1400  二维码 + 引导语
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

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99,
): number {
  const chars = Array.from(text);
  let line = "";
  let cy = y;
  let lines = 0;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines + 1 >= maxLines) {
        ctx.fillText(line + "…", x, cy);
        return cy + lineHeight;
      }
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
      lines += 1;
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

/**
 * 六维对撞图。
 *
 * 【为什么不是普通雷达】
 * 两人若都只有编码（没有真实答题读数），每一维都是「站在自己那一极」，
 * 传统雷达画出来两人都是同一个满格六边形，完全看不出关系。
 *
 * 这里改成「六条轴 + 每条轴两个点」：
 *   每条轴是一条穿过圆心的线，两端是这一维的两个极（如 E ←→ I）。
 *   A 与 B 各是一个点，点落在轴的哪一侧由他们的极决定，
 *   离圆心的距离由倾向强度决定。
 * 于是同侧时两个点挤在同一端，对撞时分别落在两端 —— 一眼分得清撞还是合。
 */
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

  // 同心参考圆
  for (const frac of [0.5, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * frac, 0, Math.PI * 2);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const dots: Array<{ x: number; y: number; color: string }> = [];

  for (let i = 0; i < n; i += 1) {
    const row = report.dims[i];
    const meta = DIMS[DIM_ORDER[i]];
    const a = angleOf(i);
    const ux = Math.cos(a);
    const uy = Math.sin(a);

    // 轴：poleA 在 +方向，poleB 在 −方向
    ctx.beginPath();
    ctx.moveTo(cx - ux * radius, cy - uy * radius);
    ctx.lineTo(cx + ux * radius, cy + uy * radius);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 两端的极字母：放在圆内侧（数据点之外），避免与外侧的维度名抢同一条射线
    ctx.fillStyle = MUTE;
    ctx.font = "500 16px system-ui, -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.poleA, cx + ux * (radius - 30), cy + uy * (radius - 30));
    ctx.fillText(meta.poleB, cx - ux * (radius - 30), cy - uy * (radius - 30));

    // 维度名（放在轴的外侧，圆外一点点）
    ctx.fillStyle = MUTE;
    ctx.font = "500 18px system-ui, -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(
      meta.name.replace(/（.*）/, ""),
      cx + ux * (radius + 26),
      cy + uy * (radius + 26),
    );

    // A / B 的点：正负号表示站在哪一极，强度决定离圆心多远
    const signA = row.aPole === meta.poleA ? 1 : -1;
    const signB = row.bPole === meta.poleA ? 1 : -1;
    const rA = (signA * row.aStrength * radius) / 100;
    const rB = (signB * row.bStrength * radius) / 100;

    // 同侧且几乎重合时错开一点
    let offA = 0;
    let offB = 0;
    if (signA === signB && Math.abs(rA - rB) < radius * 0.06) {
      offA = -radius * 0.02;
      offB = radius * 0.02;
    }

    dots.push({ x: cx + ux * (rA + offA), y: cy + uy * (rA + offA), color: "#4A90E2" });
    dots.push({ x: cx + ux * (rB + offB), y: cy + uy * (rB + offB), color: "#C97A2B" });
  }

  // 先画连线（把同一人的六个点连起来），再画点
  const linkPath = (color: string) => {
    ctx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const row = report.dims[i];
      const meta = DIMS[DIM_ORDER[i]];
      const a = angleOf(i);
      const sign = row.aPole === meta.poleA ? 1 : -1;
      const r = (sign * row.aStrength * radius) / 100;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  linkPath("rgba(74,144,226,0.55)");
  linkPath("rgba(201,122,43,0.55)");

  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

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

  const grad = ctx.createLinearGradient(0, 0, CHEM_W, 0);
  grad.addColorStop(0, "#4A90E2");
  grad.addColorStop(1, "#C97A2B");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CHEM_W, 10);

  ctx.textBaseline = "alphabetic";

  /* ---------- 象限徽记（右上角） ---------- */
  const emblem = chemArt.art[report.quadrant];
  const emblemSize = 140;
  const emblemX = CHEM_W - 64 - emblemSize;
  const emblemY = 26;
  const emblemImg = await loadImage(withBasePath(emblem.file));
  ctx.save();
  roundRect(ctx, emblemX, emblemY, emblemSize, emblemSize, 18);
  ctx.fillStyle = "#F4F6FA";
  ctx.fill();
  ctx.clip();
  if (emblemImg) {
    // contain 贴合：徽记裁过白边后是宽幅，直接拉伸会变形
    const ratio = Math.min(emblemSize / emblemImg.width, emblemSize / emblemImg.height);
    const w = emblemImg.width * ratio;
    const h = emblemImg.height * ratio;
    ctx.drawImage(emblemImg, emblemX + (emblemSize - w) / 2, emblemY + (emblemSize - h) / 2, w, h);
  }
  ctx.restore();
  ctx.save();
  roundRect(ctx, emblemX, emblemY, emblemSize, emblemSize, 18);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  /* ---------- 标题区 ---------- */
  ctx.textAlign = "left";
  ctx.fillStyle = MUTE;
  ctx.font = "600 22px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("MBTI64 · 双人合盘", 64, 68);

  ctx.fillStyle = NAVY;
  ctx.font = "800 44px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText(report.quadrantLabel, 64, 128);

  ctx.fillStyle = INK;
  ctx.font = "600 24px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText(`契合度 ${report.score} · 张力 ${report.tension}`, 64, 168);

  /* ---------- 两个角色肖像 ---------- */
  const cardY = 210;
  const cardW = 440;
  const cardH = 430;
  const ax = 64;
  const bx = CHEM_W - 64 - cardW;

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

    // A / B 角标：和图上蓝点（A）、橙点（B）一一对应
    ctx.beginPath();
    ctx.arc(x + 26, cardY + 26, 19, 0, Math.PI * 2);
    ctx.fillStyle = x === ax ? "#4A90E2" : "#C97A2B";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 19px system-ui, -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(x === ax ? "A" : "B", x + 26, cardY + 27);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK;
    ctx.font = "700 28px system-ui, -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(type.name, x, cardY + cardH + 40);
    ctx.fillStyle = MUTE;
    ctx.font = "500 20px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(type.code, x, cardY + cardH + 70);
  }

  // 中间的 VS
  const vsX = (ax + cardW + bx) / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY;
  ctx.font = "800 32px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("VS", vsX, cardY + cardH / 2);

  /* ---------- 六维对撞图 ---------- */
  drawCollision(ctx, report, CHEM_W / 2, 908, 118);

  /* ---------- 金句与说明 ---------- */
  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  ctx.font = "700 28px system-ui, -apple-system, 'PingFang SC', sans-serif";
  wrap(ctx, report.headline, 64, 1118, CHEM_W - 128, 40, 2);

  ctx.fillStyle = MUTE;
  ctx.font = "400 20px system-ui, -apple-system, 'PingFang SC', sans-serif";
  wrap(ctx, report.quadrantNote, 64, 1198, CHEM_W - 128, 30, 2);

  /* ---------- 二维码 ---------- */
  const qrSize = 130;
  const qrY = 1268;
  const qr = await makeQrCanvas(input.url, qrSize);
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, 64, qrY, qrSize, qrSize, 14);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(qr, 64, qrY, qrSize, qrSize);

  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  ctx.font = "700 28px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("测测你们的默契度", 224, qrY + 48);
  ctx.fillStyle = MUTE;
  ctx.font = "400 20px system-ui, -apple-system, 'PingFang SC', sans-serif";
  ctx.fillText("zhubao315.github.io/mbti64/compare", 224, qrY + 86);
  ctx.fillText("全部计算在你的浏览器里完成", 224, qrY + 116);

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
