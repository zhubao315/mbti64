/**
 * 独立 Node.js 脚本：用 Playwright + 最小 HTTP server 渲染模式海报并保存为 PNG。
 * 用法：node scripts/render-mode-posters.mjs
 * 依赖：playwright-core、qrcode（项目已安装）
 */

import http from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import QRCode from "qrcode";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "out", "mode-posters");
mkdirSync(OUT_DIR, { recursive: true });

const PORT = 3999;

// ---- 海报规格（与 lib/poster.ts 保持一致） ----
const POSTER_W = 1080;
const POSTER_H = 1440;
const NAVY = "#0F2747";
const INK = "#172B45";
const SECONDARY = "#5A6A7E";
const MUTED = "#5B6B80";
const HAIRLINE = "#E4E9F0";
const CONTENT_X = 96;
const CONTENT_W = 888;
const FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "Inter", sans-serif';

const GROUP_META = {
  analyst: { cn: "分析师", color: "#7B61FF", text: "#5A3FD1", soft: "#E5DEFF", light: "#F1EDFF" },
  diplomat: { cn: "外交家", color: "#4CAF6B", text: "#1E6B34", soft: "#D5EFDE", light: "#EAF7EE" },
  guardian: { cn: "守护者", color: "#4A90E2", text: "#1A659F", soft: "#D6E8FB", light: "#EAF3FD" },
  adventurer: { cn: "冒险家", color: "#F6C343", text: "#7A5600", soft: "#FBE9B3", light: "#FFF7DF" },
};

// 模式预设
const MODES = [
  {
    key: "quick",
    filename: "MBTI64-mode-quick.png",
    title: "快速测评",
    questions: 60,
    duration: "约 8 分钟",
    tagline: "八分钟读懂你的六维人格",
    bullets: ["覆盖六个维度", "六维雷达 + 稀有度", "适合初次探索"],
    accent: GROUP_META.adventurer.color,
    accentSoft: GROUP_META.adventurer.soft,
    url: "https://zhubao315.github.io/mbti64/test?mode=quick",
  },
  {
    key: "full",
    filename: "MBTI64-mode-full.png",
    title: "完整测评",
    questions: 120,
    duration: "约 15–20 分钟",
    tagline: "每维 20 题，结果更稳更准",
    bullets: ["每维 20 题", "摇摆型概率更低", "深入自我探索"],
    accent: GROUP_META.analyst.color,
    accentSoft: GROUP_META.analyst.soft,
    url: "https://zhubao315.github.io/mbti64/test?mode=full",
  },
];

// ---- 先生成所有二维码 dataURL ----
console.log("📱 生成二维码...");
const modeQrs = {};
for (const mode of MODES) {
  modeQrs[mode.key] = await QRCode.toDataURL(mode.url, {
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: NAVY, light: "#FFFFFF" },
  });
  console.log(`  ✅ ${mode.key} QR 已生成`);
}

// ---- 生成内联 HTML ----
function buildHtml(mode, qrDataUrl) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>MBTI64 ${mode.key} poster</title>
<style>html,body{margin:0;padding:0;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh}canvas{box-shadow:0 20px 60px rgba(15,39,71,0.2)}</style>
</head><body>
<canvas id="poster" width="${POSTER_W}" height="${POSTER_H}"></canvas>
<script>
const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const mode = ${JSON.stringify(mode)};

// ---- helpers ----
function roundRect(x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
function hexA(hex,a){const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);const r=(n>>16)&255,g=(n>>8)&255,b=n&255;return 'rgba('+r+','+g+','+b+','+a+')';}
function trimEllipsis(text,maxW){if(ctx.measureText(text).width<=maxW)return text;let t=text;while(t.length>1&&ctx.measureText(t+'…').width>maxW)t=t.slice(0,-1);return t+'…';}
function drawLine(text,x,y,maxW,align){ctx.save();ctx.textAlign=align;ctx.fillText(trimEllipsis(text,maxW),x,y);ctx.restore();}

ctx.textBaseline = 'alphabetic';

// ---- 1. 底色渐变 ----
const bg = ctx.createLinearGradient(0,0,0,${POSTER_H});
bg.addColorStop(0,'#FFFFFF');bg.addColorStop(0.5,'#FAFBFD');bg.addColorStop(1,'#F4F7FB');
ctx.fillStyle=bg;ctx.fillRect(0,0,${POSTER_W},${POSTER_H});

// 顶部模式色条
ctx.fillStyle=mode.accent;ctx.fillRect(0,0,${POSTER_W},16);

// 光晕
const halo=ctx.createRadialGradient(${POSTER_W}/2,640,40,${POSTER_W}/2,640,380);
halo.addColorStop(0,hexA(mode.accent,0.14));halo.addColorStop(0.6,hexA(mode.accent,0.05));halo.addColorStop(1,hexA(mode.accent,0));
ctx.fillStyle=halo;ctx.beginPath();ctx.arc(${POSTER_W}/2,640,380,0,Math.PI*2);ctx.fill();

// ---- 2. 品牌头 ----
ctx.textAlign='left';
ctx.font='800 38px ${FONT_STACK}';ctx.fillStyle='${NAVY}';
ctx.fillText('MBTI64', ${CONTENT_X}, 98);

ctx.textAlign='right';
ctx.font='600 17px ${FONT_STACK}';ctx.fillStyle='${MUTED}';
ctx.fillText('64 型人格测评', ${CONTENT_X + CONTENT_W}, 98);

// ---- 3. 模式 chip + 大标题 ----
ctx.textAlign='center';

// chip
const chipText = mode.questions+' 题 · '+mode.duration;
ctx.font='700 20px ${FONT_STACK}';
const chipW = ctx.measureText(chipText).width + 60;
roundRect((${POSTER_W}-chipW)/2, 140, chipW, 48, 24);
ctx.fillStyle=mode.accentSoft;ctx.fill();
ctx.textBaseline='middle';ctx.fillStyle='${NAVY}';
ctx.fillText(chipText, ${POSTER_W}/2, 164);
ctx.textBaseline='alphabetic';

// 模式大标题
let titleSize = 78;
ctx.font='900 '+titleSize+'px ${FONT_STACK}';
while(titleSize>56 && ctx.measureText(mode.title).width>${CONTENT_W}){titleSize-=2;ctx.font='900 '+titleSize+'px ${FONT_STACK}';}
ctx.fillStyle='${NAVY}';ctx.fillText(mode.title, ${POSTER_W}/2, 278);

// 一句话钩子
ctx.font='500 26px ${FONT_STACK}';ctx.fillStyle='${SECONDARY}';
drawLine(mode.tagline, ${POSTER_W}/2, 326, ${CONTENT_W}-40, 'center');

// ---- 4. 视觉核心：六维雷达 ----
const radarCx = ${POSTER_W}/2 - 120;
const radarCy = 570;
const axes = 6;
const angleStep = (Math.PI*2)/axes;
for(let layer=1;layer<=3;layer++){
  const r = 150*layer/3;
  ctx.beginPath();
  for(let i=0;i<axes;i++){const a=-Math.PI/2+i*angleStep;const x=radarCx+r*Math.cos(a),y=radarCy+r*Math.sin(a);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.closePath();ctx.strokeStyle=hexA(mode.accent,0.14);ctx.lineWidth=1.2;ctx.stroke();
}
for(let i=0;i<axes;i++){const a=-Math.PI/2+i*angleStep;ctx.beginPath();ctx.moveTo(radarCx,radarCy);ctx.lineTo(radarCx+150*Math.cos(a),radarCy+150*Math.sin(a));ctx.strokeStyle=hexA(mode.accent,0.2);ctx.lineWidth=1;ctx.stroke();}
ctx.beginPath();
for(let i=0;i<axes;i++){const a=-Math.PI/2+i*angleStep;const x=radarCx+150*0.72*Math.cos(a),y=radarCy+150*0.72*Math.sin(a);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
ctx.closePath();ctx.fillStyle=hexA(mode.accent,0.18);ctx.fill();ctx.strokeStyle=mode.accent;ctx.lineWidth=2.5;ctx.stroke();
const DIM_NAMES=['能量','信息','决策','节奏','姿态','变化'];
ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 14px ${FONT_STACK}';ctx.fillStyle='${NAVY}';
for(let i=0;i<axes;i++){const a=-Math.PI/2+i*angleStep;const lx=radarCx+(150+28)*Math.cos(a),ly=radarCy+(150+28)*Math.sin(a);ctx.fillText(DIM_NAMES[i],lx,ly);}

// ---- 4b. 四象限族群色块 ----
const quadX = ${POSTER_W}/2 + 20;
const quadY = 450;
const groups=['analyst','diplomat','guardian','adventurer'];
const gColors={analyst:{cn:'分析师',color:'${GROUP_META.analyst.color}',text:'${GROUP_META.analyst.text}',light:'${GROUP_META.analyst.light}'},diplomat:{cn:'外交家',color:'${GROUP_META.diplomat.color}',text:'${GROUP_META.diplomat.text}',light:'${GROUP_META.diplomat.light}'},guardian:{cn:'守护者',color:'${GROUP_META.guardian.color}',text:'${GROUP_META.guardian.text}',light:'${GROUP_META.guardian.light}'},adventurer:{cn:'冒险家',color:'${GROUP_META.adventurer.color}',text:'${GROUP_META.adventurer.text}',light:'${GROUP_META.adventurer.light}'}};
groups.forEach((g,i)=>{
  const col=i%2,row=Math.floor(i/2);
  const cx=quadX+col*120,cy=quadY+row*120;
  const m=gColors[g];
  roundRect(cx+6,cy+6,108,108,14);ctx.fillStyle=m.light;ctx.fill();
  ctx.beginPath();ctx.arc(cx+30,cy+60,10,0,Math.PI*2);ctx.fillStyle=m.color;ctx.fill();
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='700 18px ${FONT_STACK}';ctx.fillStyle=m.text;
  ctx.fillText(m.cn,cx+52,cy+60);
});

// ---- 4c. 进度条 ----
const progressY=770,progressW=560,progressX=(${POSTER_W}-progressW)/2;
roundRect(progressX,progressY,progressW,24,12);ctx.fillStyle='#E8EDF5';ctx.fill();
const fillRatio = mode.key==='quick'?0.5:1.0;
const grad=ctx.createLinearGradient(progressX,0,progressX+progressW,0);
grad.addColorStop(0,mode.accent);grad.addColorStop(1,hexA(mode.accent,0.7));
roundRect(progressX,progressY,progressW*fillRatio,24,12);ctx.fillStyle=grad;ctx.fill();
ctx.font='600 15px ${FONT_STACK}';ctx.fillStyle='${MUTED}';ctx.textAlign='center';
const pLabel = mode.key==='quick'?'精简模式 · 覆盖全部六维':'完整模式 · 覆盖全部六维 × 每维 20 题';
ctx.fillText(pLabel, ${POSTER_W}/2, progressY+50);

// ---- 5. 三组卖点 ----
const labelY=900,valueY=936;
const cells=[${CONTENT_X},${CONTENT_X}+296,${CONTENT_X}+592];
const centers=cells.map(x=>x+148);
ctx.textAlign='center';ctx.font='600 15px ${FONT_STACK}';ctx.fillStyle='${MUTED}';
ctx.fillText('题量',centers[0],labelY);ctx.fillText('输出',centers[1],labelY);ctx.fillText('适合',centers[2],labelY);
ctx.font='800 22px ${FONT_STACK}';ctx.fillStyle='${NAVY}';
drawLine(mode.questions+' 题',centers[0],valueY,272,'center');
drawLine(mode.bullets[0],centers[1],valueY,272,'center');
drawLine(mode.bullets[2],centers[2],valueY,272,'center');
ctx.strokeStyle='${HAIRLINE}';ctx.lineWidth=1;
[${CONTENT_X}+296,${CONTENT_X}+592].forEach(x=>{ctx.beginPath();ctx.moveTo(x,labelY-22);ctx.lineTo(x,valueY+12);ctx.stroke();});
ctx.font='500 15px ${FONT_STACK}';ctx.fillStyle='${SECONDARY}';
drawLine(mode.bullets[1],centers[1],980,272,'center');

// ---- 6. 底部二维码区 ----
ctx.strokeStyle='${HAIRLINE}';ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(${CONTENT_X},1080);ctx.lineTo(${CONTENT_X}+${CONTENT_W},1080);ctx.stroke();

const qrBox=196,qrX=${CONTENT_X}+${CONTENT_W}-qrBox,qrY=1094;
ctx.save();ctx.shadowColor=hexA('${NAVY}',0.14);ctx.shadowBlur=20;ctx.shadowOffsetY=6;
roundRect(qrX,qrY,qrBox,qrBox,22);ctx.fillStyle='#FFFFFF';ctx.fill();ctx.restore();
ctx.strokeStyle='${HAIRLINE}';ctx.lineWidth=2;
roundRect(qrX,qrY,qrBox,qrBox,22);ctx.stroke();

// 加载真实二维码并绘制
const qrImg = new Image();
qrImg.onload = function(){
  ctx.drawImage(qrImg, qrX+(qrBox-164)/2, qrY+(qrBox-164)/2, 164, 164);
  finishPoster();
};
qrImg.src = '${qrDataUrl}';

function finishPoster(){
  // CTA 文案
  ctx.textAlign='left';ctx.font='800 32px ${FONT_STACK}';ctx.fillStyle='${NAVY}';
  ctx.fillText(mode.key==='quick'?'扫码快速测一测':'扫码开始深入探索', ${CONTENT_X}, 1156);
  ctx.font='500 18px ${FONT_STACK}';ctx.fillStyle='${SECONDARY}';
  ctx.fillText(mode.questions+' 题 · '+mode.duration+' · 免费', ${CONTENT_X}, 1194);
  ctx.font='700 20px ${FONT_STACK}';ctx.fillStyle=mode.accent;
  drawLine(mode.url.replace(/^https?:\\/\\//,''), ${CONTENT_X}, 1234, qrX-40-${CONTENT_X}, 'left');
  ctx.font='400 14px ${FONT_STACK}';ctx.fillStyle='${MUTED}';
  ctx.fillText('仅供娱乐与自我探索 · 不构成心理诊断', ${CONTENT_X}, 1270);
  document.title = 'DONE:' + mode.key;
}
</script></body></html>`;
}

// ---- HTTP server ----
const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const match = urlPath.match(/\/mode\/(quick|full)/);
  if (match) {
    const mode = MODES.find((m) => m.key === match[1]);
    if (mode) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buildHtml(mode, modeQrs[mode.key]));
      return;
    }
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, async () => {
  console.log(`🖼  HTTP server on http://localhost:${PORT}`);
  console.log(`🎨  Rendering ${MODES.length} mode posters...\n`);

  try {
    let browser;
    try {
      browser = await chromium.launch({ headless: true, channel: "msedge" });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
    const page = await browser.newPage({ viewport: { width: 1100, height: 1460 } });

    for (const mode of MODES) {
      const url = `http://localhost:${PORT}/mode/${mode.key}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.title.startsWith("DONE:"), { timeout: 15000 });

      const canvas = page.locator("canvas");
      const outPath = join(OUT_DIR, mode.filename);
      await canvas.screenshot({ path: outPath, type: "png" });

      const stats = readFileSync(outPath);
      console.log(`  ✅ ${mode.filename}  →  ${(stats.length / 1024).toFixed(1)} KB`);
    }

    await browser.close();
    console.log(`\n🎉 全部完成！输出目录：${OUT_DIR}`);
  } catch (e) {
    console.error("❌ 渲染失败：", e);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
