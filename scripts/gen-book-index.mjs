/**
 * 附录 C · 64 型索引生成器
 *
 * 唯一事实源：docs/64型稀有度权威数据.json（由 lib/rarity-core.js 经
 * scripts/gen-rarity-table.mjs 生成）。称号从 00-总控/术语表与16原型.md 解析，
 * 避免索引里的中文称号与官方定义漂移。
 *
 * 运行：node scripts/gen-book-index.mjs
 * 输出：书-千分之一的你/07-卷末/03-附录C-64型索引.md
 *
 * 重要：本表数值是模型计算结果，不是人口统计；64 个型别全部存在并列名次，
 *       因此本表不输出「第 N/64」这类单一名次。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = path.join(ROOT, "docs", "64型稀有度权威数据.json");
const GLOSSARY_PATH = path.join(
  ROOT,
  "书-千分之一的你",
  "00-总控-单一事实源",
  "术语表与16原型.md",
);
const OUT_PATH = path.join(
  ROOT,
  "书-千分之一的你",
  "07-卷末",
  "03-附录C-64型索引.md",
);

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const glossary = fs.readFileSync(GLOSSARY_PATH, "utf8");

// 从官方术语表解析 16 基础型称号：| `INTJ` | **冷焰策士** | ... |
const nicknames = new Map();
for (const m of glossary.matchAll(/^\|\s*`([A-Z]{4})`\s*\|\s*\*\*(.+?)\*\*/gm)) {
  nicknames.set(m[1], m[2].trim());
}
if (nicknames.size !== 16) {
  throw new Error(`称号解析异常：预期 16 个，实际 ${nicknames.size} 个`);
}

const GROUPS = [
  { name: "分析师 Analyst · NT", en: "NT", codes: ["INTJ", "INTP", "ENTJ", "ENTP"] },
  { name: "外交家 Diplomat · NF", en: "NF", codes: ["INFJ", "INFP", "ENFP", "ENFJ"] },
  { name: "守护者 Guardian · SJ", en: "SJ", codes: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"] },
  { name: "冒险家 Adventurer · SP", en: "SP", codes: ["ISTP", "ISFP", "ESTP", "ESFP"] },
];

const SUFFIXES = [
  { code: "C-O", label: "审慎探索" },
  { code: "A-O", label: "坚定探索" },
  { code: "A-H", label: "坚定守成" },
  { code: "C-H", label: "审慎守成" },
];

const byCode = data.byCode;
const allCodes = Object.keys(byCode);
if (allCodes.length !== 64) {
  throw new Error(`权威数据异常：预期 64 个型别，实际 ${allCodes.length} 个`);
}
for (const code of allCodes) {
  const rec = byCode[code];
  if (!rec || !Number.isFinite(rec.per1000) || !rec.rankLabel) {
    throw new Error(`权威数据缺字段：${code}`);
  }
}

const sorted = [...allCodes].sort(
  (a, b) => byCode[a].per1000 - byCode[b].per1000 || a.localeCompare(b),
);
const min = Math.min(...allCodes.map((c) => byCode[c].per1000));
const max = Math.max(...allCodes.map((c) => byCode[c].per1000));
const allTied = allCodes.every((c) => byCode[c].rankSize > 1);

const lines = [];
lines.push("# 附录 C · 64 型索引");
lines.push("");
lines.push("> **数据来源**：`lib/rarity-core.js` → `docs/64型稀有度权威数据.json` → 本表，由 `scripts/gen-book-index.mjs` 自动生成，请勿手改。");
lines.push("> **重要**：档位、并列名次与「每千人约 X.X 人」都是**模型计算结果，不是人口统计**；六个先验参数无可靠人群统计依据，六维独立只是模型假设。");
lines.push("> 64 个型别全部存在同概率并列，因此本表只写并列区间（如 `1–2`），不写「第 N/64」这类单一名次。计算式与局限见附录 A。");
lines.push("");
lines.push("## 使用方式");
lines.push("");
lines.push("- 想找自己的型别：先按族群定位四字母，再看该基础型下的四行。");
lines.push("- 想核对某个数值：查 §C.2 的按稀有度升序总表。");
lines.push("- 想看某一档有哪些组合：查 §C.3 的档位速查。");
lines.push("");
lines.push("**编码格式**：`基础型-决策姿态-变化策略`，例如 `INFJ-C-O`。四种后缀状态 `C-O` 审慎探索 / `A-O` 坚定探索 / `A-H` 坚定守成 / `C-H` 审慎守成，可相互转换，不是人生阶段。");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## C.1 按族群与基础型速查");
lines.push("");

for (const group of GROUPS) {
  lines.push(`### ${group.name}`);
  lines.push("");
  for (const base of group.codes) {
    const nick = nicknames.get(base) ?? "—";
    lines.push(`#### \`${base}\` · ${nick}`);
    lines.push("");
    lines.push("| 64 型编码 | 后缀状态 | 档位 | 并列名次 | 每千人约 |");
    lines.push("|:---|:---|:---|:---:|---:|");
    for (const s of SUFFIXES) {
      const code = `${base}-${s.code}`;
      const r = byCode[code];
      if (!r) throw new Error(`权威数据缺型别：${code}`);
      lines.push(
        `| \`${code}\` | ${s.label} | ${r.tier} | ${r.rankLabel} | ${r.per1000.toFixed(1)} 人 |`,
      );
    }
    lines.push("");
  }
}

lines.push("---");
lines.push("");
lines.push("## C.2 按理论稀有度升序总表（64 型）");
lines.push("");
lines.push("| 序 | 64 型编码 | 档位 | 并列名次 | 并列型数 | 每千人约 |");
lines.push("|---:|:---|:---|:---:|---:|---:|");
sorted.forEach((code, i) => {
  const r = byCode[code];
  lines.push(
    `| ${i + 1} | \`${code}\` | ${r.tier} | ${r.rankLabel} | ${r.rankSize} | ${r.per1000.toFixed(1)} 人 |`,
  );
});
lines.push("");
lines.push("> 「序」只用于本表的排版顺序，**不是名次**；同概率型别请用「并列名次」列。");
lines.push("");

lines.push("---");
lines.push("");
lines.push("## C.3 按档位速查");
lines.push("");
lines.push("| 档序 | 档位 | 型别数 | 组合 |");
lines.push("|---:|:---|---:|:---|");
data.tiers.forEach((tier, i) => {
  const codes = sorted.filter((c) => byCode[c].tierIndex === i);
  const name = typeof tier === "string" ? tier : tier.name;
  lines.push(`| ${i} | ${name} | ${codes.length} | ${codes.map((c) => `\`${c}\``).join("、")} |`);
});
lines.push("");

lines.push("---");
lines.push("");
lines.push("## C.4 校验摘要");
lines.push("");
lines.push(`- 型别总数：${allCodes.length}`);
lines.push(`- 存在并列名次的型别：${allCodes.filter((c) => byCode[c].rankSize > 1).length}（全部并列：${allTied ? "是" : "否"}）`);
lines.push(`- 每千人理论值范围：${min.toFixed(1)} – ${max.toFixed(1)} 人`);
lines.push(`- 六维先验：E/I 55:45、S/N 65:35、T/F 50:50、J/P 55:45、A/C 60:40、O/H 45:55`);
lines.push(`- 档位数：${data.tiers.length}`);
lines.push("");
lines.push("> 档位名是体感标签，只描述模型内部的相对次序；「千分之一」是书名的文学化表达，不是统计承诺。");
lines.push("");

fs.writeFileSync(OUT_PATH, lines.join("\n"), "utf8");
console.log(`✅ 附录 C 已生成：${OUT_PATH}`);
console.log(`   ${allCodes.length} 个型别；全部并列：${allTied}；每千人 ${min.toFixed(1)} – ${max.toFixed(1)} 人`);
console.log(`   称号解析：${nicknames.size} 个；档位：${data.tiers.length} 档`);
