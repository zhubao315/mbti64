import { ALL_TYPES, TYPE_CODES, type Type64 } from "@/data/types64";
import type { DimKey } from "@/data/schema";

/**
 * 稀有度计算
 *
 * 现实约束：六维联合概率在「先验」下只能落在约 0.6%–3.2% 区间，
 * 因此绝对意义上不存在「万里挑一」的型别。为了让「稀有度」既诚实又有体感，
 * 本项目采用两层机制：
 *
 *  1) 先验概率 = ∏ 各维极向概率（E/I 55:45、S/N 65:35、T/F 50:50、
 *     J/P 55:45、A/C 60:40、O/H 45:55）
 *  2) 稀有度档位 = 按「先验概率排名」分桶（竞争排名，同分同档），
 *     而不是直接拿概率去对「千分之一」这类绝对数值。
 *
 * 页面展示的「每 1000 人约 X 人」仍然来自真实概率（先验 × 真实统计的贝叶斯融合），
 * 因此数字彼此自洽，不会出现「0.1% 却标万年一遇」的穿帮。
 */

export type RarityTierKey =
  | "oneInTenThousand"
  | "extremelyRare"
  | "rare"
  | "oneInThousand"
  | "oneInHundred"
  | "common"
  | "everywhere";

export interface RarityTier {
  key: RarityTierKey;
  /** 展示名 */
  name: string;
  /** 英文名，用于 OG 图 */
  en: string;
  /** 排序权重，越小越稀有 */
  rank: number;
  /** 该档的分数段区间（用于 UI 说明），单位为「先验概率」 */
  note: string;
  /** 主色 */
  color: string;
  /** 浅底色 */
  soft: string;
  /** 用于卡片上的标签 */
  badge: string;
}

export const RARITY_TIERS: RarityTier[] = [
  {
    key: "oneInTenThousand",
    name: "万里挑一",
    en: "One in Ten Thousand",
    rank: 0,
    note: "金字塔顶端 · 最少见的一档",
    color: "#B04CE0",
    soft: "#F6E9FF",
    badge: "👑 万里挑一",
  },
  {
    key: "extremelyRare",
    name: "极稀有",
    en: "Extremely Rare",
    rank: 1,
    note: "非常少见，多数人身边只有一个",
    color: "#7C5CFF",
    soft: "#EDE8FF",
    badge: "💎 极稀有",
  },
  {
    key: "rare",
    name: "稀有",
    en: "Rare",
    rank: 2,
    note: "不常见，属于少数派",
    color: "#5FA8E8",
    soft: "#E8F2FD",
    badge: "✨ 稀有",
  },
  {
    key: "oneInThousand",
    name: "千分之一",
    en: "One in a Thousand",
    rank: 3,
    note: "偏少见，容易被认为是「有点特别」",
    color: "#3F9C7A",
    soft: "#E8F9F1",
    badge: "🌿 千分之一",
  },
  {
    key: "oneInHundred",
    name: "百分之一",
    en: "One in a Hundred",
    rank: 4,
    note: "中等，朋友里总能遇到一两个",
    color: "#C9A227",
    soft: "#FBF3DA",
    badge: "🔆 百分之一",
  },
  {
    key: "common",
    name: "常见型",
    en: "Common",
    rank: 5,
    note: "比较常见，聚会里大概率有同型",
    color: "#E07A3F",
    soft: "#FDEBE0",
    badge: "🍊 常见型",
  },
  {
    key: "everywhere",
    name: "无处不在",
    en: "Everywhere",
    rank: 6,
    note: "最常见的一档，遍地都是同类",
    color: "#8B85A0",
    soft: "#F1F0F5",
    badge: "🌊 无处不在",
  },
];

export const TIER_BY_KEY: Record<RarityTierKey, RarityTier> = Object.fromEntries(
  RARITY_TIERS.map((t) => [t.key, t]),
) as Record<RarityTierKey, RarityTier>;

/**
 * 分桶大小：合计 64。
 * 越稀有的档位人数越少，形成金字塔（顶部窄、底部宽）。
 */
const TIER_BUCKETS = [3, 6, 7, 10, 12, 14, 12] as const;

/** 各维「poleA 侧」的基础概率（prior） */
export const DIM_PRIOR: Record<DimKey, number> = {
  EI: 0.55, // E
  SN: 0.65, // S
  TF: 0.5, // T
  JP: 0.55, // J
  AC: 0.6, // A
  OH: 0.45, // O
};

/** 真实统计兜底：当后端没有数据时用同一套先验，保证前后一致 */
export interface RealStats {
  /** key = 64 型编码，value = 该型人数 */
  counts: Record<string, number>;
  /** 总样本量 */
  total: number;
}

/**
 * 单一型别的先验概率
 * 六维独立，逐维取对应极的概率后相乘。
 */
export function priorProbability(code: string): number {
  const [base, ac, oh] = code.split("-");
  const letters = base.split("");
  let p = 1;

  // EI / SN / TF / JP：第一位是 poleA 侧
  const dims: Array<[DimKey, string, string]> = [
    ["EI", "E", "I"],
    ["SN", "S", "N"],
    ["TF", "T", "F"],
    ["JP", "J", "P"],
  ];
  dims.forEach(([dim, a, b], i) => {
    const pa = DIM_PRIOR[dim];
    p *= letters[i] === a ? pa : 1 - pa;
  });

  // AC / OH
  const acA = DIM_PRIOR.AC;
  p *= ac === "A" ? acA : 1 - acA;
  const ohA = DIM_PRIOR.OH;
  p *= oh === "O" ? ohA : 1 - ohA;

  return p;
}

export interface RankedType {
  code: string;
  /** 先验概率（0–1） */
  prior: number;
  /** 融合后概率（0–1），有真实统计时更贴近现实 */
  probability: number;
  /** 竞争排名（1 = 最稀有），同概率同排名 */
  rank: number;
  /** 样本总数（64），供文案使用 */
  total: number;
  /** 同排名型别数量 */
  rankSize: number;
  /** 名次区间的展示，如 "1–3" */
  rankLabel: string;
  /** 每 1000 人约几人（至少保留 1 位小数） */
  per1000: number;
  /** 超过了百分之多少的人（0–100，越大越稀有） */
  beatPercent: number;
  tier: RarityTier;
  type: Type64;
}

export interface RarityTable {
  ranked: RankedType[];
  byCode: Record<string, RankedType>;
  total: number;
  source: "prior" | "blended";
  sampleSize: number;
}

function buildRanked(probabilityOf: (code: string) => number, source: RarityTable["source"], sampleSize: number): RarityTable {
  const entries = TYPE_CODES.map((code) => ({
    code,
    probability: probabilityOf(code),
    prior: priorProbability(code),
    type: ALL_TYPES.find((t) => t.code === code)!,
  }));

  // 概率升序：rank 1 = 概率最低 = 最稀有
  entries.sort((a, b) => a.probability - b.probability || a.code.localeCompare(b.code));

  // 1) 先按「概率完全相等」切成并列组（同概率必须同档位，不能因为分桶被拆开）
  interface Group {
    start: number;
    size: number;
    value: number;
  }
  const groups: Group[] = [];
  for (let i = 0; i < entries.length; ) {
    const value = entries[i].probability;
    let j = i;
    while (j < entries.length && Math.abs(entries[j].probability - value) < 1e-12) j += 1;
    groups.push({ start: i, size: j - i, value });
    i = j;
  }

  // 2) 再把「并列组」整体分配到 7 档：档位边界取最接近目标人数的组边界，
  //    这样既保持金字塔形状，又不会把同概率的型别拆到两个档位。
  const tierOfGroup = assignTiers(groups.map((g) => g.size));

  const ranked: RankedType[] = [];
  const total = entries.length;
  let rank = 1;

  for (let gi = 0; gi < groups.length; gi += 1) {
    const group = groups[gi];
    const rankSize = group.size;
    const rankLabel = rankSize === 1 ? `${rank}` : `${rank}–${rank + rankSize - 1}`;
    const tier = RARITY_TIERS[tierOfGroup[gi]];

    const groupShare = group.value * rankSize;
    const cumulativeRarer = cumulative(entries, group.start, group.value);
    // 比它更常见的人群占比：越稀有的型别越大
    const beatPercent = Math.round((1 - cumulativeRarer - groupShare) * 1000) / 10;

    for (let k = group.start; k < group.start + rankSize; k += 1) {
      ranked.push({
        code: entries[k].code,
        prior: entries[k].prior,
        probability: group.value,
        rank,
        total,
        rankSize,
        rankLabel,
        per1000: Math.max(0.1, Math.round(group.value * 10000) / 10),
        beatPercent,
        tier,
        type: entries[k].type,
      });
    }
    rank += rankSize;
  }

  const byCode: Record<string, RankedType> = {};
  for (const r of ranked) byCode[r.code] = r;

  return { ranked, byCode, total, source, sampleSize };
}

/** 累计占比：entries[0..i-1] 的概率和 */
function cumulative(entries: Array<{ probability: number }>, i: number, _value: number): number {
  let sum = 0;
  for (let k = 0; k < i; k += 1) sum += entries[k].probability;
  return sum;
}

/**
 * 把并列组分档：档位目标人数来自 TIER_BUCKETS（合计 64），
 * 但实际边界会对齐到最近的「并列组边界」，保证同概率不跨档。
 * 最后一个档位收下所有剩余组。
 */
function assignTiers(sizes: number[]): number[] {
  const targets: number[] = [];
  let acc = 0;
  for (const b of TIER_BUCKETS) {
    acc += b;
    targets.push(acc);
  }

  const ends: number[] = [];
  let run = 0;
  for (const s of sizes) {
    run += s;
    ends.push(run);
  }

  const tierCount = TIER_BUCKETS.length;
  const out = new Array<number>(sizes.length).fill(0);
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

/** 纯先验表（构建期 / 无统计数据时使用） */
export const PRIOR_TABLE: RarityTable = buildRanked(priorProbability, "prior", 0);

/**
 * 贝叶斯融合：把真实统计按权重并入先验。
 *
 *   posterior ∝ prior^α × likelihood^β ，这里用更稳的线性加权：
 *   p = (prior × W + observed × n) / (W + n)
 *
 * W（priorWeight）越大越保守，默认 200 表示「200 个虚拟样本」。
 */
export function blendStats(stats: RealStats | null, priorWeight = 200): RarityTable {
  if (!stats || stats.total <= 0) return PRIOR_TABLE;

  const smoothed: Record<string, number> = {};
  for (const code of TYPE_CODES) {
    const prior = priorProbability(code);
    const observed = (stats.counts[code] ?? 0) / stats.total;
    smoothed[code] = (prior * priorWeight + observed * stats.total) / (priorWeight + stats.total);
  }

  return buildRanked((code) => smoothed[code] ?? priorProbability(code), "blended", stats.total);
}

export function getRanked(code: string, table: RarityTable = PRIOR_TABLE): RankedType | undefined {
  return table.byCode[code];
}

/** 榜单：最稀有 → 最常见 */
export function leaderboard(table: RarityTable = PRIOR_TABLE): RankedType[] {
  return table.ranked;
}

/** 「比 X% 的人更稀有」；最常见的档位改用中性描述，避免「超过 0% 的人」这种刺眼文案 */
export function beatText(r: RankedType): string {
  if (r.beatPercent <= 0.05) return "属于最常见的一档";
  return `比 ${r.beatPercent}% 的人更稀有`;
}

/** 我的名次描述，如「第 12 稀有 / 共 64 型」 */
export function rankText(r: RankedType): string {
  return `第 ${r.rankLabel} 稀有 / 共 ${r.total} 型`;
}

/**
 * 金字塔分层：按档位聚合，用于结果页的稀有度金字塔。
 * 每层给出型别数量与总占比。
 */
export interface PyramidLayer {
  tier: RarityTier;
  count: number;
  share: number;
  codes: string[];
}

export function rarityPyramid(table: RarityTable = PRIOR_TABLE): PyramidLayer[] {
  return RARITY_TIERS.map((tier) => {
    const items = table.ranked.filter((r) => r.tier.key === tier.key);
    const share = items.reduce((s, r) => s + r.probability, 0);
    return {
      tier,
      count: items.length,
      share: Math.round(share * 1000) / 10,
      codes: items.map((r) => r.code),
    };
  });
}

/** 供 UI 直接用的百分比文案，如 "2.3%" */
export function formatPercent(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

/** "每 1000 人约 13.2 人" */
export function per1000Text(r: RankedType): string {
  const n = r.per1000;
  if (n >= 10) return `每 1000 人约 ${Math.round(n)} 人`;
  return `每 1000 人约 ${n} 人`;
}
