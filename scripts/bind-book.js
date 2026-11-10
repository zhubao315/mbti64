const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '书-千分之一的你');
const DOCS = path.join(__dirname, '..', 'docs');
const OUTPUT = path.join(ROOT, '《千分之一的你：从16型到64型》_完整定稿.md');
const ILLUSTRATION_DOC = path.join(DOCS, '插图清单与图注.md');
const PLATE_DIR = '插图';
const FRONT_DIR = '00-卷首';
const BACK_DIR = '07-卷末';

// Define the binding order: 6 volumes × 4 chapters each
const VOLUMES = [
  { name: '第一卷 · 理论奠基', dir: '01-第一卷-理论奠基', anchor: '第一卷-理论奠基' },
  { name: '第二卷 · 分析师族群 NT', dir: '02-第二卷-分析师族群-NT', anchor: '第二卷-分析师族群-nt' },
  { name: '第三卷 · 外交家族群 NF', dir: '03-第三卷-外交家族群-NF', anchor: '第三卷-外交家族群-nf' },
  { name: '第四卷 · 守护者族群 SJ', dir: '04-第四卷-守护者族群-SJ', anchor: '第四卷-守护者族群-sj' },
  { name: '第五卷 · 冒险家族群 SP', dir: '05-第五卷-冒险家族群-SP', anchor: '第五卷-冒险家族群-sp' },
  { name: '第六卷 · 刻意练习工程', dir: '06-第六卷-刻意练习工程', anchor: '第六卷-刻意练习工程' },
];

// 图 7–12 的置入位置：章节号 → 图号（六卷扉页图 1–6 由 volIndex 自动对应）
const CHAPTER_PLATES = { '03': 8, '04': 9, '09': 11, '24': 12 };
const VOLUME_EXTRA = { 2: 10 };          // 第二卷扉页后附 16 原型群像
const AFTER_TOC_PLATE = 7;                // 插图目录后

// Generate GitHub-style anchor from heading text
function toAnchor(text) {
  let clean = text.replace(/^#+\s*/, '').trim();
  clean = clean.toLowerCase();
  clean = clean.replace(/[\s,:;·\-—\(\)\[\]【】\?\!]/g, '-');
  clean = clean.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return clean;
}

function cnCount(text) {
  return (text.match(/[\u4e00-\u9fa5]/g) || []).length;
}

function countLines(text) {
  return text.split('\n').length;
}

function titleOf(content, file) {
  const titleLine = content.split('\n').find(l => l.startsWith('# '));
  return titleLine ? titleLine.replace(/^#\s*/, '').trim() : file.replace('.md', '');
}

function collect(dirName) {
  const dir = path.join(ROOT, dirName);
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  警告: 目录不存在 ${dirName}`);
    return [];
  }
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map(file => {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const title = titleOf(content, file);
      return { title, anchor: toAnchor(title), content, lines: countLines(content), cn: cnCount(content), file };
    });
}

// 插图目录：唯一事实源 docs/插图清单与图注.md 的「## 插图目录」表格（5 列）
function readIllustrations() {
  if (!fs.existsSync(ILLUSTRATION_DOC)) {
    console.log('⚠️  警告: 插图清单不存在，跳过插图目录');
    return { table: '', plates: [] };
  }
  const doc = fs.readFileSync(ILLUSTRATION_DOC, 'utf8');
  const m = doc.match(/## 插图目录\s*\n([\s\S]*?)(?=\n---|\n## )/);
  if (!m) {
    console.log('⚠️  警告: 未找到「## 插图目录」表格');
    return { table: '', plates: [] };
  }
  const table = m[1].trim();
  const plates = [];
  for (const line of table.split('\n')) {
    const cols = line.split('|').slice(1, -1).map(s => s.trim());
    if (cols.length >= 4 && /^\d+$/.test(cols[0])) {
      plates.push({
        no: Number(cols[0]), place: cols[1], title: cols[2],
        caption: cols[3], status: cols[4] || '',
      });
    }
  }
  return { table, plates };
}

const { table: illustrationTable, plates } = readIllustrations();
const plateByNo = Object.fromEntries(plates.map(p => [p.no, p]));

/** 生成真实图片引用 + 图注（图片相对合订本所在目录） */
function plateBlock(no) {
  const p = plateByNo[no];
  if (!p) return '';
  const rel = `${PLATE_DIR}/图${String(no).padStart(2, '0')}.png`;
  const imgFile = path.join(ROOT, rel);
  if (!fs.existsSync(imgFile)) {
    console.log(`⚠️  警告: 插图终稿缺失 ${rel}，图 ${no} 仅保留图注`);
    return `> **图 ${no} · ${p.title}**　${p.caption}\n\n`;
  }
  return `![图 ${no} · ${p.title}](${rel})\n\n`
    + `> **图 ${no} · ${p.title}**　${p.caption}\n\n`;
}

const frontItems = collect(FRONT_DIR);
const backItems = collect(BACK_DIR);

// Collect all chapters in order
const allChapters = [];
const stats = [];
VOLUMES.forEach((vol, volIndex) => {
  for (const item of collect(vol.dir)) {
    allChapters.push({ ...item, vol: vol.name, volIndex });
    stats.push({ vol: vol.name, title: item.title, lines: item.lines, cn: item.cn });
  }
});

console.log(`📖 共收集 ${allChapters.length} 章、卷首 ${frontItems.length} 篇、卷末 ${backItems.length} 篇，开始合订...`);
console.log(`🖼️  插图位 ${plates.length} 处（终稿图已置入）`);
console.log();

// Build table of contents
let toc = '# 全书目录\n\n';
if (illustrationTable) toc += '- [插图目录（12 处）](#插图目录)\n\n';
toc += '## 卷首\n\n';
for (const it of frontItems) toc += `- [${it.title}](#${it.anchor})\n`;
toc += '\n';
let currentVol = '';
for (const ch of allChapters) {
  if (ch.vol !== currentVol) {
    currentVol = ch.vol;
    toc += `## ${ch.vol}\n\n`;
  }
  toc += `- [${ch.title}](#${ch.anchor})\n`;
}
toc += '\n## 卷末 · 附录与参考文献\n\n';
for (const it of backItems) toc += `- [${it.title}](#${it.anchor})\n`;
toc += '\n';

const allItems = [...frontItems, ...allChapters, ...backItems];
const totalCn = allItems.reduce((s, c) => s + c.cn, 0);
const totalLines = allItems.reduce((s, c) => s + c.lines, 0);

const header = `# 千分之一的你

**副标题**:从16型到64型:人格画像、差异理解与成长练习

**英文品牌标识**:64 PERSONALITIES · ONE UNIQUE YOU

**作者**:朱宝

**总字数**:约 ${Math.round(totalCn / 1000) * 1000} 字 (精确 ${totalCn} 个中文字)

**结构**:六卷 ${allChapters.length} 章 + 卷首 ${frontItems.length} 篇 + 卷末 ${backItems.length} 篇 + 插图 ${plates.length} 处

---

## 出版说明与证据边界

本书把 16 型作为自我探索的入门框架。四个字母提供的是偏好排序,不穷尽一个人的复杂性;
人格特征具有连续性与情境性。在此之上,本书提出六维探索模型与 64 种组合画像——
**64 型是作者提出的扩展探索框架,不是经心理测量验证的标准分类体系**。

书中出现的脑科学与神经术语均为帮助理解认知过程的通俗类比,不代表某个人格组合拥有
专属神经结构,也不构成心理咨询、诊断或医疗建议。四种调节状态是一张观察地图,
不是固定的人生阶段或普遍发展顺序。

**关于书名**:「千分之一」是文学化的独特性表达,不是对任何人格组合真实发生率的统计
承诺。按本书模型计算,最稀有的组合约为每千人 6.4 人;六维先验无可靠人群统计依据,
六维独立只是模型假设,分档不代表真实人口分布。

**文献体系**:正文中带 \`〔n〕\` 的引用回指卷末《参考文献》;每章末附「研究证据与模型边界」
栏目,卷末附录 A 给出模型与研究方法,附录 C 给出 64 型索引。三条阅读路径见《阅读指南》。

**插图**:全书 12 处插图均为帮助理解的示意,不是证据。涉及稀有度的图均标注
「模型计算,非人口统计」;终稿图见同目录 \`${PLATE_DIR}/\`,图注清单见 \`docs/插图清单与图注.md\`。

---

**本书声明**:本稿为出版级定稿,未授权不得转载、摘录或用于商业用途。所有角色、案例与场景均为虚构,仅作为理解人格差异的说明性素材,不构成对任何真实个体的人格评判。

**核心标签**:MBTI 十六型人格 | 六维探索模型 | 64 型组合画像 | 中式社交场域 | 行为练习 | 差异理解

---

${toc}`;

// 插图目录章节
let illustrationSection = '';
if (illustrationTable) {
  illustrationSection =
    '# 插图目录\n\n' +
    '> 本目录列出全书 12 处插图位与图注。插图为帮助理解的示意，不是证据；终稿图位于 `插图/`。\n\n' +
    illustrationTable +
    '\n\n---\n\n' +
    plateBlock(AFTER_TOC_PLATE) +
    '---\n\n';
}

// Concatenate: 插图目录 → 图 7 → 卷首 → 六卷（含卷扉页图）→ 卷末
let body = illustrationSection;
for (const it of frontItems) body += it.content.trimEnd() + '\n\n---\n\n';

let lastVol = -1;
let placed = new Set([AFTER_TOC_PLATE]);
for (const ch of allChapters) {
  if (ch.volIndex !== lastVol) {
    const no = ch.volIndex + 1;
    if (plateByNo[no]) { body += plateBlock(no) + '---\n\n'; placed.add(no); }
    const extra = VOLUME_EXTRA[no];
    if (extra && plateByNo[extra]) { body += plateBlock(extra) + '---\n\n'; placed.add(extra); }
    lastVol = ch.volIndex;
  }
  body += ch.content.trimEnd() + '\n\n---\n\n';
  const m = ch.file.match(/^第(\d\d)章/);
  const no = m ? CHAPTER_PLATES[m[1]] : undefined;
  if (no && plateByNo[no] && !placed.has(no)) {
    body += plateBlock(no) + '---\n\n';
    placed.add(no);
  }
}
for (const it of backItems) body += it.content.trimEnd() + '\n\n---\n\n';

const finalOutput = header + body.trimEnd() + '\n';
fs.writeFileSync(OUTPUT, finalOutput, 'utf8');

// Print stats table
console.log('📊 章节统计表:');
console.log('─'.repeat(70));
console.log(`${'章节名'.padEnd(35)} ${'中文字数'.padStart(10)} ${'行数'.padStart(8)}`);
console.log('─'.repeat(70));
for (const it of allItems) {
  const shortTitle = it.title.length > 33 ? it.title.slice(0, 31) + '…' : it.title;
  console.log(`${shortTitle.padEnd(35)} ${String(it.cn).padStart(10)} ${String(it.lines).padStart(8)}`);
}
console.log('─'.repeat(70));
console.log(`${'合计'.padEnd(35)} ${String(totalCn).padStart(10)} ${String(totalLines).padStart(8)}`);
console.log();
const missing = plates.map(p => p.no).filter(n => !placed.has(n));
console.log(`🖼️  已置入插图 ${placed.size} 处${missing.length ? `，未置入：${missing.join(', ')}` : '，全部到位'}`);
console.log(`✅ 合订本已输出到:`);
console.log(`   ${OUTPUT}`);
console.log();
console.log(`📁 文件大小: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
