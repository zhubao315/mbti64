#!/usr/bin/env node
/**
 * P2 · 全书插图终稿 + 装帧三件套生成器（幂等）
 *
 * 事实源：
 *  - 视觉底图：docs/book-visual/refs/（已通过 QC 的参考图，不重新生图）
 *  - 稀有度数据：docs/64型稀有度权威数据.json（lib/rarity-core.js 生成）
 *  - 视觉规范：docs/book-visual/01-视觉圣经.md
 *  - 插图位定义：docs/插图清单与图注.md
 *
 * 输出：
 *  - 书-千分之一的你/插图/图01..图12.png   （排版终稿，含叠加文字，供纸书与 EPUB）
 *  - 书-千分之一的你/装帧/封面|封底|书脊.png
 *  - public/assets/book-visual/{volumes,cover,infographics,scenes}/  （网站侧，无文字底图优先）
 *  - docs/book-visual/终稿资产索引.json
 *
 * 运行：node scripts/gen-book-art.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REFS = path.join(ROOT, 'docs', 'book-visual', 'refs');
const BOOK = path.join(ROOT, '书-千分之一的你');
const PLATES = path.join(BOOK, '插图');
const BINDING = path.join(BOOK, '装帧');
const WEB = path.join(ROOT, 'public', 'assets', 'book-visual');
const AUTH = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs', '64型稀有度权威数据.json'), 'utf8'),
);

for (const dir of [PLATES, BINDING,
  path.join(WEB, 'volumes'), path.join(WEB, 'cover'),
  path.join(WEB, 'infographics'), path.join(WEB, 'scenes')]) {
  fs.mkdirSync(dir, { recursive: true });
}

/* ------------------------------------------------------------------ 视觉常量 */
const INK = '#1B1E23';
const GRAY = '#6B7280';
const FAINT = '#9AA4B2';
const HAIR = '#E7E4DC';
const PAPER = '#FDFCF9';

const GROUPS = [
  { key: 'NT', name: '分析师 NT', main: '#7B61FF', deep: '#4A3AAE', light: '#F1EDFF',
    shape: '锐角三角', codes: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
    desc: '共享直觉与思考，喜欢先推演再落子' },
  { key: 'NF', name: '外交家 NF', main: '#4CAF6B', deep: '#2FBFA0', light: '#EAF7EE',
    shape: '同心圆弧', codes: ['INFJ', 'INFP', 'ENFP', 'ENFJ'],
    desc: '擅长读取未说出口的部分，容易把别人的情绪当成自己的任务' },
  { key: 'SJ', name: '守护者 SJ', main: '#4A90E2', deep: '#1A659F', light: '#EAF3FD',
    shape: '六边形', codes: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
    desc: '稳定感来自可复核的规则与长期兑现' },
  { key: 'SP', name: '冒险家 SP', main: '#F6C343', deep: '#F07B4A', light: '#FFF7DF',
    shape: '闪电折线', codes: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
    desc: '更依赖眼前反馈，擅长在变化里找到下一步' },
];

const TITLES = {
  INTJ: '冷焰策士', INTP: '拆解者', ENTJ: '推土机型统帅', ENTP: '变量制造者',
  INFJ: '深夜点灯人', INFP: '内心博物馆', ENFP: '火种捕手', ENFJ: '情绪调度师',
  ISTJ: '地基工程师', ISFJ: '沉默后勤部', ESTJ: '秩序执行官', ESFJ: '关系维系者',
  ISTP: '手上见真章', ISFP: '感官诗人', ESTP: '局面拆弹手', ESFP: '现场发电机',
};

const TIER_COLORS = ['#7B61FF', '#6979EA', '#4A90E2', '#2FBFA0', '#4CAF6B', '#F6C343', '#F07B4A'];

const VOLUMES = [
  { n: 1, ref: '04_volume_01_opening_v01.png', vol: '第一卷 · 理论奠基',
    title: '从四个字母到六个观察角度',
    lead: '前四维排成底座，后两维像两只可调的旋钮。',
    note: '六维探索框架 · 不是经心理测量验证的分类体系' },
  { n: 2, ref: '05_volume_02_opening_v01.png', vol: '第二卷 · 分析师族群 NT',
    title: '分析师族群的推演世界',
    lead: '棋盘、分形与分岔路线；差异在决策姿态与变化策略上展开。',
    note: '模型示意 · 非人口统计' },
  { n: 3, ref: '06_volume_03_opening_v01.png', vol: '第三卷 · 外交家族群 NF',
    title: '提灯照见的关系场',
    lead: '多面体提灯与光域，照见未说出口的那句话。',
    note: '模型示意 · 非人口统计' },
  { n: 4, ref: '07_volume_04_opening_v01.png', vol: '第四卷 · 守护者族群 SJ',
    title: '被守护的秩序',
    lead: '六边形晶格、拱桥与记忆胶囊，构成可复核的稳定感。',
    note: '模型示意 · 非人口统计' },
  { n: 5, ref: '08_volume_05_opening_v01.png', vol: '第五卷 · 冒险家族群 SP',
    title: '正在发生的现场',
    lead: '运动中的琥珀多面体、涡轮与音浪环。',
    note: '模型示意 · 非人口统计' },
  { n: 6, ref: '09_volume_06_opening_v01.png', vol: '第六卷 · 刻意练习工程',
    title: '一轮可重复的练习',
    lead: '四季符号与逐渐扩大的工具箱。',
    note: '30 天是一轮自我观察，不是习惯自动化的截止日' },
];

/* ------------------------------------------------------------------ SVG 工具 */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function T(x, y, s, o = {}) {
  const {
    size = 24, fill = INK, weight = 400, anchor = 'start',
    family = 'Microsoft YaHei', opacity = 1, spacing = 0,
  } = o;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" `
    + `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" `
    + `opacity="${opacity}" letter-spacing="${spacing}">${esc(s)}</text>`;
}

/** 中文按字数折行（出版排版用，不做英文断词） */
function wrap(s, n) {
  const out = [];
  let cur = '';
  for (const ch of String(s)) {
    cur += ch;
    if (cur.length >= n) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}

function blockText(x, y, lines, o = {}) {
  const { lh = 46, ...rest } = o;
  return lines.map((line, i) => T(x, y + i * lh, line, rest)).join('');
}

function rect(x, y, w, h, fill, o = {}) {
  const { stroke = 'none', sw = 1, rx = 0, opacity = 1 } = o;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" `
    + `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`;
}

function line(x1, y1, x2, y2, stroke = HAIR, sw = 1, dash = '') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" `
    + `stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
}

function b64(file) {
  return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
}

function img(file, x, y, w, h, ratio = 'xMidYMid meet', opacity = 1) {
  return `<image href="${b64(file)}" x="${x}" y="${y}" width="${w}" height="${h}" `
    + `preserveAspectRatio="${ratio}" opacity="${opacity}"/>`;
}

const FADE_DEFS = `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
  <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.86"/>
  <stop offset="100%" stop-color="#FFFFFF" stop-opacity="1"/>
</linearGradient>
<marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5"
  orient="auto" markerUnits="strokeWidth"><path d="M0,0 L10,5 L0,10 z" fill="#94A3B8"/></marker>
</defs>`;

function svgWrap(w, h, body, defs = FADE_DEFS, bg = '#FFFFFF') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `
    + `viewBox="0 0 ${w} ${h}">${defs}`
    + rect(0, 0, w, h, bg) + body + '</svg>';
}

function render(svg, out) {
  const r = new Resvg(svg, {
    font: { loadSystemFonts: true, defaultFontFamily: 'Microsoft YaHei' },
  });
  const png = r.render().asPng();
  fs.writeFileSync(out, png);
  return png.length;
}

/** 页脚边界条：所有信息图统一带证据边界 */
function footer(w, h, text) {
  return line(100, h - 118, w - 100, h - 118, HAIR, 2)
    + T(100, h - 66, text, { size: 25, fill: GRAY });
}

function header(w, title, sub) {
  return T(100, 118, title, { size: 54, weight: 700 })
    + T(100, 178, sub, { size: 26, fill: GRAY })
    + line(100, 214, w - 100, 214, HAIR, 2);
}

const results = [];
function emit(label, file, svg, opts = {}) {
  const out = path.join(opts.dir || PLATES, file);
  const bytes = render(svg, out);
  results.push({ label, file: path.relative(ROOT, out).replace(/\\/g, '/'),
    bytes, w: opts.w, h: opts.h, kind: opts.kind || 'plate' });
  console.log(`  ✅ ${label.padEnd(26)} ${String(Math.round(bytes / 1024)).padStart(5)} KB  ${opts.w}×${opts.h}`);
  return out;
}

/* ------------------------------------------------------------------ 图 1–6 卷扉页 */
function makeVolume(v) {
  const W = 1536, H = 1024;
  const ref = path.join(REFS, v.ref);
  const body =
    img(ref, 0, 0, W, H, 'xMidYMid meet')
    + rect(0, 790, W, 234, 'url(#fade)')
    + T(100, 872, v.vol, { size: 44, weight: 700 })
    + T(100, 928, v.title, { size: 30, fill: GRAY })
    + T(100, 986, v.note, { size: 22, fill: FAINT });
  return svgWrap(W, H, body);
}

/* ------------------------------------------------------------------ 图 7 四大族群与六维坐标 */
function makeCoord() {
  const W = 2400, H = 1600;
  let b = header(W, '图 7 · 四大族群与六维坐标',
    '16 基础型放进四个族群，再展开决策姿态与变化策略两条可调节的轴');
  const cells = [
    { x: 120, y: 280 }, { x: 1240, y: 280 },
    { x: 120, y: 760 }, { x: 1240, y: 760 },
  ];
  GROUPS.forEach((g, i) => {
    const { x, y } = cells[i];
    const cw = 1040, ch = 420;
    b += rect(x, y, cw, ch, g.light, { rx: 28, stroke: g.main, sw: 2, opacity: 0.55 });
    b += rect(x, y, 12, ch, g.main, { rx: 6 });
    b += T(x + 52, y + 72, g.name, { size: 38, weight: 700, fill: g.deep });
    b += T(x + 52, y + 118, `几何母题：${g.shape}`, { size: 22, fill: GRAY });
    g.codes.forEach((code, j) => {
      b += T(x + 52 + j * 250, y + 220, code, { size: 44, weight: 700, fill: INK });
      b += T(x + 52 + j * 250, y + 262, TITLES[code], { size: 21, fill: GRAY });
    });
    b += T(x + 52, y + 340, g.desc, { size: 25, fill: GRAY });
    b += T(x + 52, y + 386, '前四维：E/I · S/N · T/F · J/P', { size: 20, fill: FAINT });
  });
  // 两条扩展轴
  const ay = 1245;
  b += T(120, ay - 24, '后缀一 · 决策姿态', { size: 30, weight: 700 });
  b += line(120, ay + 26, 1120, ay + 26, '#7B61FF', 4);
  b += `<circle cx="120" cy="${ay + 26}" r="10" fill="#7B61FF"/>`
    + `<circle cx="1120" cy="${ay + 26}" r="10" fill="#7B61FF"/>`;
  b += T(120, ay + 82, 'A 坚定推进', { size: 26 })
    + T(1120, ay + 82, 'C 审慎校准', { size: 26, anchor: 'end' });

  b += T(1280, ay - 24, '后缀二 · 变化策略', { size: 30, weight: 700 });
  b += line(1280, ay + 26, 2280, ay + 26, '#F6C343', 4);
  b += `<circle cx="1280" cy="${ay + 26}" r="10" fill="#F6C343"/>`
    + `<circle cx="2280" cy="${ay + 26}" r="10" fill="#F6C343"/>`;
  b += T(1280, ay + 82, 'O 求新探索', { size: 26 })
    + T(2280, ay + 82, 'H 守成沉淀', { size: 26, anchor: 'end' });
  b += T(120, ay + 142, '两个后缀是情境中的行为倾向：不是能力高低，也不是非此即彼的人格属性。',
    { size: 25, fill: GRAY });
  b += footer(W, H, '模型示意 · 非人口统计；16 型是入门框架，四字母不穷尽一个人的复杂性');
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 图 8 七档分布（数据驱动） */
function tierStats() {
  return AUTH.tiers.map((t, i) => {
    const vals = Object.values(AUTH.byCode).filter((v) => v.tierIndex === i);
    const pers = vals.map((v) => v.per1000);
    const nums = vals.flatMap((v) => v.rankLabel.split('–').map(Number));
    const lo = Math.min(...nums), hi = Math.max(...nums);
    return {
      name: t.name, en: t.en, n: vals.length,
      min: Math.min(...pers), max: Math.max(...pers),
      rank: lo === hi ? `${lo}` : `${lo}–${hi}`,
      color: TIER_COLORS[i],
    };
  });
}

function makeTiers() {
  const W = 2400, H = 1600;
  const stats = tierStats();
  const maxPer = Math.max(...stats.map((s) => s.max));
  let b = header(W, '图 8 · 七档分布与并列名次',
    '64 个组合按每千人理论值排成阶梯，同概率者并列成组 · 数值来自 lib/rarity-core.js');
  b += T(100, 262, '档位', { size: 24, fill: FAINT })
    + T(560, 262, '条形长度 = 每千人理论值（模型计算）', { size: 24, fill: FAINT })
    + T(1880, 262, '并列名次', { size: 24, fill: FAINT });
  // 条形最长 920px：为右侧数值文本留出空间，避免与 1880 处的并列名次列重叠
  const rowY = 300, rowH = 148, barX = 560, barMax = 920;
  stats.forEach((s, i) => {
    const y = rowY + i * rowH;
    b += line(100, y + rowH - 12, W - 100, y + rowH - 12, HAIR, 1);
    b += rect(100, y + 20, 14, 62, s.color, { rx: 7 });
    b += T(136, y + 52, s.name, { size: 34, weight: 700 });
    b += T(136, y + 90, s.en, { size: 19, fill: FAINT });
    const len = Math.round((s.max / maxPer) * barMax);
    b += rect(barX, y + 26, len, 62, s.color, { rx: 10, opacity: 0.86 });
    const rangeTxt = s.min === s.max
      ? `每千人约 ${s.min.toFixed(1)} 人`
      : `每千人约 ${s.min.toFixed(1)}–${s.max.toFixed(1)} 人`;
    b += T(barX + len + 24, y + 68, rangeTxt, { size: 25, fill: INK });
    b += T(1880, y + 52, s.rank, { size: 34, weight: 700, fill: s.color });
    b += T(1880, y + 90, `${s.n} 个组合`, { size: 21, fill: GRAY });
  });
  b += T(100, 1385, '合计 64 个组合；所有同概率组合共用同一并列名次，因此不存在唯一的第一名。',
    { size: 25, fill: GRAY });
  b += footer(W, H, '模型计算，非人口统计 · 六维先验无可靠人群统计依据 · 并列名次写区间，不写「第 N/64」');
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 图 9 四态环 */
function makeStates() {
  const W = 2400, H = 1600;
  let b = header(W, '图 9 · 双环探索框架：四种后缀状态',
    '一张「我现在在哪、还可以往哪试」的观察地图，可从任意一格开始');
  const cx = 1200, cy = 830, r = 420;
  const states = [
    { code: 'C-O', name: '审慎探索', color: '#8FD3A8', x: cx, y: cy - r },
    { code: 'A-O', name: '坚定探索', color: '#F6C343', x: cx + r, y: cy },
    { code: 'A-H', name: '坚定守成', color: '#F0A15A', x: cx, y: cy + r },
    { code: 'C-H', name: '审慎守成', color: '#8EC5E8', x: cx - r, y: cy },
  ];
  // 双向环
  b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E7E4DC" stroke-width="18"/>`;
  b += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" `
    + `fill="none" stroke="#94A3B8" stroke-width="5" marker-end="url(#arrow)"/>`;
  b += `<path d="M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r}" `
    + `fill="none" stroke="#94A3B8" stroke-width="5" marker-end="url(#arrow)"/>`;
  b += `<path d="M ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx - r} ${cy}" `
    + `fill="none" stroke="#94A3B8" stroke-width="5" marker-end="url(#arrow)"/>`;
  b += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}" `
    + `fill="none" stroke="#94A3B8" stroke-width="5" marker-end="url(#arrow)"/>`;
  // 中央说明
  b += `<circle cx="${cx}" cy="${cy}" r="196" fill="${PAPER}" stroke="${HAIR}" stroke-width="2"/>`;
  b += T(cx, cy - 34, '可相互转换', { size: 38, weight: 700, anchor: 'middle' });
  b += blockText(cx, cy + 24, ['不是固定阶段', '没有统一顺序'],
    { size: 25, fill: GRAY, anchor: 'middle', lh: 42 });
  states.forEach((s) => {
    // 不透明白底遮住环线，避免灰线穿过节点文字
    b += `<circle cx="${s.x}" cy="${s.y}" r="112" fill="#FFFFFF"/>`;
    b += `<circle cx="${s.x}" cy="${s.y}" r="112" fill="${s.color}" opacity="0.16"/>`;
    b += `<circle cx="${s.x}" cy="${s.y}" r="112" fill="none" stroke="${s.color}" stroke-width="4"/>`;
    b += T(s.x, s.y - 18, s.code, { size: 40, weight: 700, anchor: 'middle' });
    b += T(s.x, s.y + 30, s.name, { size: 24, fill: GRAY, anchor: 'middle' });
  });
  b += T(100, 1385, '四态由「决策姿态 A/C」与「变化策略 O/H」交叉而来，是描述当下倾向的格子，不是人格等级。',
    { size: 25, fill: GRAY });
  b += footer(W, H, '不是人生阶段，也不是发展定律 · 模型示意 · 非人口统计');
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 图 10 16 原型群像 */
function findBase(code) {
  const files = fs.readdirSync(REFS).filter((f) => f.includes(`_${code}_base_v`) && f.endsWith('.png'));
  files.sort();
  if (!files.length) throw new Error(`缺少基础原型图：${code}`);
  return path.join(REFS, files[files.length - 1]); // 取最高版本
}

function makeGallery() {
  const W = 1800, H = 2400;
  let b = T(90, 110, '图 10 · 16 基础原型群像', { size: 52, weight: 700 })
    + T(90, 168, '四列对应四个族群；称号是文学化命名，不是学术分类', { size: 25, fill: GRAY })
    + line(90, 206, W - 90, 206, HAIR, 2);
  const colW = 420, gap = 20, x0 = 90, y0 = 320, cellH = 490;
  GROUPS.forEach((g, ci) => {
    const x = x0 + ci * (colW + gap);
    b += rect(x, 240, colW, 62, g.light, { rx: 14 });
    b += T(x + 20, 284, g.name, { size: 30, weight: 700, fill: g.deep });
    g.codes.forEach((code, ri) => {
      const y = y0 + ri * cellH;
      b += rect(x, y, colW, 440, '#FFFFFF', { rx: 12, stroke: HAIR, sw: 1 });
      b += img(findBase(code), x + 40, y + 16, 340, 340, 'xMidYMid meet');
      b += T(x + 20, y + 392, code, { size: 30, weight: 700, fill: g.deep });
      b += T(x + 20, y + 424, TITLES[code], { size: 22, fill: GRAY });
    });
  });
  b += line(90, H - 150, W - 90, H - 150, HAIR, 2);
  b += T(90, H - 94, '创作素材，非调研记录 · 人物、信物与场景均为虚构，仅作理解差异的说明性素材',
    { size: 24, fill: GRAY });
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 图 11 圆桌场景 */
function makeScene() {
  const W = 1536, H = 1024;
  const ref = path.join(REFS, '15_scene_roundtable_INFJ_v02.png');
  const body = img(ref, 0, 0, W, H, 'xMidYMid meet')
    + rect(0, 800, W, 224, 'url(#fade)')
    + T(100, 880, '饭局圆桌上的差异', { size: 42, weight: 700 })
    + T(100, 930, '谁先敬酒、谁在接话、谁把话咽回去', { size: 26, fill: GRAY })
    + T(100, 982, '创作素材，非调研记录 · 场景与人物均为虚构', { size: 21, fill: FAINT });
  return svgWrap(W, H, body);
}

/* ------------------------------------------------------------------ 图 12 练习环 */
function makePractice() {
  const W = 2400, H = 1600;
  let b = header(W, '图 12 · 30 天行为练习环',
    '微动作 → 触发场景 → 事后记录，三步可以反复走，不需要连续打卡');
  const cx = 1200, cy = 800, r = 380;
  const steps = [
    { t: '微动作', d: '选一个具体到能做完的小动作', c: '#7B61FF', a: -90 },
    { t: '触发场景', d: '把它挂到一件每天都会发生的事上', c: '#4CAF6B', a: 30 },
    { t: '事后记录', d: '只记事实与感受，不给自己打分', c: '#F6C343', a: 150 },
  ];
  steps.forEach((s, i) => {
    const rad = (s.a * Math.PI) / 180;
    const x = cx + r * Math.cos(rad), y = cy + r * Math.sin(rad);
    b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E7E4DC" stroke-width="16" `
      + `stroke-dasharray="6 18" opacity="0.9"/>`;
    b += rect(x - 250, y - 100, 500, 200, '#FFFFFF', { rx: 24, stroke: s.c, sw: 3 });
    b += rect(x - 250, y - 100, 10, 200, s.c, { rx: 5 });
    b += T(x - 214, y - 32, `${i + 1} · ${s.t}`, { size: 38, weight: 700, fill: s.c });
    b += T(x - 214, y + 22, s.d, { size: 23, fill: GRAY });
    b += T(x - 214, y + 66, '随时可以回到上一格', { size: 20, fill: FAINT });
  });
  b += `<circle cx="${cx}" cy="${cy}" r="150" fill="${PAPER}" stroke="${HAIR}" stroke-width="2"/>`;
  b += T(cx, cy - 12, '30 天', { size: 52, weight: 700, anchor: 'middle' });
  b += T(cx, cy + 44, '一轮观察', { size: 28, fill: GRAY, anchor: 'middle' });
  b += T(100, 1370,
    '习惯形成所需时间个体差异很大；已有系统综述报告的中位数约为 59–66 天，个体范围 4–335 天〔5〕。',
    { size: 25, fill: GRAY });
  b += footer(W, H, '一轮观察，不是截止日 · 不承诺天数、概率或脑结构变化 · 记录比连续天数更有价值');
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 装帧 · 封面 */
function makeCoverFront() {
  const W = 1200, H = 1600;
  const ref = path.join(REFS, '01_cover_front_v01.png');
  let b = img(ref, 0, 0, W, H, 'xMidYMid meet');
  // 顶部：书名 + 英文品牌标识（图形自 y≈330 起，顶部安全区干净）
  // 书名大字用 SimHei：雅黑粗体会把「千」的上撇压成近水平，易被误读为「干」
  b += T(W / 2, 196, '千分之一的你',
    { size: 106, weight: 700, anchor: 'middle', family: 'SimHei' });
  ['#7B61FF', '#4CAF6B', '#4A90E2', '#F6C343'].forEach((c, i) => {
    b += rect(W / 2 - 150 + i * 80, 228, 60, 7, c, { rx: 3 });
  });
  b += T(W / 2, 284, '64 PERSONALITIES · ONE UNIQUE YOU',
    { size: 20, fill: GRAY, anchor: 'middle', spacing: 3 });
  // 底部：副标题 + 作者
  b += rect(0, 1260, W, 340, 'url(#fade)');
  const lines = ['从16型到64型：', '人格画像、差异理解与成长练习'];
  b += blockText(W / 2, 1360, lines,
    { size: 38, fill: INK, anchor: 'middle', lh: 54, weight: 700 });
  b += line(W / 2 - 90, 1478, W / 2 + 90, 1478, '#C9D3DE', 2);
  b += T(W / 2, 1536, '朱宝 著', { size: 30, fill: GRAY, anchor: 'middle' });
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 装帧 · 封底 */
function makeCoverBack() {
  const W = 1200, H = 1600;
  const ref = path.join(REFS, '02_cover_back_v01.png');
  let b = img(ref, 0, 0, W, H, 'xMidYMid meet');
  b += rect(0, 60, W, 400, '#FFFFFF', { opacity: 0.9 });
  const intro = [
    '从 16 型出发，补上两个更贴近日常的观察角度：',
    '面对不确定性，你是保持判断，还是先校准风险？',
    '面对新变化，你是探索可能，还是沉淀已有成果？',
    '六个角度，64 种组合画像，四卷族群图鉴，一轮可记录的行为练习。',
  ];
  b += blockText(110, 150, intro, { size: 29, lh: 66 });
  b += rect(110, 420, 130, 6, '#7B61FF', { rx: 3 });
  // 下部边界声明
  b += rect(0, 1180, W, 420, '#FFFFFF', { opacity: 0.92 });
  const note = [
    '64 型是作者提出的扩展探索框架，不是经心理测量验证的标准分类体系。',
    '书中脑科学与神经术语均为帮助理解的通俗类比，不构成诊断或医疗建议。',
    '「千分之一」是文学化表达，不是对真实发生率的统计承诺。',
    '所有角色、案例与场景均为虚构，仅作理解人格差异的说明性素材。',
  ];
  b += blockText(110, 1230, note, { size: 23, fill: GRAY, lh: 50 });
  b += line(110, 1460, W - 110, 1460, HAIR, 2);
  b += T(110, 1512, '心理学科普 · 自我探索', { size: 24, fill: FAINT });
  b += T(W - 110, 1512, '朱宝 著', { size: 24, fill: FAINT, anchor: 'end' });
  return svgWrap(W, H, b);
}

/* ------------------------------------------------------------------ 装帧 · 书脊 */
function makeSpine() {
  const W = 543, H = 3437; // 46 × 291 mm @300dpi（含 3mm 出血）
  const cx = W / 2;
  let b = rect(0, 0, W, H, PAPER);
  // 上下四色菱形与细线（呼应参考图，纯几何装饰）
  const colors = ['#7B61FF', '#4CAF6B', '#4A90E2', '#F6C343'];
  [0.10, 0.22, 0.78, 0.90].forEach((f, k) => {
    const y = H * f;
    b += `<path d="M ${cx} ${y - 62} L ${cx + 46} ${y} L ${cx} ${y + 62} L ${cx - 46} ${y} Z" `
      + `fill="${colors[k % 4]}" opacity="0.75"/>`;
    b += line(cx, y + 80, cx, y + 240, '#94A3B8', 2, '8 10');
  });
  // 中央竖排书名（逐字定位，避免依赖 writing-mode）
  const title = '千分之一的你';
  const startY = 1230, step = 148;
  [...title].forEach((ch, i) => {
    b += T(cx, startY + i * step, ch,
      { size: 104, weight: 700, anchor: 'middle', family: 'SimHei' });
  });
  b += line(cx - 44, startY + title.length * step + 40,
    cx + 44, startY + title.length * step + 40, '#C9D3DE', 2);
  // 副标题与作者竖排小字（中文数字，避免阿拉伯数字逐字拆开）
  const sub = '从十六型到六十四型';
  [...sub].forEach((ch, i) => {
    b += T(cx + 150, startY + 40 + i * 62, ch, { size: 40, fill: GRAY, anchor: 'middle' });
  });
  [...'朱宝'].forEach((ch, i) => {
    b += T(cx, 2300 + i * 62, ch, { size: 40, fill: GRAY, anchor: 'middle' });
  });
  return svgWrap(W, H, b, FADE_DEFS, PAPER);
}

/* ------------------------------------------------------------------ 主流程 */
console.log('🎨 P2 · 生成全书插图终稿与装帧三件套\n');

console.log('— 卷扉页（图 1–6）—');
VOLUMES.forEach((v) => {
  emit(`图 ${v.n} · ${v.title}`, `图${String(v.n).padStart(2, '0')}.png`,
    makeVolume(v), { w: 1536, h: 1024, kind: 'volume' });
  // 网站侧保留无文字底图
  fs.copyFileSync(path.join(REFS, v.ref),
    path.join(WEB, 'volumes', `volume-0${v.n}-blank.png`));
});

console.log('\n— 信息图（图 7–9、12）—');
emit('图 7 · 四大族群与六维坐标', '图07.png', makeCoord(), { w: 2400, h: 1600, kind: 'infographic' });
emit('图 8 · 七档分布与并列名次', '图08.png', makeTiers(), { w: 2400, h: 1600, kind: 'infographic' });
emit('图 9 · 四种调节状态的环', '图09.png', makeStates(), { w: 2400, h: 1600, kind: 'infographic' });
emit('图 12 · 30 天行为练习环', '图12.png', makePractice(), { w: 2400, h: 1600, kind: 'infographic' });

console.log('\n— 群像与场景（图 10–11）—');
emit('图 10 · 16 基础原型群像', '图10.png', makeGallery(), { w: 1800, h: 2400, kind: 'gallery' });
emit('图 11 · 饭局圆桌上的差异', '图11.png', makeScene(), { w: 1536, h: 1024, kind: 'scene' });

console.log('\n— 装帧三件套 —');
emit('封面', '封面.png', makeCoverFront(), { w: 1200, h: 1600, dir: BINDING, kind: 'binding' });
emit('封底', '封底.png', makeCoverBack(), { w: 1200, h: 1600, dir: BINDING, kind: 'binding' });
emit('书脊', '书脊.png', makeSpine(), { w: 543, h: 3437, dir: BINDING, kind: 'binding' });

// 网站侧同步：信息图、群像、场景、装帧
for (const n of [7, 8, 9, 12]) {
  fs.copyFileSync(path.join(PLATES, `图${String(n).padStart(2, '0')}.png`),
    path.join(WEB, 'infographics', `plate-${String(n).padStart(2, '0')}.png`));
}
for (const n of [10, 11]) {
  fs.copyFileSync(path.join(PLATES, `图${String(n).padStart(2, '0')}.png`),
    path.join(WEB, 'scenes', `plate-${String(n).padStart(2, '0')}.png`));
}
for (const [src, dst] of [['封面.png', 'cover-front.png'], ['封底.png', 'cover-back.png'], ['书脊.png', 'spine.png']]) {
  fs.copyFileSync(path.join(BINDING, src), path.join(WEB, 'cover', dst));
}

// 终稿索引
const index = {
  generatedAt: new Date().toISOString(),
  generator: 'scripts/gen-book-art.mjs',
  sources: {
    visualBible: 'docs/book-visual/01-视觉圣经.md',
    references: 'docs/book-visual/refs/',
    rarity: 'docs/64型稀有度权威数据.json',
    plateList: 'docs/插图清单与图注.md',
  },
  title: '千分之一的你',
  subtitle: '从16型到64型：人格画像、差异理解与成长练习',
  plates: results,
  webAssets: {
    volumes: 6, infographics: 4, scenes: 2, cover: 3,
  },
  note: '卷扉页 PNG 含排版叠加文字；网站 assets 另存无文字底图 volume-0N-blank.png 供自由排版。',
};
fs.writeFileSync(path.join(ROOT, 'docs', 'book-visual', '终稿资产索引.json'),
  JSON.stringify(index, null, 2), 'utf8');

console.log(`\n✅ 共生成 ${results.length} 张终稿；索引：docs/book-visual/终稿资产索引.json`);
