import { ALL_TYPES, type Type64 } from "@/data/types64";
import { DIM_ORDER, type DimKey, type DimScore, type TestResult } from "@/data/schema";

/**
 * 相似 / 互补型别匹配
 *
 * 用「有符号倾向」向量做比较：
 *   每维取值 -100…+100（poleB 极 → poleA 极）
 *   相似 = L1 距离最小（倾向越接近越像）
 *   互补 = L1 距离最大（倾向越相反越互补）
 *
 * 因为后缀 A/C 与 O/H 也参与向量，相似型别通常会保持前四字母、只在后缀上微调，
 * 这符合直觉：和你最像的人，往往就是同一基础型的「另一种调性」。
 */

export type Vector6 = [number, number, number, number, number, number];

/** DimScore → 有符号百分比向量 */
export function vectorFromDims(dims: Record<DimKey, DimScore>): Vector6 {
  return DIM_ORDER.map((k) => Math.round((dims[k].percentA - 50) * 2)) as Vector6;
}

/** 型别编码 → 理想化向量（极向取满值） */
export function vectorFromCode(code: string): Vector6 {
  const [base, ac, oh] = code.split("-");
  const letters = base.split("");
  // poleA 侧取 +100，poleB 侧取 -100
  const A: Record<number, string> = { 0: "E", 1: "S", 2: "T", 3: "J" };
  const v: number[] = letters.map((letter, i) => (letter === A[i] ? 100 : -100));
  v.push(ac === "A" ? 100 : -100);
  v.push(oh === "O" ? 100 : -100);
  return v as Vector6;
}

export function l1Distance(a: Vector6, b: Vector6): number {
  return a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0);
}

export interface MatchItem {
  type: Type64;
  distance: number;
  /** 相似度 0–100，便于 UI 展示 */
  similarity: number;
  /** 一句解释，说明「像在哪」 */
  reason: string;
}

/**
 * 展示用相似度。
 *
 * 旧实现直接用距离除以 600（6 维 × 200 的理论最大差），但用户真实向量幅度
 * 通常远小于型别极值向量（±100），导致「和自己最像的型」只有 40–60%。
 *
 * 新口径：把候选型别与「用户自身极点向量」的距离差，归一化到该用户
 * 理论最大可拉开距离（任一型别理想向量与用户向量的最大 L1）。
 *   - 与用户自己的极向完全一致 → 100
 *   - 只差一个维度 → 约 83
 *   - 六个维度全部相反（镜像） → 0
 * 该口径与用户答题强弱无关，强弱用户看到的都是同一套可读百分比。
 */
export function similarityOf(me: Vector6, distance: number): number {
  const own = me.map((x) => (x > 0 ? 100 : x < 0 ? -100 : 0)) as Vector6;
  const baseDist = l1Distance(me, own);
  // 任一 ±100 型别向量与 me 的最大可能 L1：每维 max(|me-100|, |me+100|) = 100 + |me|
  const maxDist = me.reduce((sum, x) => sum + 100 + Math.abs(x), 0);
  const maxExtra = maxDist - baseDist;
  // 六维全部贴中位（me 全 0）时没有可比较的倾向信号
  if (maxExtra <= 0) return 50;
  const extra = Math.max(0, distance - baseDist);
  return Math.max(0, Math.min(100, Math.round((1 - extra / maxExtra) * 100)));
}

/** 找出差异最大/最小的维度，用于生成 reason */
function explain(a: Vector6, b: Vector6, mode: "similar" | "complement"): string {
  const diffs = DIM_ORDER.map((k, i) => ({ k, d: Math.abs(a[i] - b[i]), same: a[i] * b[i] > 0 }));
  if (mode === "similar") {
    const sameDims = diffs.filter((d) => d.same);
    const names = sameDims.slice(0, 3).map((d) => DIM_CN[d.k]).join("、");
    return names ? `你们在 ${names} 上的倾向几乎一致` : "你们在多数维度上的倾向都很接近";
  }
  const biggest = [...diffs].sort((x, y) => y.d - x.d).slice(0, 3);
  return `你们在 ${biggest.map((d) => DIM_CN[d.k]).join("、")} 上形成强力互补，能接住彼此的盲区`;
}

const DIM_CN: Record<DimKey, string> = {
  EI: "能量方向",
  SN: "信息方式",
  TF: "决策依据",
  JP: "生活节奏",
  AC: "自我姿态",
  OH: "变化偏好",
};

export function similarTypes(result: Pick<TestResult, "code" | "dims">, limit = 3): MatchItem[] {
  const me = vectorFromDims(result.dims);
  return ALL_TYPES.filter((t) => t.code !== result.code)
    .map((t) => {
      const distance = l1Distance(me, vectorFromCode(t.code));
      return { type: t, distance, similarity: similarityOf(me, distance), reason: explain(me, vectorFromCode(t.code), "similar") };
    })
    .sort((a, b) => a.distance - b.distance || a.type.code.localeCompare(b.type.code))
    .slice(0, limit);
}

export function complementaryTypes(result: Pick<TestResult, "code" | "dims">, limit = 3): MatchItem[] {
  const me = vectorFromDims(result.dims);
  return ALL_TYPES.filter((t) => t.code !== result.code)
    .map((t) => {
      const distance = l1Distance(me, vectorFromCode(t.code));
      return {
        type: t,
        distance,
        similarity: similarityOf(me, distance),
        reason: explain(me, vectorFromCode(t.code), "complement"),
      };
    })
    .sort((a, b) => b.distance - a.distance || a.type.code.localeCompare(b.type.code))
    .slice(0, limit);
}

/**
 * 同族群的其他型：结果页「你所在族群的其他型」专用。
 *
 * 不能复用 similarTypes —— 它以全局六维距离排序，当用户某一维接近中位时，
 * 前几名可能来自其他族群，放在「你所在族群」标题下会分类错误。
 * 这里先从 ALL_TYPES 严格过滤同 group，再按到用户向量的 L1 距离升序。
 */
export function sameGroupTypes(
  result: Pick<TestResult, "code" | "dims" | "group">,
  limit = 3,
): MatchItem[] {
  const me = vectorFromDims(result.dims);
  return ALL_TYPES.filter((t) => t.group === result.group && t.code !== result.code)
    .map((t) => {
      const distance = l1Distance(me, vectorFromCode(t.code));
      return { type: t, distance, similarity: similarityOf(me, distance), reason: explain(me, vectorFromCode(t.code), "similar") };
    })
    .sort((a, b) => a.distance - b.distance || a.type.code.localeCompare(b.type.code))
    .slice(0, limit);
}

/**
 * 恋爱兼容度（娱乐向）：
 * 同四字母但后缀互补 → 高分；决策依据(T/F)相反但能量(E/I)相同 → 中高。
 * 输出 0–100，仅用于内容卡片，不作为关系预测。
 */
export function loveCompatibility(a: string, b: string): number {
  const va = vectorFromCode(a);
  const vb = vectorFromCode(b);
  const dist = l1Distance(va, vb);
  // 距离适中（300 左右）最合拍：太像缺乏张力，太不像难以沟通
  const ideal = 300;
  const score = 100 - Math.abs(dist - ideal) / 3;
  return Math.max(35, Math.min(96, Math.round(score)));
}

export function compatibilityLabel(score: number): string {
  if (score >= 85) return "很合拍";
  if (score >= 70) return "比较顺";
  if (score >= 55) return "需要磨合";
  return "差异较大";
}
