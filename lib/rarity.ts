import { ALL_TYPES, TYPE_CODES, type Type64 } from "@/data/types64";
import { DIM_PRIOR, TIER_DEFS, buildRarityRecords, priorProbability } from "./rarity-core.js";

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
  /** 主色（插画 / 填充 / 浅底） */
  color: string;
  /** 文字色：同色相但对比度 ≥ 4.5:1 */
  text: string;
  /** 浅底色 */
  soft: string;
  /** 用于卡片上的标签 */
  badge: string;
}

/** 每档的配色与说明；档位名称与顺序来自 lib/rarity-core.js 的 TIER_DEFS，避免两处硬编码 */
const TIER_STYLE: Record<RarityTierKey, Pick<RarityTier, "note" | "color" | "text" | "soft">> = {
  oneInTenThousand: {
    note: "金字塔顶端 · 最少见的一档",
    color: "#0F2747",
    text: "#0F2747",
    soft: "#E8EEF5",
  },
  extremelyRare: {
    note: "非常少见，多数人身边只有一个",
    color: "#1E3A5F",
    text: "#1E3A5F",
    soft: "#EBF0F6",
  },
  rare: {
    note: "不常见，属于少数派",
    color: "#33507A",
    text: "#33507A",
    soft: "#EEF2F7",
  },
  oneInThousand: {
    note: "偏少见，容易被认为是「有点特别」",
    color: "#4A678F",
    text: "#3D5A80",
    soft: "#F1F5F9",
  },
  oneInHundred: {
    note: "中等，朋友里总能遇到一两个",
    color: "#64748B",
    text: "#475569",
    soft: "#F4F6F9",
  },
  common: {
    note: "比较常见，聚会里大概率有同型",
    color: "#8291A5",
    text: "#5A6A7E",
    soft: "#F7F9FB",
  },
  everywhere: {
    note: "最常见的一档，遍地都是同类",
    color: "#A3B0C2",
    text: "#5A6A7E",
    soft: "#FAFBFC",
  },
};

export const RARITY_TIERS: RarityTier[] = TIER_DEFS.map((def, index) => {
  const key = def.key as RarityTierKey;
  return {
    key,
    name: def.name,
    en: def.en,
    rank: index,
    badge: def.name,
    ...TIER_STYLE[key],
  };
});

export const TIER_BY_KEY: Record<RarityTierKey, RarityTier> = Object.fromEntries(
  RARITY_TIERS.map((t) => [t.key, t]),
) as Record<RarityTierKey, RarityTier>;

/** 稀有度档位的中文名（页面与书稿映射共用的术语） */
export type RarityTierName =
  | "万里挑一"
  | "极稀有"
  | "稀有"
  | "千分之一"
  | "百分之一"
  | "常见型"
  | "无处不在";

/**
 * 各维「poleA 侧」的基础概率（prior）。
 * 数值唯一定义在 lib/rarity-core.js，此处仅做转发。
 */
export { DIM_PRIOR };

/** 真实统计兜底：当后端没有数据时用同一套先验，保证前后一致 */
export interface RealStats {
  /** key = 64 型编码，value = 该型人数 */
  counts: Record<string, number>;
  /** 总样本量 */
  total: number;
}

/**
 * 单一型别的先验概率（六维独立，逐维取对应极的概率后相乘）。
 * 实现唯一定义在 lib/rarity-core.js，此处仅做转发。
 */
export { priorProbability };

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
  // 排名 / 并列组 / 分档 / 每千人换算全部在 lib/rarity-core.js 中完成，
  // 这里只负责把型别元数据与配色挂上去。
  const core = buildRarityRecords(TYPE_CODES, probabilityOf);

  const ranked: RankedType[] = core.ranked.map((r) => ({
    code: r.code,
    prior: r.prior,
    probability: r.probability,
    rank: r.rank,
    total: core.total,
    rankSize: r.rankSize,
    rankLabel: r.rankLabel,
    per1000: r.per1000,
    beatPercent: r.beatPercent,
    tier: RARITY_TIERS[r.tierIndex],
    type: ALL_TYPES.find((t) => t.code === r.code)!,
  }));

  const byCode: Record<string, RankedType> = {};
  for (const r of ranked) byCode[r.code] = r;

  return { ranked, byCode, total: core.total, source, sampleSize };
}

/** 纯先验表（构建期 / 无统计数据时使用） */
export const PRIOR_TABLE: RarityTable = buildRanked(priorProbability, "prior", 0);

/**
 * 稀有度单一事实源
 *
 * 首页金字塔、/rank 榜单、type/[code] 详情页、结果页、分享卡、SEO 文案
 * 与书稿数据管道都只允许读取这里，禁止在页面或脚本里另写一份 rank / per1000。
 *
 * 口径：
 *  - rank    ：64 型内部的相对名次（1 = 最稀有；概率并列时同 rank，见 rankLabel）
 *  - per1000 ：每 1000 人估算值（概率换算，不是排名分桶）
 *  - percent ：百分比展示值（= per1000 / 10，保留 1 位小数）
 *  - tier    ：内部排名档位，只表示「相对这 64 型更稀有」，不是绝对稀有度
 */
export interface RarityRecord {
  code: string;
  rank: number;
  /** 同排名并列的型别数量 */
  rankSize: number;
  /** 名次区间展示，如 "3–6" */
  rankLabel: string;
  per1000: number;
  percent: number;
  tier: RarityTierName;
}

export const RARITY_TABLE: Record<string, RarityRecord> = Object.fromEntries(
  PRIOR_TABLE.ranked.map((r) => [
    r.code,
    {
      code: r.code,
      rank: r.rank,
      rankSize: r.rankSize,
      rankLabel: r.rankLabel,
      per1000: r.per1000,
      percent: Math.round(r.probability * 1000) / 10,
      tier: r.tier.name as RarityTierName,
    },
  ]),
);

/** 按型别代码取稀有度记录（唯一事实源的读取入口） */
export function getRarity(code: string): RarityRecord | undefined {
  return RARITY_TABLE[code];
}

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
