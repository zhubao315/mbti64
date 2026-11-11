import { describe, expect, it } from "vitest";
import {
  EMPTY_PRACTICE,
  PRACTICE_PLAN_DAYS,
  dayIndexOf,
  exportPracticeMarkdown,
  planDayOf,
  planProgress,
  readPracticeState,
  setReview,
  toggleCheckin,
  writePracticeState,
  type PracticePlanDay,
  type PracticeState,
} from "@/lib/practice-store";
import practiceLab from "@/data/practiceLab.json";

/**
 * 30 天行为实验实验室单测
 *
 * 覆盖：计划数据完整性、打卡进度计算、Markdown 复盘导出。
 */

const PLAN: PracticePlanDay[] = practiceLab.days.map((d) => ({
  day: d.day,
  action: d.action,
  direction: d.direction,
  question: d.question,
}));

describe("practiceLab 数据", () => {
  it("30 天计划齐全，Day 1 ~ Day 30 连续无缺口", () => {
    expect(practiceLab.days).toHaveLength(PRACTICE_PLAN_DAYS);
    practiceLab.days.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
      expect(d.action.length).toBeGreaterThan(2);
      expect(d.direction.length).toBeGreaterThan(1);
      expect(d.question.length).toBeGreaterThan(4);
    });
  });

  it("4 个周计划覆盖全部 30 天", () => {
    expect(practiceLab.weeks).toHaveLength(4);
    expect(practiceLab.weeks.map((w) => w.week)).toEqual([1, 2, 3, 4]);
  });

  it("职场四象限 4 条，每条六个字段齐全", () => {
    expect(practiceLab.quadrants).toHaveLength(4);
    for (const q of practiceLab.quadrants) {
      expect(q.name.length).toBeGreaterThan(1);
      expect(q.coreAction.length).toBeGreaterThan(4);
      expect(q.behavior.length).toBeGreaterThan(2);
      expect(q.bestSuffix.length).toBeGreaterThan(1);
      expect(q.scenes.length).toBeGreaterThan(2);
      expect(q.risk.length).toBeGreaterThan(2);
    }
  });

  it("潜台词词典 20 组，每组四要素齐全", () => {
    expect(practiceLab.dictionary).toHaveLength(20);
    for (const d of practiceLab.dictionary) {
      expect(d.pair.length).toBeGreaterThan(1);
      expect(d.surface.length).toBeGreaterThan(2);
      expect(d.misheard.length).toBeGreaterThan(2);
      expect(d.reply.length).toBeGreaterThan(2);
    }
  });
});

describe("30 天进度计算", () => {
  const base: PracticeState = { ...EMPTY_PRACTICE, startDate: "2026-11-01" };

  it("未开始时是第 0 天", () => {
    expect(planDayOf({ ...EMPTY_PRACTICE })).toBe(0);
    expect(planProgress({ ...EMPTY_PRACTICE })).toMatchObject({ currentDay: 0, done: 0 });
  });

  it("开始当天是第 1 天", () => {
    const now = new Date("2026-11-01T10:00:00");
    expect(dayIndexOf("2026-11-01", now)).toBe(0);
    expect(planDayOf(base, now)).toBe(1);
  });

  it("第 15 天是第 15 天，上限不超过 30", () => {
    expect(planDayOf(base, new Date("2026-11-15T10:00:00"))).toBe(15);
    expect(planDayOf(base, new Date("2026-12-30T10:00:00"))).toBe(PRACTICE_PLAN_DAYS);
  });

  it("完成度按打卡天数算", () => {
    const state: PracticeState = { ...base, checkins: ["2026-11-01", "2026-11-02", "2026-11-03"] };
    const p = planProgress(state, new Date("2026-11-03T10:00:00"));
    expect(p.done).toBe(3);
    expect(p.total).toBe(PRACTICE_PLAN_DAYS);
    expect(p.percent).toBe(10);
  });

  it("打卡可切换，回顾可写入", () => {
    let s: PracticeState = { ...EMPTY_PRACTICE };
    s = toggleCheckin(s, "2026-11-01");
    expect(s.checkins).toEqual(["2026-11-01"]);
    s = toggleCheckin(s, "2026-11-01");
    expect(s.checkins).toEqual([]);
    s = setReview(s, "2026-11-01", "今天比昨天容易一点");
    expect(s.reviews["2026-11-01"]).toBe("今天比昨天容易一点");
  });
});

describe("Markdown 复盘导出", () => {
  it("包含标题、方向、打卡数与逐日记录", () => {
    const state: PracticeState = {
      ...EMPTY_PRACTICE,
      direction: "c2a",
      startDate: "2026-11-01",
      checkins: ["2026-11-01", "2026-11-02"],
      reviews: { "2026-11-01": "诚实了一点", "2026-11-02": "还是慢" },
    };
    const md = exportPracticeMarkdown(state, PLAN);
    expect(md).toContain("# 我的 30 天人格探索复盘");
    expect(md).toContain("C → A");
    expect(md).toContain("2 / 30");
    expect(md).toContain("诚实了一点");
    expect(md).toContain("还是慢");
    expect(md).toContain("写下我此刻的六维旋钮状态");
    expect(md).toContain("第 24 章");
  });

  it("没有任何打卡时也给出可读的内容", () => {
    const md = exportPracticeMarkdown({ ...EMPTY_PRACTICE }, PLAN);
    expect(md).toContain("还没有打卡记录");
    expect(md.length).toBeGreaterThan(60);
  });

  it("导出的内容不含 undefined / null", () => {
    const state: PracticeState = { ...EMPTY_PRACTICE, startDate: "2026-11-01", checkins: ["2026-11-01"] };
    const md = exportPracticeMarkdown(state, PLAN);
    expect(md).not.toContain("undefined");
    expect(md).not.toContain("null");
  });
});

describe("打卡状态的读写", () => {
  it("读不到数据时返回空状态而不是崩", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    expect(readPracticeState(fake)).toEqual(EMPTY_PRACTICE);
    writePracticeState({ ...EMPTY_PRACTICE, direction: "o2h" }, fake);
    expect(readPracticeState(fake).direction).toBe("o2h");
  });

  it("损坏的 JSON 不会让页面崩", () => {
    const store = new Map<string, string>([["p64:practice:v1", "{ 不是 JSON"]]);
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(readPracticeState(fake)).toEqual(EMPTY_PRACTICE);
  });
});
