import { DIMS, LIKERT_VALUES, type Question } from "@/data/schema";

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
