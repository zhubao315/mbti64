/**
 * MBTI64 · 64 张分享卡叠加文案 + 二维码
 *
 * 依赖：qrcode（npm）、rarity-core.js（ESM）、types64.ts 编译产物
 * 用法：node scripts/overlay-cards.mjs
 * 输入：out/64-cards/poster/{CODE}.png（上一轮合成的 64 张底图）
 * 输出：out/64-cards/share/{CODE}.png（叠加文案 + 二维码的最终分享卡）
 */

import http from "node:http";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import chromiumBinary from "@sparticuz/chromium";
import QRCode from "qrcode";
import { buildRarityRecords, TIER_DEFS } from "../lib/rarity-core.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHAR_DIR = "/tmp/mbti64-share/poster";
const OUT_DIR = "/tmp/mbti64-share/share";
mkdirSync(OUT_DIR, { recursive: true });

const BASE_PATH = "/mbti64";
const SITE = "https://zhubao315.github.io";

/* ---------------- 读取 types64.ts 里的 BASE_TYPES ---------------- */
const types64Src = readFileSync(join(ROOT, "data", "types64.ts"), "utf8");

const baseMap = {};
const pos = (re) => {
  const arr = [];
  let m;
  while ((m = re.exec(types64Src))) arr.push({ idx: m.index, val: m[1] });
  re.lastIndex = 0;
  return arr;
};
const baseCodes = pos(/code:\s*"([A-Z]{4})"/g);
const cns = pos(/cn:\s*"([^"]+)"/g);
const groups = pos(/group:\s*"(\w+)"/g);
const tags = pos(/tagline:\s*"([^"]+)"/g);
for (const c of baseCodes) {
  const nextCode = baseCodes.find((x) => x.idx > c.idx);
  const end = nextCode ? nextCode.idx : types64Src.length;
  const cn = cns.find((x) => x.idx > c.idx && x.idx < end);
  const gr = groups.find((x) => x.idx > c.idx && x.idx < end);
  const tg = tags.find((x) => x.idx > c.idx && x.idx < end);
  baseMap[c.val] = {
    cn: cn ? cn.val : c.val,
    group: gr ? gr.val : "analyst",
    tagline: tg ? tg.val : "",
  };
}
console.log(`📚 解析到 ${Object.keys(baseMap).length} 个 base type`);

/* ---------------- 64 个 code + 稀有度 ---------------- */
const files = readdirSync(CHAR_DIR).filter((f) => f.endsWith(".png"));
const codes = process.argv.slice(2).length ? process.argv.slice(2) : files.map((f) => f.replace(".png", "")).sort();
const { byCode } = buildRarityRecords(codes);

/* ---------------- 二维码生成 ---------------- */
const qrMap = {};
for (const code of codes) {
  const url = `${SITE}${BASE_PATH}/type/${code}`;
  qrMap[code] = await QRCode.toDataURL(url, {
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0F2747", light: "#FFFFFF" },
  });
}

/* ---------------- 页面内绘制函数 ---------------- */
const POSTER_W = 1080;
const POSTER_H = 1920;
const DRAW_JS = `
window.overlay = async function (cfg) {
  const c = document.getElementById('c');
  c.width = ${POSTER_W}; c.height = ${POSTER_H};
  const x = c.getContext('2d');

  // 字体加载：Fontsource 按 unicode-range 分片，需用全部将绘制的字符触发分片下载
  const sample = [
    cfg.code, cfg.cn, cfg.tagline, cfg.groupCn, cfg.sufCn,
    cfg.tierName, cfg.per1000, '/千', '64 型中第 ', cfg.rankLabel, ' 稀有',
    'MBTI64', '64 型人格测评', '扫一扫，测出你是哪一型',
    '120 道本土化情景题 · 免费 · 约 15 分钟', cfg.shortUrl,
    '仅供娱乐 · 不构成心理诊断', '×', '·', '，', '。', '/',
  ].join('');
  for (const w of [400, 500, 600, 700, 800, 900]) {
    await document.fonts.load(w + ' 20px "Noto Sans SC"', sample);
  }
  await document.fonts.ready;

  const logoImg = new Image();
  await new Promise((res, rej) => { logoImg.onload = res; logoImg.onerror = rej; logoImg.src = cfg.logoUrl; });

  // 1) 底图
  const bg = new Image();
  await new Promise((res, rej) => { bg.onload = res; bg.onerror = rej; bg.src = cfg.bgUrl; });
  x.drawImage(bg, 0, 0, ${POSTER_W}, ${POSTER_H});

  // 2) 底部安全区上叠：先压一层浅白过渡，让字更干净
  const bot = x.createLinearGradient(0, 1380, 0, 1760);
  bot.addColorStop(0, 'rgba(255,255,255,0)');
  bot.addColorStop(1, 'rgba(255,255,255,0.9)');
  x.fillStyle = bot; x.fillRect(0, 1380, ${POSTER_W}, 380);

  /* ---------- 3) 编码 chip ---------- */
  const chipX = 64, chipY = 96;
  x.save();
  x.font = '800 30px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  const codeW = x.measureText(cfg.code).width + 56;
  const gChip = x.createLinearGradient(chipX, 0, chipX + codeW, 0);
  gChip.addColorStop(0, cfg.pal.color);
  gChip.addColorStop(1, cfg.pal.color2);
  roundRect(x, chipX, chipY, codeW, 52, 26);
  x.fillStyle = gChip; x.fill();
  x.fillStyle = '#FFFFFF';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(cfg.code, chipX + codeW/2, chipY + 27);
  x.restore();

  /* ---------- 4) 中文名 ---------- */
  x.save();
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  let cnSize = 82;
  x.font = '900 ' + cnSize + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  while (x.measureText(cfg.cn).width > ${POSTER_W} - 128 && cnSize > 48) {
    cnSize -= 2;
    x.font = '900 ' + cnSize + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  }
  x.fillStyle = '#0F2747';
  x.fillText(cfg.cn, 64, 232);
  x.restore();

  /* ---------- 5) tagline ---------- */
  x.save();
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = '500 32px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#3E526D';
  // 两行自动换行
  const maxTW = ${POSTER_W} - 128;
  let line1 = cfg.tagline, line2 = '';
  if (x.measureText(line1).width > maxTW) {
    let t = line1;
    while (t.length > 0 && x.measureText(t).width > maxTW) t = t.slice(0, -1);
    // 尽量切在中文逗号/句号附近
    const lastP = Math.max(t.lastIndexOf('，'), t.lastIndexOf('。'), t.lastIndexOf('；'));
    if (lastP > t.length * 0.5) t = t.slice(0, lastP + 1);
    line1 = t; line2 = cfg.tagline.slice(t.length);
    if (line2.length > 26) {
      let t2 = line2;
      while (t2.length > 0 && x.measureText(t2).width > maxTW) t2 = t2.slice(0, -1);
      line2 = t2 + '…';
    }
  }
  x.fillText(line1, 64, 286);
  if (line2) x.fillText(line2, 64, 326);
  x.restore();

  /* ---------- 6) 族群 + 稀有度 chip ---------- */
  const subY = 378;
  // 族群
  x.save();
  x.font = '700 24px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  const gTxt = cfg.groupCn + ' · ' + cfg.sufCn;
  const gW = x.measureText(gTxt).width + 44;
  roundRect(x, 64, subY, gW, 42, 21);
  x.fillStyle = cfg.pal.soft; x.fill();
  x.fillStyle = cfg.pal.text;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(gTxt, 64 + gW/2, subY + 21);
  x.restore();

  // 稀有度
  const tierTxt = cfg.tierName + ' · ' + cfg.per1000 + '/千';
  x.save();
  x.font = '700 24px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  const tW = x.measureText(tierTxt).width + 44;
  const tX = ${POSTER_W} - 64 - tW;
  roundRect(x, tX, subY, tW, 42, 21);
  x.fillStyle = '#F1F5FB'; x.fill();
  x.fillStyle = '#2E4769';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(tierTxt, tX + tW/2, subY + 21);
  x.restore();

  // 排名小字
  x.save();
  x.textAlign = 'right'; x.textBaseline = 'alphabetic';
  x.font = '500 24px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#6E829F';
  x.fillText('64 型中第 ' + cfg.rankLabel + ' 稀有', ${POSTER_W} - 64, subY + 78);
  x.restore();

  /* ---------- 7) 底部分割线 ---------- */
  x.strokeStyle = '#DCE3EC'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(64, 1460); x.lineTo(${POSTER_W} - 64, 1460); x.stroke();

  /* ---------- 8) 品牌头 ---------- */
  x.save();
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  // 网站品牌 logo（与站内 BrandLogo 同源）
  x.drawImage(logoImg, 64, 1476, 60, 60);
  // MBTI64
  x.font = '900 48px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#0F2747';
  x.fillText('MBTI64', 136, 1528);
  x.restore();

  // 副标签
  x.save();
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = '600 24px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#5A6E87';
  x.fillText('64 型人格测评', 136, 1568);
  x.restore();

  // 入口提示
  x.save();
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = '800 32px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#0F2747';
  x.fillText('扫一扫，测出你是哪一型', 64, 1656);
  x.font = '500 24px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#6E829F';
  x.fillText('120 道本土化情景题 · 免费 · 约 15 分钟', 64, 1696);
  x.restore();

  /* ---------- 9) 二维码 ---------- */
  const qrX = ${POSTER_W} - 64 - 210;
  const qrY = 1542;
  const qrBox = 210;
  x.save();
  x.shadowColor = 'rgba(15,39,71,0.12)'; x.shadowBlur = 18; x.shadowOffsetY = 4;
  roundRect(x, qrX, qrY, qrBox, qrBox, 22);
  x.fillStyle = '#FFFFFF'; x.fill();
  x.restore();
  x.strokeStyle = '#DCE3EC'; x.lineWidth = 2;
  roundRect(x, qrX, qrY, qrBox, qrBox, 22); x.stroke();
  const qrImg = new Image();
  await new Promise((res, rej) => { qrImg.onload = res; qrImg.onerror = rej; qrImg.src = cfg.qrUrl; });
  x.drawImage(qrImg, qrX + (qrBox - 164)/2, qrY + (qrBox - 164)/2, 164, 164);

  // QR 下方 URL
  x.save();
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = '600 20px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = cfg.pal.text;
  x.fillText(cfg.shortUrl, ${POSTER_W}/2, 1782);
  x.font = '400 15px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  x.fillStyle = '#97A7BE';
  x.fillText('仅供娱乐 · 不构成心理诊断', ${POSTER_W}/2, 1812);
  x.restore();

  return c.toDataURL('image/png');
};
function roundRect(x,xp,yp,w,h,r){const rr=Math.min(r,w/2,h/2);x.beginPath();x.moveTo(xp+rr,yp);x.arcTo(xp+w,yp,xp+w,yp+h,rr);x.arcTo(xp+w,yp+h,xp,yp+h,rr);x.arcTo(xp,yp+h,xp,yp,rr);x.arcTo(xp,yp,xp+w,yp,rr);x.closePath();}`;

/* ---------------- HTTP 服务 ---------------- */
const bgCache = new Map();
const loadBg = (code) => {
  if (!bgCache.has(code)) {
    const buf = readFileSync(join(CHAR_DIR, `${code}.png`));
    bgCache.set(code, `data:image/png;base64,${buf.toString("base64")}`);
  }
  return bgCache.get(code);
};

const GROUP_META = {
  analyst:  { cn: "分析师", color: "#7B61FF", color2: "#5A3FD1", text: "#5A3FD1", soft: "#EDE8FF" },
  diplomat: { cn: "外交家", color: "#4CAF6B", color2: "#1E6B34", text: "#1E6B34", soft: "#E6F7EC" },
  guardian: { cn: "守护者", color: "#4A90E2", color2: "#1A659F", text: "#1A659F", soft: "#E8F1FC" },
  adventurer:{ cn: "冒险家", color: "#F6C343", color2: "#7A5600", text: "#7A5600", soft: "#FFF4DC" },
};

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8">
      <link rel="stylesheet" href="/font-400.css">
      <link rel="stylesheet" href="/font-500.css">
      <link rel="stylesheet" href="/font-600.css">
      <link rel="stylesheet" href="/font-700.css">
      <link rel="stylesheet" href="/font-800.css">
      <link rel="stylesheet" href="/font-900.css">
      <body><canvas id="c" width="${POSTER_W}" height="${POSTER_H}"></canvas><script>${DRAW_JS}</script></body>`);
    return;
  }
  if (req.url === '/logo-icon.svg') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end(readFileSync(join(ROOT, 'public', 'assets', 'brand', 'logo-icon.svg')));
    return;
  }
  if (req.url.startsWith('/font-') && req.url.endsWith('.css')) {
    const f = join(ROOT, 'node_modules', '@fontsource', 'noto-sans-sc', req.url.replace('/font-', ''));
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end(readFileSync(f));
    return;
  }
  if (req.url.startsWith('/files/')) {
    const f = join(ROOT, 'node_modules', '@fontsource', 'noto-sans-sc', req.url);
    res.writeHead(200, { 'Content-Type': 'font/woff2' });
    res.end(readFileSync(f));
    return;
  }
  res.writeHead(404); res.end("nf");
});

// 后缀中文名
const SUFFIX_CN = { A: "坚定型", C: "审慎型", O: "求新型", H: "守成型" };

const PORT = 3987;
server.listen(PORT, async () => {
  console.log(`🖌 叠加 ${codes.length} 张分享卡文案 + 二维码…\n`);

  let browser;
  const exePath = await chromiumBinary.executablePath();
  browser = await chromium.launch({ headless: true, executablePath: exePath, args: chromiumBinary.args });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
  await page.waitForFunction(() => typeof window.overlay === "function");

  for (const code of codes) {
    const [base, a, b] = code.split("-");
    const bt = baseMap[base] || { cn: code, group: "analyst", tagline: "" };
    const group = bt.group;
    const pal = GROUP_META[group];
    const rar = byCode[code];
    const tier = rar ? TIER_DEFS[rar.tierIndex] : { name: "" };

    const cfg = {
      code,
      cn: bt.cn,
      groupCn: pal.cn,
      sufCn: `${SUFFIX_CN[a]} × ${SUFFIX_CN[b]}`,
      tagline: bt.tagline,
      pal,
      tierName: tier.name,
      per1000: rar ? rar.per1000.toFixed(1) : "--",
      rankLabel: rar ? rar.rankLabel : "--",
      logoUrl: '/logo-icon.svg',
      qrUrl: qrMap[code],
      shortUrl: `${SITE.replace("https://", "")}${BASE_PATH}/type/${code}`,
      bgUrl: loadBg(code),
    };
    const dataUrl = await page.evaluate(async (c) => window.overlay(c), cfg);
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    const out = join(OUT_DIR, `${code}.png`);
    writeFileSync(out, buf);
    console.log(`  ✅ ${code.padEnd(10)} ${bt.cn.padEnd(10)} ${pal.cn} · ${tier.name} ${cfg.per1000}/千  ${(buf.length/1024).toFixed(0)}KB`);
  }

  await browser.close();
  server.close();
  console.log(`\n🎉 完成！输出目录：out/64-cards/share/`);
});
