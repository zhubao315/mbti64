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
  AC: "决策姿态",
  OH: "变化策略",
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

/* ------------------------------------------------------------------ 恋爱兼容 */

/**
 * 恋爱兼容度（娱乐向），输出 0–100。
 *
 * 【旧口径的问题】
 * 旧实现用「理想化编码向量」算 L1 距离，再以 ideal=300 计分：
 *   score = 100 - |dist - 300| / 3
 * 但理想化向量的每一维都是 ±100，所以 L1 距离只能取 0 / 200 / 400 / … 的倍数，
 * 300 永远取不到：
 *   - 距离 200 与 400 同为 67 分（「都以 300 为理想值对称」）；
 *   - 镜像型（距离 1000~1200）恒定落到保底 35 分。
 * 更糟的是调用方把「互补盲区型」直接喂进恋爱兼容模块，
 * 于是推荐列表整屏显示「35 差异较大」——一个叫「恋爱兼容」的栏目
 * 推不出任何合拍的对象。
 *
 * 【新口径：逐维加权】
 * 每一维看两人是否同极：同极加分、异极扣分，权重按该维在关系里的摩擦强度排。
 *   同极加分：JP 8 > TF 7 = AC 7 > OH 6 > EI 6 > SN 5
 *   异极扣分：JP 4 = TF 4 = AC 4 > EI 3 = SN 3 = OH 3
 * 读法：
 *   - 同极加分多、异极扣分少的一维（EI/SN/OH）＝差异本身不伤感情；
 *   - 同极加分多、异极扣分也多的一维（JP/TF/AC）＝同频是加分，错位是硬伤。
 *
 * 结果落在 43（完全镜像）到 96（完全同型）之间，64 型两两之间能拉开真实差距，
 * 而不是七个离散值。仍然只用于内容卡片，不作为关系预测。
 */
const LOVE_BASE = 64;

/** [同极加分, 异极扣分] */
const LOVE_WEIGHTS: Record<DimKey, readonly [number, number]> = {
  EI: [6, 3],
  SN: [5, 3],
  TF: [7, 4],
  JP: [8, 4],
  AC: [7, 4],
  OH: [6, 3],
};

/** 逐维同极 / 异极的自然语言，用于生成 reason */
const LOVE_PHRASE: Record<DimKey, { same: string; clash: string }> = {
  EI: { same: "社交节奏同步", clash: "一个想出门社交、一个想回家充电" },
  SN: { same: "关注点同频", clash: "一个盯细节、一个看全局" },
  TF: { same: "判断标准一致", clash: "一个讲逻辑、一个讲感受" },
  JP: { same: "生活节奏一致", clash: "收尾方式对不上" },
  AC: { same: "推进方式一致", clash: "一个急着拍板、一个想再核对" },
  OH: { same: "面对变化的态度一致", clash: "一个想开新坑、一个想守基本盘" },
};

export function loveCompatibility(a: string, b: string): number {
  const va = vectorFromCode(a);
  const vb = vectorFromCode(b);
  let score = LOVE_BASE;
  for (const [i, k] of DIM_ORDER.entries()) {
    const [same, diff] = LOVE_WEIGHTS[k];
    score += va[i] === vb[i] ? same : -diff;
  }
  // 35 是保底上限：任何一维组合都不会跌破 43，留 35 只是防止未来调权重时越界
  return Math.max(35, Math.min(96, Math.round(score)));
}

/** 逐维同极 / 异极明细，供 reason 生成与 UI 展示使用 */
export interface LoveBreakdown {
  score: number;
  /** 同极的维度 */
  matched: DimKey[];
  /** 异极的维度 */
  clashed: DimKey[];
}

/** 逐维比对两个编码，返回同极 / 异极明细 */
export function loveBreakdown(a: string, b: string): LoveBreakdown {
  const va = vectorFromCode(a);
  const vb = vectorFromCode(b);
  const matched: DimKey[] = [];
  const clashed: DimKey[] = [];
  for (const [i, k] of DIM_ORDER.entries()) {
    (va[i] === vb[i] ? matched : clashed).push(k);
  }
  return { score: loveCompatibility(a, b), matched, clashed };
}

/**
 * 一句话解释「合在哪 / 卡在哪」。
 *
 * 取权重最高的两处同极 + 最高的一处异极，
 * 例如「生活节奏与判断标准一致，但一个想开新坑、一个想守基本盘」。
 */
export function loveReason(a: string, b: string): string {
  const { matched, clashed } = loveBreakdown(a, b);
  const weightOf = (k: DimKey) => LOVE_WEIGHTS[k][0];
  const topSame = [...matched].sort((x, y) => weightOf(y) - weightOf(x)).slice(0, 2);
  const topClash = [...clashed].sort((x, y) => weightOf(y) - weightOf(x))[0];

  const samePart = topSame.map((k) => LOVE_PHRASE[k].same).join("与");
  if (!topClash) return `${samePart}，几乎不用互相解释`;
  const clashPart = LOVE_PHRASE[topClash].clash;
  return samePart ? `${samePart}，但${clashPart}` : clashPart;
}

/** 恋爱合拍推荐的结果项 */
export interface RomanticMatch {
  type: Type64;
  /** 兼容度 0–100 */
  score: number;
  /** 六维 L1 距离（理想化编码向量口径） */
  distance: number;
  /** 一句解释 */
  reason: string;
  /** 是否为「高张力成长伴侣」（镜像型） */
  tension?: boolean;
}

/** 合拍推荐的最低兼容度门槛 */
export const ROMANTIC_MIN_SCORE = 80;

/**
 * 恋爱合拍型（供「恋爱兼容」推荐列表使用）。
 *
 * 口径：
 * - 兼容度必须 ≥ ROMANTIC_MIN_SCORE（80）；低于这个分数不是「不合拍」，
 *   只是需要大量磨合，不该出现在「推荐合拍对象」里；
 * - 理想化编码向量的 L1 距离只能取 0/200/400/… 的倍数，而 ≥80 分必然
 *   落在 200~400 区间（差 1~2 个字母），因此天然满足「同底色 + 有张力」；
 * - 同分时按距离近者优先，再按编码字典序保证结果稳定可复现。
 *
 * 「最能补你盲区的镜像型」不混在这里 —— 它由 romanticMirror 单独给出，
 * 避免两个推荐列表内容重复。
 */
export function romanticMatches(
  resultOrCode: string | Pick<TestResult, "code">,
  limit = 3,
): RomanticMatch[] {
  const code = typeof resultOrCode === "string" ? resultOrCode : resultOrCode.code;
  const va = vectorFromCode(code);
  return ALL_TYPES.filter((t) => t.code !== code)
    .map((t) => {
      const distance = l1Distance(va, vectorFromCode(t.code));
      return {
        type: t,
        distance,
        score: loveCompatibility(code, t.code),
        reason: loveReason(code, t.code),
      };
    })
    .filter((m) => m.score >= ROMANTIC_MIN_SCORE)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distance - b.distance ||
        a.type.code.localeCompare(b.type.code),
    )
    .slice(0, limit);
}

/**
 * 高张力成长伴侣：六维几乎全反的镜像型。
 *
 * 单独给出而不是混进合拍列表：
 * 它补的正是你的盲区，但需要磨合，不该被标成「很合拍」。
 */
export function romanticMirror(
  resultOrCode: string | Pick<TestResult, "code">,
): RomanticMatch | null {
  const code = typeof resultOrCode === "string" ? resultOrCode : resultOrCode.code;
  const va = vectorFromCode(code);
  const ranked = ALL_TYPES.filter((t) => t.code !== code)
    .map((t) => {
      const distance = l1Distance(va, vectorFromCode(t.code));
      return {
        type: t,
        distance,
        score: loveCompatibility(code, t.code),
        reason: loveReason(code, t.code),
      };
    })
    .sort((a, b) => b.distance - a.distance || a.type.code.localeCompare(b.type.code));
  const top = ranked[0];
  if (!top) return null;
  return { ...top, tension: true };
}

export function compatibilityLabel(score: number): string {
  if (score >= 85) return "很合拍";
  if (score >= 70) return "比较顺";
  if (score >= 55) return "需要磨合";
  return "差异较大";
}
