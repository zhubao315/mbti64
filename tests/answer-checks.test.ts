import { describe, expect, it } from "vitest";
import { estimateMinutes, reverseConsistency } from "@/lib/answer-checks";
import { ALL_QUESTIONS } from "@/data/questions";

const qs = ALL_QUESTIONS;

function answeredAll(value: number) {
  const out: Record<string, number> = {};
  for (const q of qs) if (q.type === "likert") out[q.id] = value;
  return out;
}

describe("反向题一致性检查（只提示，不改计分）", () => {
  it("全部选择「说不清」时，不应误报冲突", () => {
    const issues = reverseConsistency(answeredAll(2), qs);
    expect(issues).toEqual([]);
  });

  it("对反向题也一律选「非常同意」时，能识别出方向冲突", () => {
    const issues = reverseConsistency(answeredAll(0), qs);
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(Math.sign(issue.forward)).toBe(-Math.sign(issue.reverse));
    }
  });

  it("空答案不产生任何提示", () => {
    expect(reverseConsistency({}, qs)).toEqual([]);
    expect(reverseConsistency(undefined, qs)).toEqual([]);
  });
});

describe("预计剩余时间", () => {
  it("0 题返回 0 分钟", () => {
    expect(estimateMinutes(0)).toBe(0);
  });

  it("至少显示 1 分钟", () => {
    expect(estimateMinutes(1)).toBe(1);
  });

  it("120 题按 6 秒/题约 12 分钟", () => {
    expect(estimateMinutes(120)).toBe(12);
  });
});
