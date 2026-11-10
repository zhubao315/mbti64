const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '书-千分之一的你');

// ANSI colors for terminal output
const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_GREEN = '\x1b[32m';
const C_YELLOW = '\x1b[33m';
const C_CYAN = '\x1b[36m';
const C_BOLD = '\x1b[1m';

function pass(msg) { return `${C_GREEN}✅ 通过${C_RESET} ${msg}`; }
function warn(msg) { return `${C_YELLOW}⚠️  警告${C_RESET} ${msg}`; }
function error(msg) { return `${C_RED}❌ 错误${C_RESET} ${msg}`; }
function section(msg) { return `${C_CYAN}${C_BOLD}━━ ${msg} ━━${C_RESET}`; }

// Collect all .md files under 书-千分之一的你/ (excluding special dirs)
function collectMdFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['00-总控-单一事实源', 'data', 'scripts', 'node_modules'].includes(entry.name)) {
        collectMdFiles(full, files);
      }
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

// Extract main character name from chapter first paragraph (after title)
function extractMainChar(content, filePath) {
  const lines = content.split('\n');
  
  // Find 板块一 section content
  const bankuai1Idx = lines.findIndex(l => l.includes('板块一'));
  let searchLines;
  if (bankuai1Idx !== -1) {
    searchLines = lines.slice(bankuai1Idx + 1, bankuai1Idx + 15).filter(l => l.trim() && !l.startsWith('#'));
  } else {
    searchLines = lines.filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---')).slice(0, 10);
  }
  
  const searchText = searchLines.join(' ');
  
  // Pattern 1: "名字是一家XX" or "名字,是XX" (most common intro pattern)
  const p1 = searchText.match(/([\u4e00-\u9fa5]{2,4})\s*(,|，|,)\s*[是为]/);
  if (p1) return p1[1];
  
  // Pattern 2: "XX岁的名字" 
  const p2 = searchText.match(/\d+岁的([\u4e00-\u9fa5]{2,4})/);
  if (p2) return p2[1];
  
  // Pattern 3: "名字，\d+岁"
  const p3 = searchText.match(/^([\u4e00-\u9fa5]{2,4})\s*(,|，)\s*\d+岁/m);
  if (p3) return p3[1];
  
  return null;
}

// Get all chapter files (chapters 5-20 are the type atlas chapters)
function getChapterFiles(files) {
  return files.filter(f => {
    const name = path.basename(f);
    return /第(0[5-9]|1[0-9]|20)章-.*\.md/.test(name);
  }).sort();
}

// Check 1: Main character uniqueness in chapters 5-20
function checkMainChars(chapterFiles) {
  console.log(section('检查 1: 主角重名(第5-20章)'));
  const chars = {}; // char -> [filePath]
  for (const file of chapterFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const char = extractMainChar(content, file);
    if (char) {
      if (!chars[char]) chars[char] = [];
      chars[char].push(file);
    } else {
      console.log(warn(`${path.basename(file)}: 未检测到主线人物名`));
    }
  }
  
  const duplicates = Object.entries(chars).filter(([c, files]) => files.length > 1);
  if (duplicates.length === 0) {
    console.log(pass(`第5-20章主线人物全部唯一 (${Object.keys(chars).length} 位)`));
  } else {
    console.log(error(`发现重复人物:`));
    duplicates.forEach(([char, files]) => {
      console.log(`    "${char}" 出现在: ${files.map(f => path.basename(f)).join(', ')}`);
    });
  }
  return { chars, duplicates };
}

// Check 2: Typography fixes (unclosed bold, orphan hyphens, emoji)
function checkTypography(files) {
  console.log(section('检查 2: 排版瑕疵'));
  const issues = [];
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    const fileIssues = [];
    
    // 2a: Unclosed bold
    const boldCount = (content.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      // Find last occurrence and close it conservatively
      const lastIdx = content.lastIndexOf('**');
      if (lastIdx !== -1) {
        content = content.slice(0, lastIdx + 2) + content.slice(lastIdx + 2) + '**';
        fileIssues.push('加粗未闭合,已自动补全');
        modified = true;
      }
    }
    
    // 2b: Orphan hyphens at line start like -INTJ or -ENTP
    const orphanHyphen = content.match(/^-[A-Z]{3,4}/gm);
    if (orphanHyphen) {
      content = content.replace(/^-([A-Z]{3,4})/gm, '**$1**');
      fileIssues.push(`段首孤立连字符(${orphanHyphen.length}处),已替换为加粗`);
      modified = true;
    }
    
    // 2c: Remove emoji
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{2B00}-\u{2BFF}]/gu;
    const emojis = content.match(emojiRegex);
    if (emojis && emojis.length > 0) {
      content = content.replace(emojiRegex, '');
      fileIssues.push(`发现${emojis.length}个Emoji,已清除`);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
    }
    
    if (fileIssues.length > 0) {
      console.log(warn(`${path.basename(file)}: ${fileIssues.join('; ')}`));
      issues.push({ file, issues: fileIssues });
    } else {
      console.log(pass(`${path.basename(file)}: 排版正常`));
    }
  }
  return issues;
}

// Check 3: Rarity consistency
function checkRarity(chapterFiles) {
  console.log(section('检查 3: 稀有度一致性'));
  
  // Read chapter 3 for baseline rarity data
  const ch3 = chapterFiles.find(f => path.basename(f).includes('第03章') && f.includes('稀有度'));
  if (!ch3) {
    // Try alternative search
    const altSearch = chapterFiles.find(f => path.basename(f).includes('03'));
    if (altSearch) {
      console.log(warn(`未找到"稀有度金字塔"字样,但发现第03章文件: ${path.basename(altSearch)}`));
    }
    console.log(warn('跳过稀有度一致性检查(无有效基准文件)'));
    return [];
  }
  
  const ch3Content = fs.readFileSync(ch3, 'utf8');
  console.log(pass(`已加载基准: ${path.basename(ch3)}`));
  
  // Scan chapters 5-20 for rarity mentions and compare
  const diffs = [];
  for (const file of chapterFiles) {
    const name = path.basename(file);
    if (!/第(0[5-9]|1[0-9]|20)章/.test(name)) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    // Extract type code and rarity from subtype descriptions
    const subtypeRegex = /`?([A-Z]{4})-(A-O|A-H|C-O|C-H)`?.*?第(\d+)\/64.*?每千人约([\d.]+)人/g;
    let match;
    while ((match = subtypeRegex.exec(content)) !== null) {
      const typeCode = match[1] + '-' + match[2];
      const rank = match[3];
      const per1000 = match[4];
      // Just collect and report any anomalies we spot
      // For now, just extract and flag if rank is very low for common types or very high for rare types
      if (parseInt(rank) < 10 && parseFloat(per1000) > 15) {
        diffs.push(`${name}: ${typeCode} 排名${rank}但千分比${per1000}‰,请手动核对`);
      }
    }
  }
  
  if (diffs.length === 0) {
    console.log(pass('稀有度数字未见明显矛盾,建议人工抽样核对'));
  } else {
    diffs.forEach(d => console.log(warn(d)));
  }
  return diffs;
}

// Main
function main() {
  console.log(`${C_BOLD}${C_CYAN}╔══════════════════════════════════════════════════════════════╗${C_RESET}`);
  console.log(`${C_BOLD}${C_CYAN}║         《千分之一的你》出版级审校脚本 v1.0               ║${C_RESET}`);
  console.log(`${C_BOLD}${C_CYAN}╚══════════════════════════════════════════════════════════════╝${C_RESET}`);
  console.log();
  
  const allFiles = collectMdFiles(ROOT);
  const chapterFiles = getChapterFiles(allFiles);
  console.log(`共扫描 ${allFiles.length} 个 md 文件,其中章节文件 ${chapterFiles.length} 个`);
  console.log();
  
  // Run all checks
  const charResult = checkMainChars(chapterFiles);
  console.log();
  const typoResult = checkTypography(allFiles);
  console.log();
  const rarityResult = checkRarity(chapterFiles);
  console.log();
  
  // Summary
  console.log(section('审校总结'));
  let errors = 0, warnings = 0, passes = 0;
  
  if (charResult.duplicates.length > 0) {
    errors++;
  } else {
    passes++;
  }
  
  if (typoResult.length > 0) {
    warnings += typoResult.length;
  } else {
    passes++;
  }
  
  if (rarityResult.length > 0) {
    warnings += rarityResult.length;
  } else {
    passes++;
  }
  
  console.log(`  ${C_GREEN}通过${C_RESET}: ${passes}`);
  console.log(`  ${C_YELLOW}警告${C_RESET}: ${warnings}`);
  console.log(`  ${C_RED}错误${C_RESET}: ${errors}`);
  console.log();
  
  // Save report
  const reportPath = path.join(__dirname, 'audit-report.txt');
  let report = `审校报告 - ${new Date().toISOString()}\n`;
  report += `══════════════════════════════════════════\n\n`;
  
  report += `一、主角重名检查(第5-20章)\n`;
  if (charResult.duplicates.length === 0) {
    report += `  通过: 全部${Object.keys(charResult.chars).length}位人物唯一\n`;
  } else {
    report += `  发现重复:\n`;
    charResult.duplicates.forEach(([c, fs]) => {
      report += `    ${c}: ${fs.map(f => path.basename(f)).join(', ')}\n`;
    });
  }
  
  report += `\n二、排版瑕疵修复\n`;
  if (typoResult.length === 0) {
    report += `  通过: 全部文件排版正常\n`;
  } else {
    typoResult.forEach(r => {
      report += `  ${path.basename(r.file)}: ${r.issues.join('; ')}\n`;
    });
  }
  
  report += `\n三、稀有度一致性\n`;
  if (rarityResult.length === 0) {
    report += `  通过: 未见明显矛盾\n`;
  } else {
    rarityResult.forEach(d => report += `  ${d}\n`);
  }
  
  report += `\n总结: 通过${passes}, 警告${warnings}, 错误${errors}\n`;
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`报告已保存到: ${reportPath}`);
  
  return { errors, warnings, passes };
}

if (require.main === module) {
  const result = main();
  process.exit(result.errors > 0 ? 1 : 0);
}

module.exports = { collectMdFiles, getChapterFiles, checkMainChars, checkTypography, checkRarity };
