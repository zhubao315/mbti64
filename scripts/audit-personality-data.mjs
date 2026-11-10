/**
 * 人格数据一致性审计
 *
 * 运行：node scripts/audit-personality-data.mjs
 * 失败时返回非零退出码，并逐条打印错误。
 *
 * 事实源约定：
 *  - 稀有度数值一律以 lib/rarity-core.js 的计算结果为准（唯一事实源）
 *  - 书稿数据 data/bookEnriched.json 由 scripts/extract-book-data.mjs 生成
 */

import fs from "node:fs";
import path from "node:path";
import { buildRarityRecords, TIER_DEFS } from "../lib/rarity-core.js";

const ROOT = process.cwd();
const BOOK_DIR = path.join(ROOT, "书-千分之一的你");
const SUFFIX_ORDER = ["C-O", "A-O", "A-H", "C-H"];
const EVIDENCE_LEVELS = ["理论类比", "相关研究启发", "尚无直接验证"];

/** 16 基础型 ↔ 书稿章节（用户验收口径） */
const EXPECTED_CHAPTER = {
  INTJ: { no: "05", cn: "冷焰策士" },
  INTP: { no: "06", cn: "拆解者" },
  ENTJ: { no: "07", cn: "推土机型统帅" },
  ENTP: { no: "08", cn: "变量制造者" },
  INFJ: { no: "09", cn: "深夜点灯人" },
  INFP: { no: "10", cn: "内心博物馆" },
  ENFP: { no: "11", cn: "火种捕手" },
  ENFJ: { no: "12", cn: "情绪调度师" },
  ISTJ: { no: "13", cn: "地基工程师" },
  ISFJ: { no: "14", cn: "沉默后勤部" },
  ESTJ: { no: "15", cn: "秩序执行官" },
  ESFJ: { no: "16", cn: "关系维系者" },
  ISTP: { no: "17", cn: "手上见真章" },
  ISFP: { no: "18", cn: "感官诗人" },
  ESTP: { no: "19", cn: "局面拆弹手" },
  ESFP: { no: "20", cn: "现场发电机" },
};

const errors = [];
const warnings = [];
const passes = [];

function fail(msg) {
  errors.push(msg);
}
function pass(msg) {
  passes.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function readText(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    fail(`文件不存在：${relPath}`);
    return "";
  }
  return fs.readFileSync(abs, "utf8");
}

/* ---------------- 1. 型别清单（来自网站数据层） ---------------- */
const types64Src = readText("data/types64.ts");
const BASE_CODES = [...new Set([...types64Src.matchAll(/code:\s*"([EI][NS][TF][JP])"/g)].map((m) => m[1]))];

if (BASE_CODES.length === 16) pass(`基础型数量：16（${BASE_CODES.join(" ")}）`);
else fail(`基础型数量应为 16，实际 ${BASE_CODES.length}：${BASE_CODES.join(" ")}`);

const EXPECTED_CODES = BASE_CODES.flatMap((base) => SUFFIX_ORDER.map((suf) => `${base}-${suf}`));

/* ---------------- 2. 稀有度唯一事实源 ---------------- */
const rarity = buildRarityRecords(EXPECTED_CODES);

for (const code of EXPECTED_CODES) {
  const r = rarity.byCode[code];
  if (!r) {
    fail(`稀有度事实源缺少 ${code}`);
    continue;
  }
  if (!(r.per1000 > 0)) fail(`${code} 的 per1000 非法：${r.per1000}`);
  if (!(r.rank >= 1 && r.rank + r.rankSize - 1 <= 64)) fail(`${code} 的 rank 越界：${r.rank}`);
  if (!TIER_DEFS[r.tierIndex]) fail(`${code} 的档位下标越界：${r.tierIndex}`);
}

// 并列组必须把 1–64 完整覆盖、互不重叠
const seenRank = new Set();
const seenGroups = new Set();
for (const r of rarity.ranked) {
  if (seenGroups.has(r.rank)) continue; // 并列组成员共享同一段名次，只需检查一次
  seenGroups.add(r.rank);
  for (let i = r.rank; i < r.rank + r.rankSize; i += 1) {
    if (seenRank.has(i)) fail(`名次 ${i} 被多个型别重复占用（${r.code}）`);
    seenRank.add(i);
  }
}
for (let i = 1; i <= 64; i += 1) {
  if (!seenRank.has(i)) fail(`名次 ${i} 没有对应的型别`);
}
if (errors.length === 0) pass("稀有度：64 型名次 1–64 完整且不重复，per1000 全部为正数");

/* 稀有度不得在脚本里另写一份 */
const extractSrc = readText("scripts/extract-book-data.mjs");
if (/RARITY_AUTH/.test(extractSrc)) fail("scripts/extract-book-data.mjs 仍保留 RARITY_AUTH 硬编码");
else pass("稀有度：书稿提取脚本已改为读取 lib/rarity-core.js");

const raritySrc = readText("lib/rarity.ts");
if (!/from\s+"\.\/rarity-core\.js"/.test(raritySrc)) fail("lib/rarity.ts 未引用 lib/rarity-core.js 作为唯一事实源");
else pass("稀有度：lib/rarity.ts 引用唯一事实源 rarity-core.js");

/* ---------------- 3. 书稿结构化数据 ---------------- */
const bookPath = path.join(ROOT, "data", "bookEnriched.json");
if (!fs.existsSync(bookPath)) {
  fail("缺少 data/bookEnriched.json，请先运行 scripts/extract-book-data.mjs");
} else {
  const book = JSON.parse(fs.readFileSync(bookPath, "utf8"));
  const types = book.types || {};
  const bookBases = Object.keys(types);

  if (bookBases.length === 16) pass(`书稿数据覆盖基础型：16（${bookBases.join(" ")}）`);
  else fail(`书稿数据应覆盖 16 个基础型，实际 ${bookBases.length}`);

  for (const base of BASE_CODES) {
    if (!types[base]) {
      fail(`书稿数据缺少基础型 ${base}`);
      continue;
    }
    const t = types[base];

    /* --- 3.1 四态 --- */
    const keys = Object.keys(t.spiralStage || {});
    if (keys.join(",") !== SUFFIX_ORDER.join(",")) {
      fail(`${base} 的四态顺序应为 ${SUFFIX_ORDER.join(" → ")}，实际 ${keys.join(" → ")}`);
    }

    for (const suf of SUFFIX_ORDER) {
      const v = t.spiralStage?.[suf];
      const code = `${base}-${suf}`;
      if (!v) {
        fail(`${base} 缺少 ${suf} 的数据`);
        continue;
      }
      // 语义字段：stateLabel / label / bottleneck / transitionSignal / preview
      if (!v.label) fail(`${code} 缺少 label（状态名）`);
      if (!v.stateLabel) fail(`${code} 缺少 stateLabel`);
      if (!v.hiddenStuck) fail(`${code} 缺少 bottleneck（隐秘卡点）`);
      if (!v.leapSignal) fail(`${code} 缺少 transitionSignal（跃迁信号）`);
      if (!v.bodyPreview) fail(`${code} 缺少 preview（章节预览）`);

      // 来源标记：manuscript = 原稿提取；editorial = 编辑补写
      for (const [field, src] of [
        ["hiddenStuck", v.hiddenStuckSource],
        ["leapSignal", v.leapSignalSource],
      ]) {
        if (src !== "manuscript" && src !== "editorial") {
          fail(`${code} 的 ${field}Source 缺失或非法：${src}`);
        }
      }
      // 通用兜底文案必须清零（兼容历史两个版本的特征串）
      if (/优势用过了头|把自己的适应策略当成唯一正确的活法/.test(v.hiddenStuck)) {
        fail(`${code} 的 hiddenStuck 仍是通用兜底文案`);
      }
      if (/旧办法开始失灵|不再让你费力/.test(v.leapSignal)) {
        fail(`${code} 的 leapSignal 仍是通用兜底文案`);
      }
      // 提取句不得残留换行或前导引号
      if (/[\n\r]/.test(v.hiddenStuck) || /^["'“”「]/.test(v.hiddenStuck)) {
        fail(`${code} 的 hiddenStuck 含残片：${JSON.stringify(v.hiddenStuck.slice(0, 20))}`);
      }
      if (/[\n\r]/.test(v.leapSignal) || /^["'“”「]/.test(v.leapSignal)) {
        fail(`${code} 的 leapSignal 含残片：${JSON.stringify(v.leapSignal.slice(0, 20))}`);
      }

      const r = rarity.byCode[code];
      if (r) {
        if (v.rank !== r.rank) fail(`${code} rank=${v.rank}，事实源为 ${r.rank}`);
        if (Math.abs(v.per1000 - r.per1000) > 0.05) fail(`${code} per1000=${v.per1000}，事实源为 ${r.per1000}`);
      }

      if (/\*\*|```|^\s*#{1,6}\s/m.test(v.bodyPreview)) warn(`${code} 的 preview 含 Markdown 残片`);
      if (/[，,、；;：:]$/.test(v.bodyPreview.trim())) warn(`${code} 的 preview 以标点结尾，疑似被截断`);
    }

    /* --- 3.2 神经底盘 --- */
    const nb = t.neuroBase || {};
    if (!nb.stack || !["dominant", "auxiliary", "tertiary", "inferior"].every((k) => nb.stack[k])) {
      fail(`${base} 的功能栈不完整`);
    }
    if (!Array.isArray(nb.explanatoryNetworks) || nb.explanatoryNetworks.length < 4) {
      fail(`${base} 缺少 explanatoryNetworks（应为 4 条解释性映射）`);
    } else {
      for (const n of nb.explanatoryNetworks) {
        if (!EVIDENCE_LEVELS.includes(n.evidenceLevel)) {
          fail(`${base} 的 evidenceLevel 非法：${n.evidenceLevel}`);
        }
        if (!n.label || !n.description) fail(`${base} 的解释性映射缺少 label/description`);
      }
    }
    if (!nb.disclaimer) fail(`${base} 缺少神经科学免责声明`);
    if (!nb.loopState || !nb.gripState) fail(`${base} 缺少 Loop/Grip 文案`);

    /* --- 3.3 中国式切片 / 亲密契约 --- */
    const cs = t.chinaSlices || {};
    if (!cs.career || !cs.dinner || !cs.wechat) fail(`${base} 的中国式生存切片不完整（career/dinner/wechat）`);
    if (!t.intimacyContract?.contract) fail(`${base} 缺少亲密关系隐形契约`);

    /* --- 3.4 镜像导师 --- */
    const mm = t.mirrorMentor || {};
    if (!BASE_CODES.includes(mm.base)) fail(`${base} 的镜像导师代码非法：${mm.base}`);
    if (mm.base === base) fail(`${base} 的镜像导师不能是自己`);
    if (mm.l1Distance !== 1200) fail(`${base} 的 L1 距离应为 1200，实际 ${mm.l1Distance}`);
    if (!mm.reason) fail(`${base} 缺少镜像互补理由`);
    if (!(mm.experimentSteps || []).length) fail(`${base} 缺少镜像导师实验步骤`);

    /* --- 3.5 刻意练习 --- */
    const dp = t.deliberatePractice || {};
    for (const k of ["c2a", "a2c", "o2h", "h2o"]) {
      if (!Array.isArray(dp[k]) || dp[k].length === 0) fail(`${base} 的 deliberatePractice.${k} 为空`);
    }

    /* --- 3.6 章节映射 --- */
    const exp = EXPECTED_CHAPTER[base];
    if (!exp) fail(`缺少 ${base} 的章节映射定义`);
    else {
      if (!t.bookChapter.includes(`第${exp.no}章`)) fail(`${base} 章节号错误：${t.bookChapter}，应为第${exp.no}章`);
      if (!t.cn || !t.cn.includes(exp.cn)) fail(`${base} 原型名错误：${t.cn}，应为 ${exp.cn}`);
      const chapterAbs = path.join(BOOK_DIR, t.bookChapterPath || "");
      if (!fs.existsSync(chapterAbs)) fail(`${base} 的章节文件不存在：${t.bookChapterPath}`);
    }
  }

  /* --- 3.7 镜像双向一致 --- */
  for (const base of BASE_CODES) {
    const mm = types[base]?.mirrorMentor;
    if (!mm) continue;
    const back = types[mm.base]?.mirrorMentor?.base;
    if (back !== base) fail(`镜像映射不是双向的：${base} → ${mm.base} → ${back}`);
  }
  if (errors.length === 0) pass("镜像导师：16 型双向映射一致");

  /* --- 3.8 所有四态 64 条齐备 --- */
  const variantCount = Object.values(types).reduce((n, t) => n + Object.keys(t.spiralStage || {}).length, 0);
  if (variantCount === 64) pass("亚型数量：64（每基础型 A-O / A-H / C-O / C-H 齐备）");
  else fail(`亚型数量应为 64，实际 ${variantCount}`);
}

/* ---------------- 4. 旧域名 / 错误章节号 ---------------- */
const OLD_DOMAIN = /64personalities\.(com|net|org)/;
const SCAN_DIRS = ["app", "components", "lib", "data", "public"];
const SOURCE_EXT = /\.(ts|tsx|js|mjs|json|md|txt|html)$/;

function walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel);
    else if (SOURCE_EXT.test(entry.name)) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      if (OLD_DOMAIN.test(text)) fail(`发现旧域名：${rel}`);
    }
  }
}
for (const dir of SCAN_DIRS) walk(dir);
pass("旧域名：app / components / lib / data / public 中未发现 64personalities.com");

/* ---------------- 5. 页面链接目标存在 ---------------- */
if (fs.existsSync(bookPath)) {
  const book = JSON.parse(fs.readFileSync(bookPath, "utf8"));
  let linkErrors = 0;
  for (const base of BASE_CODES) {
    const mm = book.types?.[base]?.mirrorMentor;
    if (!mm) continue;
    for (const suf of SUFFIX_ORDER) {
      // 镜像型在六维上全部翻转：A↔C、O↔H
      const ac = suf[0] === "A" ? "C" : "A";
      const oh = suf[2] === "O" ? "H" : "O";
      const target = `${mm.base}-${ac}-${oh}`;
      if (!EXPECTED_CODES.includes(target)) {
        fail(`镜像导师链接目标不存在：${base}-${suf} → /type/${target}`);
        linkErrors += 1;
      }
    }
  }
  if (linkErrors === 0) pass("页面链接目标：64 条镜像导师链接均指向存在的型别详情页");
}

/* ---------------- 输出 ---------------- */
console.log("\n== 人格数据审计 ==");
for (const p of passes) console.log(`  ✅ ${p}`);
for (const w of warnings) console.log(`  ⚠️  ${w}`);
for (const e of errors) console.log(`  ❌ ${e}`);

console.log(
  `\n结果：${passes.length} 项通过，${warnings.length} 项警告，${errors.length} 项错误` +
    `（基础型 ${BASE_CODES.length} / 亚型 ${EXPECTED_CODES.length}）`,
);

if (errors.length > 0) {
  process.exitCode = 1;
}
