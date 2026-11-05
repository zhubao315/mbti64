const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '书-千分之一的你');
const OUTPUT = path.join(ROOT, '《千分之一的你：64型人格认知模型与脑神经亚型全书》_完整定稿.md');

// Define the binding order: 6 volumes × 4 chapters each
const VOLUMES = [
  {
    name: '第一卷 · 理论奠基',
    dir: '01-第一卷-理论奠基',
    anchor: '第一卷-理论奠基',
  },
  {
    name: '第二卷 · 分析师族群 NT',
    dir: '02-第二卷-分析师族群-NT',
    anchor: '第二卷-分析师族群-nt',
  },
  {
    name: '第三卷 · 外交家族群 NF',
    dir: '03-第三卷-外交家族群-NF',
    anchor: '第三卷-外交家族群-nf',
  },
  {
    name: '第四卷 · 守护者族群 SJ',
    dir: '04-第四卷-守护者族群-SJ',
    anchor: '第四卷-守护者族群-sj',
  },
  {
    name: '第五卷 · 冒险家族群 SP',
    dir: '05-第五卷-冒险家族群-SP',
    anchor: '第五卷-冒险家族群-sp',
  },
  {
    name: '第六卷 · 刻意练习工程',
    dir: '06-第六卷-刻意练习工程',
    anchor: '第六卷-刻意练习工程',
  },
];

// Generate GitHub-style anchor from heading text
function toAnchor(text) {
  // Extract chapter title (remove markdown heading markers)
  let clean = text.replace(/^#+\s*/, '').trim();
  // Lowercase and keep alphanumeric, chinese chars, hyphens
  clean = clean.toLowerCase();
  // Replace spaces and special chars with hyphens, keep chinese chars
  clean = clean.replace(/[\s,:;·\-—\(\)\[\]【】\?\!]/g, '-');
  // Remove duplicate hyphens
  clean = clean.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return clean;
}

function cnCount(text) {
  return (text.match(/[\u4e00-\u9fa5]/g) || []).length;
}

function countLines(text) {
  return text.split('\n').length;
}

// Collect all chapters in order
const allChapters = [];
const stats = [];

for (const vol of VOLUMES) {
  const volDir = path.join(ROOT, vol.dir);
  if (!fs.existsSync(volDir)) {
    console.log(`⚠️  警告: 目录不存在 ${vol.dir}`);
    continue;
  }
  
  const files = fs.readdirSync(volDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort();
  
  for (const file of files) {
    const filePath = path.join(volDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = countLines(content);
    const cn = cnCount(content);
    
    // Extract chapter title
    const titleLine = content.split('\n').find(l => l.startsWith('# '));
    const title = titleLine ? titleLine.replace(/^#\s*/, '').trim() : file.replace('.md', '');
    
    allChapters.push({
      vol: vol.name,
      volAnchor: vol.anchor,
      title,
      anchor: toAnchor(title),
      content,
      lines,
      cn,
      file,
    });
    stats.push({ vol: vol.name, title, lines, cn });
  }
}

console.log(`📖 共收集 ${allChapters.length} 章,开始合订...`);
console.log();

// Build table of contents
let toc = '# 全书目录\n\n';
let currentVol = '';
for (const ch of allChapters) {
  if (ch.vol !== currentVol) {
    currentVol = ch.vol;
    toc += `## ${ch.vol}\n\n`;
  }
  toc += `- [${ch.title}](#${ch.anchor})\n`;
}
toc += '\n';

// Build header
const totalCn = allChapters.reduce((s, c) => s + c.cn, 0);
const totalLines = allChapters.reduce((s, c) => s + c.lines, 0);

const header = `# 千分之一的你:64 型人格认知模型与脑神经亚型全书

**副标题**:从六维雷达到二阶镜像,一套基于神经科学的人格认知与演进框架

**总字数**:约 ${Math.round(totalCn / 1000) * 1000} 字 (精确 ${totalCn} 个中文字)

**总章节数**:${allChapters.length} 章,分 6 卷

**总代码行数**:${totalLines} 行

---

**本书声明**:本稿为出版级定稿,未授权不得转载、摘录或用于商业用途。所有角色、案例与场景均为虚构或基于公开学术资料推演,仅作为人格认知模型的说明性素材,不构成对任何真实个体的人格评判。

**核心标签**:MBTI 十六型人格 | 六维扩展模型 | 脑神经科学 | 赫布定律 | 神经可塑性 | 中式社交场域 | 刻意练习

---

${toc}`;

// Concatenate all chapters
let body = '';
for (const ch of allChapters) {
  body += ch.content;
  body += '\n\n---\n\n';
}

// Combine header + body
const finalOutput = header + body.trimEnd();

// Write output
fs.writeFileSync(OUTPUT, finalOutput, 'utf8');

// Print stats table
console.log('📊 章节统计表:');
console.log('─'.repeat(70));
console.log(`${'章节名'.padEnd(35)} ${'中文字数'.padStart(10)} ${'行数'.padStart(8)}`);
console.log('─'.repeat(70));
for (const ch of allChapters) {
  const shortTitle = ch.title.length > 33 ? ch.title.slice(0, 31) + '…' : ch.title;
  console.log(`${shortTitle.padEnd(35)} ${String(ch.cn).padStart(10)} ${String(ch.lines).padStart(8)}`);
}
console.log('─'.repeat(70));
console.log(`${'合计'.padEnd(35)} ${String(totalCn).padStart(10)} ${String(totalLines).padStart(8)}`);
console.log();
console.log(`✅ 合订本已输出到:`);
console.log(`   ${OUTPUT}`);
console.log();
console.log(`📁 文件大小: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
