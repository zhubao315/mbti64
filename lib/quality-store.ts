import type { Mode } from "@/data/schema";
import type { ConsistencyIssue, StraightlineResult } from "@/lib/answer-checks";

/**
 * 作答质量快照
 *
 * 【为什么单独存一份】
 * 答题完成时 `finish()` 会清空 answers（答题进度不再保留），
 * 但结果页仍需要「作答质量」来算清晰度指数：
 * 直线作答、正反向题一致性、快答比例、完整度。
 * 这些信号在答题页还算得到，answers 一清就没了，
 * 所以在确认结果的那一刻先落盘一份快照（独立键，与答题进度隔离）。
 */
export const QUALITY_KEY = "p64:quality:v1";

export interface AnswerQuality {
  mode: Mode;
  answered: number;
  total: number;
  /** 作答耗时不足 1.5 秒的题数 */
  fastCount: number;
  /** 改过答案的题数 */
  changedCount: number;
  straightlining: StraightlineResult;
  issues: ConsistencyIssue[];
  savedAt: number;
}

export function writeAnswerQuality(quality: AnswerQuality): void {
  try {
    localStorage.setItem(QUALITY_KEY, JSON.stringify(quality));
  } catch {
    /* 隐私模式下降级：没有快照不影响结果页其余部分 */
  }
}

export function readAnswerQuality(): AnswerQuality | null {
  try {
    const raw = localStorage.getItem(QUALITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnswerQuality;
    return parsed && typeof parsed.answered === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAnswerQuality(): void {
  try {
    localStorage.removeItem(QUALITY_KEY);
  } catch {
    /* ignore */
  }
}
