import { describe, expect, it } from "vitest";
import { clampIndex, countAnswered, progressPct } from "@/lib/progress";
import { ALL_QUESTIONS, CORE_QUESTIONS, SESSION_ORDER } from "@/data/questions";

/**
 * store 依赖浏览器 localStorage；在 node 测试里先放一个内存桩，
 * 再动态加载，避免 import 阶段就抛 ReferenceError。
 */
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { answeredTotal } = await import("@/lib/store");

/**
 * 进度条 / 题号同源回归测试
 *
 * 契约：
 * 1) 进度百分比 = 已作答数 / 总题数（严格绑定已答数）
 * 2) 游标 index 不得超过已答数，否则「第 N 题」会领先于进度条
 * 3) 精简 60 / 完整 120 各自独立计数，互不干扰
 * 4) 反向题同样是「作答」，不能被漏计
 */

describe("进度口径：百分比严格绑定已答数", () => {
  it("0 题 → 0%，答完 → 100%", () => {
    expect(progressPct(0, 120)).toBe(0);
    expect(progressPct(120, 120)).toBe(100);
    expect(progressPct(60, 60)).toBe(100);
  });

  it("末题作答前应为 total-1 / total，作答后为 100%", () => {
    expect(progressPct(119, 120)).toBe(99);
    expect(progressPct(120, 120)).toBe(100);
  });

  it("异常值被夹在 0–100，空题库为 0", () => {
    expect(progressPct(-5, 120)).toBe(0);
    expect(progressPct(130, 120)).toBe(100);
    expect(progressPct(10, 0)).toBe(0);
  });
});

describe("游标与已答数同源", () => {
  it("缓存恢复出现 index 超前时会拉回已答数", () => {
    expect(clampIndex(119, 105, 120)).toBe(105);
    expect(clampIndex(119, 120, 120)).toBe(119);
    expect(clampIndex(5, 2, 120)).toBe(2);
  });

  it("正常前进 / 回退不越界", () => {
    expect(clampIndex(0, 0, 120)).toBe(0);
    expect(clampIndex(3, 5, 120)).toBe(3);
    expect(clampIndex(10, 10, 60)).toBe(10);
    expect(clampIndex(-3, 5, 120)).toBe(0);
  });
});

describe("两套问卷独立计数", () => {
  it("quick 有作答、full 为空时，full 进度为 0", () => {
    const quickAnswers = Object.fromEntries(CORE_QUESTIONS.map((q) => [q.id, 2]));
    const state = {
      mode: "full" as const,
      answers: { quick: quickAnswers, full: {} },
    };
    expect(answeredTotal(state)).toBe(0);
    expect(answeredTotal({ ...state, mode: "quick" })).toBe(60);
  });

  it("full 有作答、quick 为空时，quick 进度为 0", () => {
    const fullAnswers = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, 1]));
    const state = {
      mode: "quick" as const,
      answers: { quick: {}, full: fullAnswers },
    };
    expect(answeredTotal(state)).toBe(0);
    expect(answeredTotal({ ...state, mode: "full" })).toBe(120);
  });

  it("两套问卷题序内 id 唯一，且 quick 是 full 的子集", () => {
    const fullIds = SESSION_ORDER.full.map((q) => q.id);
    const quickIds = SESSION_ORDER.quick.map((q) => q.id);
    expect(new Set(fullIds).size).toBe(fullIds.length);
    expect(new Set(quickIds).size).toBe(quickIds.length);
    expect(quickIds.every((id) => fullIds.includes(id))).toBe(true);
  });
});

describe("反向题不改变计数", () => {
  it("反向题被作答同样计入已答数", () => {
    const reverse = CORE_QUESTIONS.find((q) => q.reverse);
    expect(reverse).toBeTruthy();
    const answers = { [reverse!.id]: 2 };
    expect(countAnswered(answers, SESSION_ORDER.quick)).toBe(1);
  });

  it("非本问卷的 id 不计入当前进度", () => {
    expect(countAnswered({ "not-a-question": 3 }, SESSION_ORDER.quick)).toBe(0);
  });
});
