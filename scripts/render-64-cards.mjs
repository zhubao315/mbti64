/**
 * MBTI64 · 64 张人格引流分享卡 —— 合成式生成
 *
 * 为什么合成而不是纯文生图：
 *   约束 1 要求「角色外形姿态服饰完全保留、不重绘人物」。
 *   文生图无法保证这一点（实测会被模型重绘成别的角色）。
 *   因此：角色层 = 项目中固定的 1200×1600 hero 素材（像素级不变）；
 *        背景层 = Canvas 程序化绘制的族群光效（可直接改参数重跑）。
 *
 * 输出：out/64-cards/poster/{CODE}.png  1080×1920（9:16）
 *       out/64-cards/prompts.json        每张的完整提示词（基础词+族群词+后缀词）
 *
 * 用法：node scripts/render-64-cards.mjs
 */

import http from "node:http";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHAR_DIR = join(ROOT, "public", "assets", "portraits-light", "hero-1200x1600");
const OUT_DIR = join(ROOT, "out", "64-cards", "poster");
mkdirSync(OUT_DIR, { recursive: true });

const W = 1080;
const H = 1920;

/* ---------------- 用户给定的提示词（原样记录） ---------------- */

const BASE_PROMPT = `9:16竖版朋友圈小红书引流海报底图，干净极简，优先浅白极淡径向柔光渐变背景，中心亮、四周微微收暗，聚焦主体。
以参考图里固定的lowpoly低多边形人物角色为基准，严格保留人物原有造型、姿态、服饰、五官，不重新绘制、不改动人物本身；移除包裹人物的白色圆角方框，人物放大放在画面中上C位，视觉突出。
围绕人物生成匹配该人格特质的几何三角碎晶、光粒与流动光效，光影层次丰富，有氛围感与视觉震撼力，高级通透，抓人眼球，容易激发用户保存、转发分享的欲望。
画面上方、下方预留充足规整空白安全区域，后期用来叠加标题、slogan、人格解读、稀有度标签、二维码；本图不绘制任何文字、logo、二维码。
8K，高细节，干净高级，系列统一感强，商业传播质感。`;

const NEGATIVE_PROMPT = `修改人物样貌、改动姿势、更换角色，白色圆角卡片框，厚重边框，脏阴影，杂乱背景，噪点，拥挤元素，自动生成文字、标题、二维码、水印，写实照片，厚涂绘画，Q版变形`;

/* ---------------- 族群 / 后缀 词库 ---------------- */

const GROUPS = {
  analyst: {
    label: "NT · 分析师",
    palette: { main: "#7B61FF", deep: "#4B32C3", light: "#EDE8FF", shards: ["#9F87FF", "#6B4FF0", "#C9BAFF", "#FFFFFF"] },
    add: "族群光效（NT · 分析师）：人物背后浮现半透明靛紫六边网格与斜向光束，四周悬浮大小不一的紫蓝三角碎晶，晶体保持低多边形棱面反光，整体偏冷、理性、系统感。",
  },
  diplomat: {
    label: "NF · 外交家",
    palette: { main: "#3FA56A", deep: "#1E6B34", light: "#E6F7EC", shards: ["#6FD091", "#3FA56A", "#B4E4C6", "#FFFFFF"] },
    add: "族群光效（NF · 外交家）：人物背后舒展两片半透明翠绿翼状光弧，四周有缓慢上升的绿色光粒与瓣状光斑，光感柔和有机，整体温暖、包容、生长感。",
  },
  guardian: {
    label: "SJ · 守护者",
    palette: { main: "#3C7FD1", deep: "#1A4E8F", light: "#E8F1FC", shards: ["#6BA6E8", "#3C7FD1", "#BFD9F5", "#FFFFFF"] },
    add: "族群光效（SJ · 守护者）：人物脚下铺开规整的钢蓝色光点阵列，头顶有一道稳定的弧形光盾，光粒按行列排布不散乱，整体稳固、有边界、可靠。",
  },
  adventurer: {
    label: "SP · 冒险家",
    palette: { main: "#EFA11B", deep: "#9A5B00", light: "#FFF4DC", shards: ["#FFC94D", "#F0902A", "#FFE0A8", "#FFFFFF"] },
    add: "族群光效（SP · 冒险家）：金橙色流动光斑沿人物作螺旋上升，背景斜向划过一道琥珀光带，指尖附近有跳跃式火花光粒，整体鲜活、有动能、下一秒就要动起来。",
  },
};

const SUFFIX = {
  A: "后缀氛围（A 坚定型）：光束凝聚、边缘锐利，碎晶呈放射状规整排列，粒子集中于人物上半身，光效不散。",
  C: "后缀氛围（C 审慎型）：光效向内收敛，人物背后光晕略强于前方，碎晶近半为半透明，整体覆一层柔雾边缘。",
  O: "后缀氛围（O 求新型）：光迹蜿蜒、碎晶大小不一四散，有斜向光束打破对称，少量粒子跳出画面边界，构图留一点未完成感。",
  H: "后缀氛围（H 守成型）：光效围成闭合弧形，碎晶与光粒呈同心圆 / 方形阵列层层收束，画面完全对称闭合，稳定收拢。",
};

/* ---------------- 收集 64 个 code ---------------- */

const files = readdirSync(CHAR_DIR).filter((f) => f.endsWith(".webp"));
const codes = files.map((f) => f.replace("-hero-1200x1600.webp", "")).sort();
if (codes.length !== 64) console.warn(`⚠️ 期望 64 个角色素材，实际 ${codes.length}`);

const groupOf = (code) => {
  const base = code.split("-")[0];
  const [t, s] = [base[0], base[1]];
  if (t === "I" || t === "E") {
    if (s === "N") return t === "I" || t === "E" ? (base[2] === "T" ? "analyst" : "diplomat") : "analyst";
  }
  // 更直观：N→(T?analyst:diplomat)，S→(J?guardian:P?adventurer)
  if (s === "N") return base[2] === "T" ? "analyst" : "diplomat";
  return base[3] === "J" ? "guardian" : "adventurer";
};

/* ---------------- 页面内绘制函数（序列化为字符串注入浏览器） ---------------- */

const DRAW_FN = `
window.renderCard = async function (cfg) {
  const W = cfg.W, H = cfg.H;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  // 确定性随机
  let seed = cfg.seed;
  function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  const R = (a,b) => a + rnd()*(b-a);
  const hexA = (hex, a) => { const h = hex.replace('#',''); const n = parseInt(h,16); const r=(n>>16)&255,g=(n>>8)&255,b=n&255; return 'rgba('+r+','+g+','+b+','+a+')'; };

  /* ---------- 1. 底色：浅白径向柔光 ---------- */
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFFFFF');
  bg.addColorStop(0.45, '#FBFCFE');
  bg.addColorStop(1, '#F2F5FA');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);

  // 中央主光
  const halo = x.createRadialGradient(W/2, H*0.47, 30, W/2, H*0.47, W*0.72);
  halo.addColorStop(0, hexA(cfg.pal.light, 0.55));
  halo.addColorStop(0.42, hexA(cfg.pal.main, 0.10));
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = halo; x.fillRect(0, 0, W, H);

  /* ---------- 2. 族群结构层 ---------- */
  const cx = W/2, cy = H*0.47;

  if (cfg.group === 'analyst') {
    // 六边网格
    const s = 74;
    x.strokeStyle = hexA(cfg.pal.main, 0.09); x.lineWidth = 1;
    for (let row = -1; row < H/(s*1.5)+2; row++) {
      for (let col = -1; col < W/(s*1.732)+2; col++) {
        const px = col*s*1.732 + (row%2 ? s*0.866 : 0);
        const py = row*s*1.5;
        x.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI/180*(60*i - 30);
          const vx = px + s*Math.cos(a), vy = py + s*Math.sin(a);
          i ? x.lineTo(vx, vy) : x.moveTo(vx, vy);
        }
        x.closePath(); x.stroke();
      }
    }
    // 斜向光束（锥形，只在人物区，避免拉出长条拖影）
    const nBeam = cfg.sufA === 'A' ? 2 : 1;
    x.save();
    x.beginPath();
    x.ellipse(cx, cy, W*0.62, H*0.30, 0, 0, Math.PI*2);
    x.clip();
    for (let i = 0; i < nBeam; i++) {
      const bx = cx + R(-300, 300);
      const by = R(300, 620);
      const g2 = x.createLinearGradient(bx, by, bx + R(-180, 180), by + R(520, 780));
      g2.addColorStop(0, hexA(cfg.pal.main, cfg.sufA === 'A' ? 0.18 : 0.11));
      g2.addColorStop(1, hexA(cfg.pal.main, 0));
      x.beginPath();
      x.moveTo(bx, by);
      x.lineTo(bx + R(-120, 120) + 26, by + 700);
      x.lineTo(bx + R(-120, 120) - 26, by + 700);
      x.closePath();
      x.fillStyle = g2; x.fill();
    }
    x.restore();
  }

  if (cfg.group === 'diplomat') {
    // 翼状光弧
    for (const dir of [-1, 1]) {
      x.save();
      x.translate(cx, cy + 40);
      x.scale(dir, 1);
      const g3 = x.createRadialGradient(40, -90, 10, 40, -90, 460);
      g3.addColorStop(0, hexA(cfg.pal.main, cfg.sufA === 'A' ? 0.30 : 0.22));
      g3.addColorStop(0.5, hexA(cfg.pal.main, 0.10));
      g3.addColorStop(1, 'rgba(255,255,255,0)');
      x.beginPath();
      x.ellipse(190, -120, 420, 300, -0.5, 0, Math.PI*2);
      x.fillStyle = g3; x.fill();
      x.restore();
    }
  }

  if (cfg.group === 'guardian') {
    // 光点阵列矩阵（脚下）
    for (let r = 0; r < 12; r++) {
      for (let q = 0; q < 22; q++) {
        const px = 70 + q*44 + (r%2 ? 22 : 0);
        const py = H*0.74 + r*26;
        if (py > H*0.95) continue;
        const d = Math.abs(px - cx) / (W/2);
        const a = Math.max(0, 0.30 - d*0.28) * (cfg.sufB === 'H' ? 1 : 0.8);
        x.beginPath(); x.arc(px, py, 2.4, 0, Math.PI*2);
        x.fillStyle = hexA(cfg.pal.main, a); x.fill();
      }
    }
    // 头顶光盾弧
    x.save();
    x.beginPath();
    x.arc(cx, cy + 300, 330, Math.PI*1.12, Math.PI*1.88);
    x.strokeStyle = hexA(cfg.pal.main, 0.28);
    x.lineWidth = 6; x.stroke();
    x.beginPath();
    x.arc(cx, cy + 300, 372, Math.PI*1.12, Math.PI*1.88);
    x.strokeStyle = hexA(cfg.pal.main, 0.14);
    x.lineWidth = 3; x.stroke();
    x.restore();
  }

  if (cfg.group === 'adventurer') {
    // 螺旋光斑
    for (let i = 0; i < 34; i++) {
      const t = R(0, 1);
      const ang = t*Math.PI*4 + R(-0.2, 0.2);
      const rad = 90 + t*470;
      const px = cx + Math.cos(ang)*rad*0.62;
      const py = cy + 120 - t*760;
      const rr = R(8, 34);
      const g4 = x.createRadialGradient(px, py, 0, px, py, rr);
      g4.addColorStop(0, hexA(cfg.pal.main, 0.22));
      g4.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g4; x.beginPath(); x.arc(px, py, rr, 0, Math.PI*2); x.fill();
    }
    // 斜向琥珀光带
    x.save();
    x.translate(cx, H*0.5); x.rotate(-0.42);
    const g5 = x.createLinearGradient(-600, 0, 600, 0);
    g5.addColorStop(0, hexA(cfg.pal.main, 0));
    g5.addColorStop(0.5, hexA(cfg.pal.main, 0.16));
    g5.addColorStop(1, hexA(cfg.pal.main, 0));
    x.fillStyle = g5; x.fillRect(-700, -70, 1400, 140);
    x.restore();
  }

  /* ---------- 3. 后缀结构层 ---------- */
  if (cfg.sufB === 'H') {
    // 闭合同心环
    for (let i = 1; i <= 4; i++) {
      x.beginPath();
      x.ellipse(cx, cy + 60, 170 + i*92, 120 + i*78, 0, 0, Math.PI*2);
      x.strokeStyle = hexA(cfg.pal.main, 0.13 - i*0.02);
      x.lineWidth = 2; x.stroke();
    }
  }

  /* ---------- 4. 三角碎晶 ---------- */
  const nShard = cfg.group === 'analyst' ? 34 : cfg.group === 'guardian' ? 20 : 30;
  const spread = cfg.sufB === 'O' ? 1.42 : cfg.sufB === 'H' ? 0.86 : 1.0;
  for (let i = 0; i < nShard; i++) {
    const ang = R(0, Math.PI*2);
    const dist = pow2(R(0.32, 1)) * 460 * spread;
    const px = cx + Math.cos(ang)*dist*1.15;
    const py = cy + 40 + Math.sin(ang)*dist*0.86;
    if (py < 190 || py > H - 140) continue;
    const sz = R(10, 46) * (cfg.sufA === 'A' ? 1.08 : 1);
    const rot = R(0, Math.PI*2);
    const col = cfg.pal.shards[(i + (cfg.seed & 3)) % cfg.pal.shards.length];
    const alpha = cfg.sufA === 'C' ? R(0.16, 0.42) : R(0.26, 0.72);

    x.save(); x.translate(px, py); x.rotate(rot);
    x.beginPath();
    x.moveTo(0, -sz);
    x.lineTo(sz*0.86, sz*0.5);
    x.lineTo(-sz*0.86, sz*0.5);
    x.closePath();
    const gs = x.createLinearGradient(0, -sz, 0, sz*0.5);
    gs.addColorStop(0, hexA(col, Math.min(1, alpha + 0.18)) );
    gs.addColorStop(1, hexA(col, alpha*0.35));
    x.fillStyle = gs; x.fill();
    x.strokeStyle = hexA(col, Math.min(1, alpha + 0.2));
    x.lineWidth = 0.9; x.stroke();
    x.restore();
  }

  // 碎晶散点（A 型集中在上半身）
  for (let i = 0; i < 60; i++) {
    const px = R(40, W-40);
    const py = cfg.sufA === 'A' ? R(200, H*0.62) : R(180, H*0.86);
    x.beginPath(); x.arc(px, py, R(0.8, 2.6), 0, Math.PI*2);
    x.fillStyle = hexA(cfg.pal.main, R(0.12, 0.45)); x.fill();
  }

  /* ---------- 5. 角色层（抠白底后放大） ---------- */
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = cfg.charUrl; });

  const off = document.createElement('canvas');
  off.width = img.naturalWidth; off.height = img.naturalHeight;
  const ox = off.getContext('2d');
  ox.drawImage(img, 0, 0);

  // 从四边泛洪抠掉与边缘连通的近白背景，保留角色内部白色服饰
  const iw = off.width, ih = off.height;
  const data = ox.getImageData(0, 0, iw, ih);
  const d = data.data;
  const isWhite = (i) => d[i] >= 238 && d[i+1] >= 238 && d[i+2] >= 238 && (Math.max(d[i],d[i+1],d[i+2]) - Math.min(d[i],d[i+1],d[i+2])) < 14;
  const seen = new Uint8Array(iw*ih);
  const stack = [];
  for (let px = 0; px < iw; px++) { stack.push(px, (ih-1)*iw + px); }
  for (let py = 0; py < ih; py++) { stack.push(py*iw, py*iw + iw-1); }
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p*4;
    if (!isWhite(i)) continue;
    d[i+3] = 0;
    const px = p % iw, py = (p - px) / iw;
    if (px > 0) stack.push(p-1);
    if (px < iw-1) stack.push(p+1);
    if (py > 0) stack.push(p-iw);
    if (py < ih-1) stack.push(p+iw);
  }
  ox.putImageData(data, 0, 0);

  // 按实际像素裁掉四周留白，统一放大到固定高度，保证 64 张人物视觉占比一致
  let minX = iw, minY = ih, maxX = 0, maxY = 0;
  for (let py = 0; py < ih; py++) {
    for (let px = 0; px < iw; px++) {
      if (d[(py*iw + px)*4 + 3] > 12) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }
  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  const scale = cfg.figH / bh;

  let figW = bw * scale;
  let figH = bh * scale;
  const maxW = W * 0.94;
  if (figW > maxW) { const k = maxW / figW; figW *= k; figH *= k; }
  const figX = cx - figW/2;
  const figY = cfg.figY;

  // 脚下柔光（代替脏阴影）
  const fg = x.createRadialGradient(cx, figY + figH*0.96, 10, cx, figY + figH*0.96, Math.max(figW*0.5, 220));
  fg.addColorStop(0, hexA(cfg.pal.main, 0.16));
  fg.addColorStop(1, 'rgba(255,255,255,0)');
  x.save(); x.translate(cx, figY + figH*0.96); x.scale(1, 0.32);
  x.fillStyle = fg; x.beginPath(); x.arc(0, 0, Math.max(figW*0.5, 220), 0, Math.PI*2); x.fill();
  x.restore();

  x.drawImage(off, minX, minY, bw, bh, figX, figY, figW, figH);

  /* ---------- 6. 安全区：上下压白，保证叠字干净 ---------- */
  const top = x.createLinearGradient(0, 0, 0, 300);
  top.addColorStop(0, 'rgba(255,255,255,0.96)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = top; x.fillRect(0, 0, W, 300);

  const bot = x.createLinearGradient(0, H-420, 0, H);
  bot.addColorStop(0, 'rgba(255,255,255,0)');
  bot.addColorStop(1, 'rgba(255,255,255,0.97)');
  x.fillStyle = bot; x.fillRect(0, H-420, W, 420);

  /* ---------- 7. 暗角 ---------- */
  const vig = x.createRadialGradient(W/2, H/2, W*0.36, W/2, H/2, W*0.86);
  vig.addColorStop(0, 'rgba(255,255,255,0)');
  vig.addColorStop(1, hexA(cfg.pal.deep, cfg.sufA === 'C' ? 0.10 : 0.07));
  x.fillStyle = vig; x.fillRect(0, 0, W, H);

  return c.toDataURL('image/png');
};
function pow2(v){ return v*v; }
`;

/* ---------------- HTTP 服务 ---------------- */

const charCache = new Map();
const loadChar = (code) => {
  if (!charCache.has(code)) {
    const buf = readFileSync(join(CHAR_DIR, `${code}-hero-1200x1600.webp`));
    charCache.set(code, `data:image/webp;base64,${buf.toString("base64")}`);
  }
  return charCache.get(code);
};

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><body style="margin:0">
      <canvas id="c" width="${W}" height="${H}"></canvas>
      <script>${DRAW_FN}</script></body>`);
    return;
  }
  res.writeHead(404); res.end("nf");
});

const PORT = 3988;

server.listen(PORT, async () => {
  console.log(`🎨 开始合成 ${codes.length} 张 1080×1920 分享卡…\n`);

  let browser;
  try { browser = await chromium.launch({ headless: true, channel: "msedge" }); }
  catch { browser = await chromium.launch({ headless: true }); }

  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
  await page.waitForFunction(() => typeof window.renderCard === "function");

  const records = [];

  for (const code of codes) {
    const [base, sufA, sufB] = code.split("-");
    const group = groupOf(code);
    const g = GROUPS[group];
    let hash = 0;
    for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;

    const cfg = {
      W, H,
      group,
      sufA, sufB,
      pal: g.palette,
      seed: hash,
      charUrl: loadChar(code),
      figH: 1120,
      figY: 280,
    };

    const dataUrl = await page.evaluate(async (c) => window.renderCard(c), cfg);
    const b64 = dataUrl.split(",")[1];
    const outPath = join(OUT_DIR, `${code}.png`);
    writeFileSync(outPath, Buffer.from(b64, "base64"));
    console.log(`  ✅ ${code.padEnd(10)} ${g.label.padEnd(10)} ${readFileSync(outPath).length/1024} KB`);

    records.push({
      code,
      baseCode: base,
      group,
      groupLabel: g.label,
      suffixA: sufA,
      suffixB: sufB,
      output: `out/64-cards/poster/${code}.png`,
      characterRef: `public/assets/portraits-light/hero-1200x1600/${code}-hero-1200x1600.webp`,
      canvas: `${W}x${H}`,
      palette: g.palette,
      basePrompt: BASE_PROMPT,
      groupPrompt: g.add,
      suffixPrompt: `${SUFFIX[sufA]}\n${SUFFIX[sufB]}`,
      negativePrompt: NEGATIVE_PROMPT,
      fullPrompt: `${BASE_PROMPT}\n\n【阵营】${g.label}\n${g.add}\n${SUFFIX[sufA]}\n${SUFFIX[sufB]}`,
    });
  }

  await browser.close();
  server.close();

  writeFileSync(join(ROOT, "out", "64-cards", "prompts.json"), JSON.stringify(records, null, 2), "utf8");
  console.log(`\n💾 提示词记录 → out/64-cards/prompts.json（${records.length} 条）`);
  console.log(`🎉 完成，图片目录：out/64-cards/poster/`);
});
