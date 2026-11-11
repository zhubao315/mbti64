#!/usr/bin/env node
/**
 * 从第六卷（刻意练习工程）抽取「30 天行为实验实验室」的结构化数据
 *
 * 【抽什么】
 *   第 23 章 · 一、职场四象限          → quadrants（4 个象限）
 *   第 23 章 · 二、亲密关系潜台词翻译器 → dictionary（20 组吵架翻译）
 *   第 24 章 · 30 天表格              → days（30 天）+ weeks（4 周）
 *
 * 【为什么】
 * 书里已经有一整套可执行的练习设计，网站应该把它变成能打卡、能复盘的工具，
 * 而不是让读者自己从书里抄表。
 *
 * 【单一事实源】
 * 内容仍以书稿为准（本脚本只做结构化切分，不新增文案）。
 * 书稿改了，重跑本脚本即可；产物 data/practiceLab.json 入库，
 * 站点直接读它，不需要在运行时解析 Markdown。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOOK = path.join(ROOT, "书-千分之一的你", "06-第六卷-刻意练习工程");

const CH23 = path.join(BOOK, "第23章-二阶跨族镜像对标手册.md");
const CH24 = path.join(BOOK, "第24章-30天人格探索与行为练习计划.md");

/** 去掉 Markdown 强调与行内代码 */
function plain(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\\\|/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

/** 解析一段 Markdown 表格，返回 { header: string[], rows: string[][] } */
function parseTable(lines) {
  const tableLines = lines.filter((l) => l.trim().startsWith("|"));
  if (tableLines.length < 2) return null;
  const cells = (l) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => plain(c));
  const header = cells(tableLines[0]);
  const rows = [];
  for (const l of tableLines.slice(1)) {
    const c = cells(l);
    // 跳过 |---|---| 分隔行
    if (c.every((x) => /^:?-{2,}:?$/.test(x))) continue;
    rows.push(c);
  }
  return { header, rows };
}

function readChapter(file) {
  if (!fs.existsSync(file)) {
    console.error(`ERROR: 找不到章节 ${file}`);
    process.exit(1);
  }
  return fs.readFileSync(file, "utf8");
}

/* ---------------------------------------------------------------- 四象限 */

function extractQuadrants(text) {
  const m = text.match(/## 一、职场四象限[\s\S]*?(?=\n## )/);
  if (!m) return [];
  const t = parseTable(m[0].split("\n"));
  if (!t) return [];
  return t.rows
    .filter((r) => r.length >= 6 && r[0])
    .map((r) => ({
      name: r[0],
      coreAction: r[1],
      behavior: r[2],
      bestSuffix: r[3],
      scenes: r[4],
      risk: r[5],
    }));
}

/* -------------------------------------------------------- 潜台词翻译词典 */

function extractDictionary(text) {
  const m = text.match(/## 二、亲密关系潜台词翻译器[\s\S]*?(?=\n## )/);
  if (!m) return [];
  const section = m[0];
  const out = [];
  // 每个 ### 小节是一组对照（如「T-A(坚定思考)说 vs F-C(审慎情感)听」）
  const parts = section.split(/\n### /).slice(1);
  for (const part of parts) {
    const lines = part.split("\n");
    const pair = plain(lines[0]);
    const t = parseTable(lines);
    if (t) {
      // 列：说的原话 | 听成了 | 行为切入点 | 你应该说
      for (const r of t.rows) {
        if (r.length < 4) continue;
        if (!r[0] || !/^「/.test(r[0])) continue;
        out.push({
          pair,
          surface: r[0],
          misheard: r[1],
          mechanism: r[2],
          reply: r[3],
        });
      }
      continue;
    }

    // 「族群特有吵架场景」用的是条目式写法：
    //   **NT 族群(...)最容易踩的雷:把辩论当游戏**
    //   - **你说的**:「...」
    //   - **伴侣听成了**:「...」
    //   - **你应该说**:「...」
    const blocks = part.split(/\n\*\*/).slice(1);
    for (const block of blocks) {
      const head = plain(block.split("\n")[0]);
      const grab = (label) => {
        const hit = block.match(new RegExp(`\\*\\*${label}\\*\\*[:：]\\s*([^\n]+)`));
        return hit ? plain(hit[1]) : "";
      };
      const surface = grab("你说的") || grab("你做的");
      const misheard = grab("伴侣听成了");
      const reply = grab("你应该说");
      if (!surface || !misheard || !reply) continue;
      out.push({
        pair: head,
        surface,
        misheard,
        mechanism: "",
        reply,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------ 30 天计划 */

function extractPlan(text) {
  const weeks = [];
  for (const m of text.matchAll(/## 第([一二三四])周 · ([^(]+)\((Day [^)]+)\):(.+)/g)) {
    weeks.push({
      week: ["一", "二", "三", "四"].indexOf(m[1]) + 1,
      title: plain(m[2]),
      range: plain(m[3]),
      focus: plain(m[4]),
    });
  }

  const days = [];
  // 每个周小节里有一张表：Day | 具体微动作 | 对应练习方向 | 晚间回顾提问
  const parts = text.split(/\n## 第[一二三四]周/).slice(1);
  for (const part of parts) {
    const t = parseTable(part.split("\n"));
    if (!t) continue;
    for (const r of t.rows) {
      const day = Number(r[0]);
      if (!Number.isFinite(day) || day < 1 || day > 30) continue;
      if (r.length < 4) continue;
      days.push({
        day,
        action: r[1],
        direction: r[2],
        question: r[3],
      });
    }
  }
  days.sort((a, b) => a.day - b.day);
  return { weeks, days };
}

/* ------------------------------------------------------------------ 主流程 */

const ch23 = readChapter(CH23);
const ch24 = readChapter(CH24);

const quadrants = extractQuadrants(ch23);
const dictionary = extractDictionary(ch23);
const { weeks, days } = extractPlan(ch24);

if (quadrants.length !== 4) {
  console.error(`ERROR: 职场四象限应�� 4 条，实际 ${quadrants.length} 条`);
  process.exit(1);
}
if (dictionary.length !== 20) {
  console.error(`ERROR: 潜台词翻译词典应有 20 组，实际 ${dictionary.length} 组`);
  process.exit(1);
}
if (days.length !== 30) {
  console.error(`ERROR: 30 天计划应有 30 条，实际 ${days.length} 条`);
  process.exit(1);
}

const out = {
  generatedAt: new Date().toISOString(),
  bookVersion: "v1.0-192k",
  source: {
    quadrants: "第23章 · 一、职场四象限",
    dictionary: "第23章 · 二、亲密关系潜台词翻译器",
    days: "第24章 · 30 天人格探索与行为练习计划",
  },
  quadrants,
  dictionary,
  weeks,
  days,
};

const outPath = path.join(ROOT, "data", "practiceLab.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

console.log(`✅ 练习实验室数据已抽取：${outPath}`);
console.log(`   四象限 ${quadrants.length} 条 · 潜台词翻译 ${dictionary.length} 组 · 30 天计划 ${days.length} 天`);
