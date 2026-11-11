import { DIMS, LIKERT_VALUES, type Question, type TestResult } from "@/data/schema";

export type DimKey = keyof typeof DIMS;

export interface ConsistencyIssue {
  dim: DimKey;
  /** 正向题累计（已按方向校正） */
  forward: number;
  /** 反向题累计（已按方向校正） */
  reverse: number;
}

/**
 * 反向题一致性检查（只做提示，不参与计分）
 *
 * 口径：同一维度内，正向题与反向题分别累计「校正后的倾向值」。
 * 若两组都在明显偏向某一侧（|累计| ≥ 3）但方向相反，则视为一致性提示。
 * 该结果只用于提交前提醒用户回看，不改变 scoreTest 的任何输出。
 */
export function reverseConsistency(
  answers: Record<string, number> | undefined,
  questions: readonly Question[],
): ConsistencyIssue[] {
  if (!answers) return [];

  const acc = new Map<DimKey, { forward: number; reverse: number }>();

  for (const q of questions) {
    if (q.type !== "likert") continue;
    const idx = answers[q.id];
    if (typeof idx !== "number") continue;
    const raw = LIKERT_VALUES[idx];
    if (raw === undefined) continue;

    const signed = q.reverse ? -raw : raw;
    const bucket = acc.get(q.dim) ?? { forward: 0, reverse: 0 };
    if (q.reverse) bucket.reverse += signed;
    else bucket.forward += signed;
    acc.set(q.dim, bucket);
  }

  const issues: ConsistencyIssue[] = [];
  for (const [dim, v] of acc) {
    if (Math.abs(v.forward) < 3 || Math.abs(v.reverse) < 3) continue;
    if (Math.sign(v.forward) !== Math.sign(v.reverse)) {
      issues.push({ dim, forward: v.forward, reverse: v.reverse });
    }
  }
  return issues;
}

/** 预计剩余时间（默认每题 6 秒），返回分钟数（向上取整，至少 1） */
export function estimateMinutes(remaining: number, secondsPerQuestion = 6): number {
  if (remaining <= 0) return 0;
  return Math.max(1, Math.ceil((remaining * secondsPerQuestion) / 60));
}

/* ------------------------------------------------------------------ 直线作答 */

/**
 * 直线作答检测（只做提示，不参与计分）
 *
 * 两种典型模式：
 * 1. 连续同选：连续 ≥ 8 道 Likert 题选了完全相同的选项（多见于一路点同一个键）
 * 2. 全卷中立：超过 40% 的题目选了「说不清」（Likert 下标 2，分值为 0）
 *
 * 口径说明：
 * - 「连续」按题库顺序统计，只看 Likert 题；
 *   二选一 / 图片题不打断连续计数（它们本来就不是 Likert 档位）；
 * - 中立占比的分母是整卷已答题数（题目总数 60 / 120），
 *   因为「全卷都在说说不清」本身就是一种作答质量信号。
 */
export const STRAIGHTLINE_MIN_RUN = 8;
export const NEUTRAL_RATIO_LIMIT = 0.4;

export interface StraightlineResult {
  /** 是否检出直线作答 */
  detected: boolean;
  /** 最长连续同选项的题数 */
  longestRun: number;
  /** 「说不清」占整卷已答题数的比例 0–1 */
  neutralRatio: number;
  /** 触发原因（可多条） */
  reasons: string[];
}

export function straightliningCheck(
  answers: Record<string, number> | undefined,
  questions: readonly Question[],
): StraightlineResult {
  if (!answers) {
    return { detected: false, longestRun: 0, neutralRatio: 0, reasons: [] };
  }

  let longestRun = 0;
  let run = 0;
  let prevIndex: number | null = null;
  let neutral = 0;
  let answered = 0;

  for (const q of questions) {
    const idx = answers[q.id];
    if (typeof idx !== "number") continue;
    answered += 1;
    if (q.type !== "likert") continue;

    if (idx === 2) neutral += 1;
    if (prevIndex !== null && idx === prevIndex) {
      run += 1;
    } else {
      run = 1;
    }
    prevIndex = idx;
    if (run > longestRun) longestRun = run;
  }

  const neutralRatio = answered > 0 ? neutral / answered : 0;
  const reasons: string[] = [];
  if (longestRun >= STRAIGHTLINE_MIN_RUN) {
    reasons.push(`连续 ${longestRun} 道题选了同一个选项`);
  }
  if (neutralRatio > NEUTRAL_RATIO_LIMIT) {
    reasons.push(`整卷有 ${Math.round(neutralRatio * 100)}% 选了「说不清」`);
  }

  return { detected: reasons.length > 0, longestRun, neutralRatio, reasons };
}

/* ------------------------------------------------------ 作答清晰度指数 */

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceReport {
  /** 0–100 */
  score: number;
  level: ConfidenceLevel;
  /** 简短标签 */
  label: string;
  /** 一句结论 */
  summary: string;
  /** 拉低分数的具体项 */
  factors: string[];
  /** 接近中位（读数模糊）的维度 */
  fuzzyDims: DimKey[];
  /** 建议静心重测的维度 */
  suggestRetest: DimKey[];
}

/**
 * 本次作答清晰度指数（仅供用户自我参考，不改变 scoreTest 的主编码）
 *
 * 综合四类信号：
 *   1. 完整度：答了多少题
 *   2. 读数清晰度：六维平均离中位多远（越远越清晰）
 *   3. 正反向题一致性：issues 越多越不可信
 *   4. 作答行为：直线作答与「答得太快」的比例
 *
 * 分数只做自我参照，不用于修改任何计分结果。
 */
export function calculateConfidenceScore(
  result: Pick<TestResult, "dims" | "answeredCount" | "totalCount">,
  issues: readonly ConsistencyIssue[],
  straightlining: StraightlineResult,
  fastRatio: number,
): ConfidenceReport {
  const factors: string[] = [];

  // 1. 完整度：答了多少题
  const completeness =
    result.totalCount > 0 ? Math.min(1, result.answeredCount / result.totalCount) : 0;

  // 2. 读数清晰度：看两件事 —— 有几维贴在中位（逐维惩罚），
  //    以及六维整体离中位有多远（整体惩罚）
  const dims = Object.values(result.dims);
  const avgMargin =
    dims.length > 0
      ? dims.reduce((sum, d) => sum + Math.max(0, d.preferred - 50), 0) / dims.length
      : 0;
  const fuzzyCount = dims.filter((d) => d.strength === "fuzzy").length;

  let score = 100;

  const completenessLoss = (1 - completeness) * 40;
  if (completenessLoss > 1) {
    factors.push(`只答了 ${result.answeredCount} / ${result.totalCount} 题`);
    score -= completenessLoss;
  }

  // 逐维：每一维贴在中位都是一条不稳定信号
  const fuzzyLoss = Math.min(36, fuzzyCount * 9);
  if (fuzzyLoss > 0) {
    factors.push(`${fuzzyCount} 个维度的读数接近中位`);
    score -= fuzzyLoss;
  }

  // 整体：六维平均离中位不足 10 个百分点，说明整体作答都偏犹豫
  const avgLoss = Math.max(0, 10 - avgMargin) * 0.6;
  if (avgLoss > 1) {
    factors.push("六维整体读数都偏中性");
    score -= avgLoss;
  }

  const issueLoss = Math.min(24, issues.length * 8);
  if (issueLoss > 0) {
    factors.push(`${issues.length} 个维度的正反向题倾向不一致`);
    score -= issueLoss;
  }

  if (straightlining.detected) {
    factors.push(straightlining.reasons.join("；"));
    score -= 15;
  }

  const fastLoss = Math.min(18, Math.max(0, fastRatio) * 45);
  if (fastLoss > 1) {
    factors.push(`${Math.round(Math.max(0, fastRatio) * 100)}% 的题目作答偏快`);
    score -= fastLoss;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const fuzzyDims = (Object.keys(result.dims) as DimKey[]).filter(
    (k) => result.dims[k].strength === "fuzzy",
  );

  let level: ConfidenceLevel;
  if (score >= 80) level = "high";
  else if (score >= 60) level = "medium";
  else level = "low";

  const label =
    level === "high" ? "高" : level === "medium" ? "中" : "偏低";

  const suggestRetest = level === "low" ? fuzzyDims : [];

  const summary =
    level === "high"
      ? "六维读数稳定，可以放心参考下面的结果。"
      : level === "medium"
        ? "整体可参考，但部分维度接近中位，建议结合上方的逐维读数细看。"
        : "本次作答里有若干不稳定信号，若结果与你的自我感受不符，建议静心重测。";

  return { score, level, label, summary, factors, fuzzyDims, suggestRetest };
}
