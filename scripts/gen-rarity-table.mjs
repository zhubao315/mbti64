/**
 * 64 型稀有度权威表生成器
 *
 * 唯一事实源：lib/rarity-core.js（DIM_PRIOR / TIER_DEFS / buildRarityRecords）
 * 运行：node scripts/gen-rarity-table.mjs
 * 输出：docs/64型稀有度权威表.md
 *
 * 用途：出版审校时核对书稿、图表、网站三处的档位、并列名次与每千人数值。
 * 重要：表中数值是「六维先验相乘」的模型计算结果，六维独立只是模型假设，
 *       不是真实人群统计，也不是对任一人格组合真实发生率的承诺。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRarityRecords, DIM_PRIOR, TIER_DEFS } from "../lib/rarity-core.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BASE_CODES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFP", "ENFJ",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];
const SUFFIX_ORDER = ["C-O", "A-O", "A-H", "C-H"];
const codes = BASE_CODES.flatMap((b) => SUFFIX_ORDER.map((s) => `${b}-${s}`));

const { ranked, byCode } = buildRarityRecords(codes);

const priorRows = [
  ["E/I", DIM_PRIOR.EI],
  ["S/N", DIM_PRIOR.SN],
  ["T/F", DIM_PRIOR.TF],
  ["J/P", DIM_PRIOR.JP],
  ["A/C", DIM_PRIOR.AC],
  ["O/H", DIM_PRIOR.OH],
];

const lines = [];
lines.push("# 64 型稀有度权威表");
lines.push("");
lines.push("> **唯一事实源**：`lib/rarity-core.js`。本表由 `scripts/gen-rarity-table.mjs` 自动生成，请勿手改。");
lines.push("> **用途**：书稿、图表、网站榜单三处数值对齐的核对基准。");
lines.push("");
lines.push("## 模型边界（务必随表引用）");
lines.push("");
lines.push("1. 六个先验参数目前**没有可靠的人群统计依据**，是为构造相对次序而设定的模型参数。");
lines.push("2. 六维相互独立属于**模型假设**，不是真实人群的已证实规律。");
lines.push("3. 按 64 型内部排名分成七档，**不代表真实人口分布**；档位名是体感标签。");
lines.push("4. 书名「千分之一」是文学化的独特性表达，**不是统计承诺**。按本模型计算，最稀有组合约为每千人 6.4 人。");
lines.push("5. 64 个型别全部存在同概率并列，因此书稿不宜使用「第 N/64」这类单一名次；建议只写档位与每千人数值。");
lines.push("");
lines.push("## 六维先验参数");
lines.push("");
lines.push("| 维度 | A 端先验 |");
lines.push("|:---|---:|");
for (const [dim, p] of priorRows) lines.push(`| ${dim} | ${Math.round(p * 100)}% |`);
lines.push("");
lines.push("## 七档定义");
lines.push("");
lines.push("| 档序 | 档位名 | 英文 |");
lines.push("|---:|:---|:---|");
TIER_DEFS.forEach((t, i) => lines.push(`| ${i} | ${t.name} | ${t.en} |`));
lines.push("");
lines.push("## 64 型权威数据（按稀有度升序）");
lines.push("");
lines.push("| 型别 | 档位 | 并列名次区间 | 并列型数 | 每千人约 | 理论占比 |");
lines.push("|:---|:---|:---:|---:|---:|---:|");
for (const r of ranked) {
  const tier = TIER_DEFS[r.tierIndex]?.name ?? "—";
  lines.push(
    `| \`${r.code}\` | ${tier} | ${r.rankLabel} | ${r.rankSize} | ${r.per1000.toFixed(1)} | ${(r.probability * 100).toFixed(2)}% |`,
  );
}
lines.push("");
lines.push("## 校验摘要");
lines.push("");
lines.push(`- 型别总数：${ranked.length}`);
lines.push(`- 存在并列名次的型别：${ranked.filter((r) => r.rankSize > 1).length}`);
lines.push(`- 每千人范围：${Math.min(...ranked.map((r) => r.per1000)).toFixed(1)} – ${Math.max(...ranked.map((r) => r.per1000)).toFixed(1)}`);
lines.push(`- 生成时间：${new Date().toISOString()}`);
lines.push("");

const outPath = path.join(ROOT, "docs", "64型稀有度权威表.md");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`✅ 权威表已生成：${outPath}`);
console.log(`   ${ranked.length} 个型别，全部并列：${ranked.every((r) => r.rankSize > 1)}`);

// 同时输出机读数据，供书稿同步脚本（scripts/p0_apply_book.py）使用，
// 避免改写链路里重新实现一遍概率与分档逻辑。
const dataPath = path.join(ROOT, "docs", "64型稀有度权威数据.json");
fs.writeFileSync(
  dataPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "lib/rarity-core.js",
      tiers: TIER_DEFS,
      byCode: Object.fromEntries(
        Object.entries(byCode).map(([code, r]) => [
          code,
          {
            tierIndex: r.tierIndex,
            tier: TIER_DEFS[r.tierIndex]?.name ?? "",
            rankLabel: r.rankLabel,
            rankSize: r.rankSize,
            per1000: r.per1000,
          },
        ]),
      ),
    },
    null,
    2,
  ),
  "utf8",
);
console.log(`✅ 机读数据已生成：${dataPath}`);
