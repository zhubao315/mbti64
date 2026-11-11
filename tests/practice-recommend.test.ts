import { describe, expect, it } from "vitest";
import { recommendPractice } from "@/lib/practice-recommend";
import type { DimScore } from "@/data/schema";

/**
 * 微动作推荐单测
 *
 * 口径：取用户偏离中位（50%）最远的那一轴，练它的反面旋钮。
 *   AC 偏 A → a2c；AC 偏 C → c2a；OH 偏 O → o2h；OH 偏 H → h2o
 */

function dim(key: "AC" | "OH", percentA: number, swing = false): DimScore {
  const poleA = key === "AC" ? "A" : "O";
  const poleB = key === "AC" ? "C" : "H";
  return {
    key,
    poleA,
    poleB,
    percentA,
    percentB: 100 - percentA,
    pole: percentA >= 50 ? poleA : poleB,
    preferred: Math.max(percentA, 100 - percentA),
    strength: "moderate",
    answered: 20,
    total: 20,
    swing,
  };
}

describe("recommendPractice", () => {
  it("AC 偏审慎（C 侧高）→ 先练 c2a", () => {
    const rec = recommendPractice({ AC: dim("AC", 40), OH: dim("OH", 50) });
    expect(rec?.direction).toBe("c2a");
    expect(rec?.reason).toContain("审慎校准");
  });

  it("AC 偏坚定（A 侧高）→ 先练 a2c", () => {
    const rec = recommendPractice({ AC: dim("AC", 68), OH: dim("OH", 50) });
    expect(rec?.direction).toBe("a2c");
  });

  it("OH 偏求新（O 侧高）→ 先练 o2h", () => {
    const rec = recommendPractice({ AC: dim("AC", 50), OH: dim("OH", 72) });
    expect(rec?.direction).toBe("o2h");
  });

  it("OH 偏守成（H 侧高）→ 先练 h2o", () => {
    const rec = recommendPractice({ AC: dim("AC", 50), OH: dim("OH", 35) });
    expect(rec?.direction).toBe("h2o");
  });

  it("取偏离中位更远的那一轴", () => {
    // AC 偏 6 分，OH 偏 20 分 → OH 更极端
    const rec = recommendPractice({ AC: dim("AC", 56), OH: dim("OH", 30) });
    expect(rec?.direction).toBe("h2o");
  });

  it("摇摆轴不参与比较", () => {
    // AC 摇摆（偏离 12 分但读数不可信），OH 偏离 25 分且不摇摆 → 推荐 OH
    const rec = recommendPractice({ AC: dim("AC", 62, true), OH: dim("OH", 25) });
    expect(rec?.direction).toBe("h2o");
  });

  it("两轴都在摇摆 → 不给推荐", () => {
    const rec = recommendPractice({ AC: dim("AC", 52, true), OH: dim("OH", 49, true) });
    expect(rec).toBeNull();
  });

  it("两轴都恰好在中位 → 不给推荐", () => {
    const rec = recommendPractice({ AC: dim("AC", 50), OH: dim("OH", 50) });
    expect(rec).toBeNull();
  });

  it("推荐理由是一句人话，不含 undefined", () => {
    for (const ac of [30, 45, 60, 80]) {
      for (const oh of [25, 50, 75]) {
        const rec = recommendPractice({ AC: dim("AC", ac), OH: dim("OH", oh) });
        if (rec) {
          expect(rec.reason.length).toBeGreaterThan(5);
          expect(rec.reason).not.toContain("undefined");
        }
      }
    }
  });
});
