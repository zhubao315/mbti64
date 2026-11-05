/**
 * lib/rarity-core.js 的类型声明
 */

export const DIM_PRIOR: Record<"EI" | "SN" | "TF" | "JP" | "AC" | "OH", number>;

export interface TierDef {
  key: string;
  name: string;
  en: string;
}
export const TIER_DEFS: TierDef[];

export function priorProbability(code: string): number;

export interface CoreRarityRecord {
  code: string;
  prior: number;
  probability: number;
  rank: number;
  rankSize: number;
  rankLabel: string;
  per1000: number;
  beatPercent: number;
  tierIndex: number;
}

export interface CoreRarityTable {
  ranked: CoreRarityRecord[];
  byCode: Record<string, CoreRarityRecord>;
  total: number;
}

export function buildRarityRecords(
  codes: string[],
  probabilityOf?: (code: string) => number,
): CoreRarityTable;
