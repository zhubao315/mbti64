/**
 * 稀有度计算核心（纯 JS，无 TS / 框架依赖）
 *
 * 这是全站稀有度的唯一事实源实现：
 *  - lib/rarity.ts 在此基础上挂载型别元数据与配色（RARITY_TABLE / RARITY_TIERS）
 *  - scripts/extract-book-data.mjs 与 scripts/audit-personality-data.mjs 直接读取本文件
 *
 * 两层机制：
 *  1) 先验概率 = ∏ 各维极向概率（E/I 55:45、S/N 65:35、T/F 50:50、
 *     J/P 55:45、A/C 60:40、O/H 45:55）
 *  2) 稀有度档位 = 按「先验概率排名」分桶（竞争排名，同分同档），
 *     而不是直接拿概率去对「千分之一」这类绝对数值。
 */

/** 各维「poleA 侧」的基础概率（prior） */
export const DIM_PRIOR = {
  EI: 0.55, // E
  SN: 0.65, // S
  TF: 0.5, // T
  JP: 0.55, // J
  AC: 0.6, // A
  OH: 0.45, // O
};

/** 档位定义：index 即 tierIndex（0 = 最稀有） */
export const TIER_DEFS = [
  { key: "oneInTenThousand", name: "万里挑一", en: "One in Ten Thousand" },
  { key: "extremelyRare", name: "极稀有", en: "Extremely Rare" },
  { key: "rare", name: "稀有", en: "Rare" },
  { key: "oneInThousand", name: "千分之一", en: "One in a Thousand" },
  { key: "oneInHundred", name: "百分之一", en: "One in a Hundred" },
  { key: "common", name: "常见型", en: "Common" },
  { key: "everywhere", name: "无处不在", en: "Everywhere" },
];

/**
 * 分桶大小：合计 64。
 * 越稀有的档位人数越少，形成金字塔（顶部窄、底部宽）。
 */
const TIER_BUCKETS = [3, 6, 7, 10, 12, 14, 12];

/**
 * 单一型别的先验概率
 * 六维独立，逐维取对应极的概率后相乘。
 * code 形如 "INFJ-A-O"。
 */
export function priorProbability(code) {
  const [base, ac, oh] = code.split("-");
  const letters = base.split("");
  let p = 1;

  const dims = [
    ["EI", "E"],
    ["SN", "S"],
    ["TF", "T"],
    ["JP", "J"],
  ];
  dims.forEach(([dim, a], i) => {
    const pa = DIM_PRIOR[dim];
    p *= letters[i] === a ? pa : 1 - pa;
  });

  p *= ac === "A" ? DIM_PRIOR.AC : 1 - DIM_PRIOR.AC;
  p *= oh === "O" ? DIM_PRIOR.OH : 1 - DIM_PRIOR.OH;

  return p;
}

/**
 * 把并列组分档：档位目标人数来自 TIER_BUCKETS（合计 64），
 * 但实际边界会对齐到最近的「并列组边界」，保证同概率不跨档。
 * 最后一个档位收下所有剩余组。
 */
function assignTiers(sizes) {
  const targets = [];
  let acc = 0;
  for (const b of TIER_BUCKETS) {
    acc += b;
    targets.push(acc);
  }

  const ends = [];
  let run = 0;
  for (const s of sizes) {
    run += s;
    ends.push(run);
  }

  const tierCount = TIER_BUCKETS.length;
  const out = new Array(sizes.length).fill(0);
  let gi = 0;

  for (let t = 0; t < tierCount; t += 1) {
    if (t === tierCount - 1) {
      for (let g = gi; g < sizes.length; g += 1) out[g] = t;
      break;
    }
    // 给后面的每个档位至少留一个组
    const maxG = Math.max(gi, sizes.length - (tierCount - 1 - t) - 1);
    let best = gi;
    let bestDiff = Infinity;
    for (let g = gi; g <= maxG; g += 1) {
      const diff = Math.abs(ends[g] - targets[t]);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = g;
      }
    }
    for (let g = gi; g <= best; g += 1) out[g] = t;
    gi = best + 1;
  }

  return out;
}

/**
 * 计算稀有度记录。
 *
 * @param {string[]} codes 64 型代码
 * @param {(code: string) => number} [probabilityOf] 概率函数，默认纯先验
 * @returns {{
 *   ranked: Array<object>,
 *   byCode: Record<string, object>,
 *   total: number,
 * }}
 * 每条记录：{ code, prior, probability, rank, rankSize, rankLabel, per1000, beatPercent, tierIndex }
 */
export function buildRarityRecords(codes, probabilityOf = priorProbability) {
  const entries = codes.map((code) => ({
    code,
    probability: probabilityOf(code),
    prior: priorProbability(code),
  }));

  // 概率升序：rank 1 = 概率最低 = 最稀有
  entries.sort((a, b) => a.probability - b.probability || a.code.localeCompare(b.code));

  // 1) 先按「概率完全相等」切成并列组（同概率必须同档位，不能被分桶拆开）
  const groups = [];
  for (let i = 0; i < entries.length; ) {
    const value = entries[i].probability;
    let j = i;
    while (j < entries.length && Math.abs(entries[j].probability - value) < 1e-12) j += 1;
    groups.push({ start: i, size: j - i, value });
    i = j;
  }

  // 2) 再把「并列组」整体分配到 7 档
  const tierOfGroup = assignTiers(groups.map((g) => g.size));

  const ranked = [];
  const total = entries.length;
  let rank = 1;

  for (let gi = 0; gi < groups.length; gi += 1) {
    const group = groups[gi];
    const rankSize = group.size;
    const rankLabel = rankSize === 1 ? `${rank}` : `${rank}–${rank + rankSize - 1}`;
    const tierIndex = tierOfGroup[gi];

    const groupShare = group.value * rankSize;
    let cumulativeRarer = 0;
    for (let k = 0; k < group.start; k += 1) cumulativeRarer += entries[k].probability;
    // 比它更常见的人群占比：越稀有的型别越大
    const beatPercent = Math.round((1 - cumulativeRarer - groupShare) * 1000) / 10;

    for (let k = group.start; k < group.start + rankSize; k += 1) {
      ranked.push({
        code: entries[k].code,
        prior: entries[k].prior,
        probability: group.value,
        rank,
        rankSize,
        rankLabel,
        per1000: Math.max(0.1, Math.round(group.value * 10000) / 10),
        beatPercent,
        tierIndex,
      });
    }
    rank += rankSize;
  }

  const byCode = {};
  for (const r of ranked) byCode[r.code] = r;

  return { ranked, byCode, total };
}
