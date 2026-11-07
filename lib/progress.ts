/**
 * 测评进度口径（纯函数，无浏览器依赖）
 *
 * 单一数据源：进度条百分比 = 已作答题目数 / 总题数。
 * 游标（当前题号）必须服从同一口径：index 不得跑到 answered 之前，
 * 否则底部的「第 N / total 题」会与顶部的进度条读数打架。
 */

type OrderLike = readonly { id: string }[];

/** 已作答题目数：只统计属于当前问卷、且答案为有效数字的题（反向题同样计入） */
export function countAnswered(
  answers: Record<string, number> | undefined,
  order: OrderLike,
): number {
  if (!answers) return 0;
  let n = 0;
  for (const q of order) {
    if (typeof answers[q.id] === "number") n += 1;
  }
  return n;
}

/** 进度百分比：严格绑定已答数；四舍五入后夹在 0–100 */
export function progressPct(answered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((answered / total) * 100)));
}

/**
 * 游标上限：0-based index 不得超过「已答题数」。
 * 已答 = 1 时，合法位置是第 1 题（index 0）或下一题（index 1）；
 * 缓存里若出现 index 远超 answered，这里会直接把它拉回。
 */
export function clampIndex(index: number, answered: number, total: number): number {
  if (total <= 0) return 0;
  const max = Math.min(total - 1, Math.max(0, answered));
  return Math.max(0, Math.min(max, index));
}
