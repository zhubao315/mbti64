/**
 * 算法回归快照测试
 *
 * 目的：锁定算法基线 —— Phase 1–6 任何改动后都必须重跑，输出字段与本快照一致才算安全。
 *
 * 保护：以下常量 / 函数改动必须同步修改本文件：
 *   - lib/scoring.ts LIKERT_VALUES / BASE_GROUPS / voteThreshold / strengthOf
 *   - lib/scoring.ts scoreDimension / scoreTest 的输入输出契约
 *   - data/schema.ts DIMS 元数据（poleA / poleB 映射）
 *   - data/schema.ts TestResult 字段
 */
import { describe, it, expect } from "vitest";
import { scoreTest, scoreDimension, BASE_GROUPS, voteThreshold, strengthOf, signedPercent, isValidCode } from "@/lib/scoring";
import { ALL_QUESTIONS, CORE_QUESTIONS } from "@/data/questions.zh-CN";
import { LIKERT_VALUES, DIMS } from "@/data/schema";

/** 120 题全答（每题给 Likert 第 3 档"说不清"，让算法自己跑完整流程） */
function defaultAnswers(questions: typeof ALL_QUESTIONS): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of questions) out[q.id] = 2; // 五档索引 2 = "说不清"
  return out;
}

/** code / displayCode / base 的基本契约验证 */
describe("算法回归快照 · 基本契约", () => {
  const answers = defaultAnswers(ALL_QUESTIONS);
  const r = scoreTest(answers, ALL_QUESTIONS, "full", 1700000000000);

  it("mode=full", () => expect(r.mode).toBe("full"));
  it("totalCount=120", () => expect(r.totalCount).toBe(120));
  it("answeredCount=120", () => expect(r.answeredCount).toBe(120));
  it("complete=true", () => expect(r.complete).toBe(true));
  it("code 6 字母编码合法", () => expect(isValidCode(r.code)).toBe(true));
  it("base 合法 4 字母", () => expect(/^[EI][SN][TF][JP]$/.test(r.base)).toBe(true));
  it("阵营归属从 BASE_GROUPS 取到", () => expect(BASE_GROUPS[r.base]).toBeDefined());

  // code 拼接：base + AC.pole + OH.pole（不用 displayCode）
  it("code = base + AC.pole + OH.pole", () => {
    expect(r.code).toBe(`${r.base}-${r.dims.AC.pole}-${r.dims.OH.pole}`);
  });

  // displayCode 与 code 同步：如果 swing 某后缀维度，displayCode 对应位置用 ? 替换
  it("displayCode 与 swing 一致", () => {
    const parts = r.displayCode.split("-");
    expect(parts[0]).toBe(r.base);
    expect(parts[1]).toBe(r.swing.AC ? "?" : r.dims.AC.pole);
    expect(parts[2]).toBe(r.swing.OH ? "?" : r.dims.OH.pole);
  });
});

/** scoreTest 返回结构 —— 字段集合和类型契约不能变 */
describe("scoreTest 契约", () => {
  const r = scoreTest(defaultAnswers(ALL_QUESTIONS), ALL_QUESTIONS, "full");
  const keys = Object.keys(r);

  it("11 个顶层字段", () => expect(keys.length).toBe(11));
  it("TestResult 字段集合完整", () => {
    for (const f of ["base", "code", "displayCode", "dims", "complete", "answeredCount", "totalCount", "mode", "group", "scoredAt", "swing"]) {
      expect(keys).toContain(f);
    }
  });

  it("dims 包含 6 个维度", () => {
    const k = Object.keys(r.dims);
    for (const d of ["EI", "SN", "TF", "JP", "AC", "OH"]) expect(k).toContain(d);
    expect(k.length).toBe(6);
  });

  for (const dim of ["EI", "SN", "TF", "JP"] as const) {
    const s = r.dims[dim];
    it(`${dim} 纯 Likert DimScore 字段完整`, () => {
      expect(typeof s.percentA).toBe("number");
      expect(typeof s.percentB).toBe("number");
      expect(typeof s.answered).toBe("number");
      expect(typeof s.total).toBe("number");
      expect(typeof s.strength).toBe("string");
      expect(typeof s.swing).toBe("boolean");
    });
  }

  for (const dim of ["AC", "OH"] as const) {
    const s = r.dims[dim];
    const bin = (s as any).binary;
    it(`${dim} 后缀维度 binary 字段完整 + need 符合公式`, () => {
      expect(bin).toBeDefined();
      expect(typeof bin.a).toBe("number");
      expect(typeof bin.b).toBe("number");
      expect(typeof bin.total).toBe("number");
      expect(bin.need).toBe(voteThreshold(bin.total));
    });
  }
});

/** BASE_GROUPS 16 → 4 映射表 —— 一个字母都不能变 */
describe("BASE_GROUPS 不可变动", () => {
  const expected = [
    "ENFJ", "ENFP", "ENTJ", "ENTP",
    "ESFJ", "ESFP", "ESTJ", "ESTP",
    "INFJ", "INFP", "INTJ", "INTP",
    "ISFJ", "ISFP", "ISTJ", "ISTP",
  ];
  it("16 个基础型键", () => expect(Object.keys(BASE_GROUPS).sort()).toStrictEqual(expected));
  it("4 阵营覆盖", () => {
    const groups = Object.values(BASE_GROUPS);
    expect(new Set(groups).size).toBe(4);
    for (const g of ["analyst", "adventurer", "diplomat", "guardian"]) expect(groups).toContain(g);
  });
});

/** voteThreshold 公式 —— ceil(2/3 * n) 不能变 */
describe("voteThreshold 不可变动", () => {
  it.each([[6, 4], [5, 4], [4, 3], [3, 2], [0, 1]])("voteThreshold(%d) → %d", (n, want) => expect(voteThreshold(n)).toBe(want));
});

/** strengthOf 分档不可变：<55 模糊 · 55–70 较强 · >70 显著 */
describe("strengthOf 不可变动", () => {
  it.each([[54.9, "fuzzy"], [55, "moderate"], [69.9, "moderate"], [70, "strong"]])(
    "strengthOf(%s) → %s",
    (n, want) => expect(strengthOf(n)).toBe(want),
  );
});

/** LIKERT_VALUES 分值映射不可变 */
describe("LIKERT_VALUES 不可变动", () => {
  it("五档 [+2, +1, 0, -1, -2]", () => expect(LIKERT_VALUES).toStrictEqual([2, 1, 0, -1, -2]));
});

/** signedPercent 公式：(percentA - 50) * 2 四舍五入 */
describe("signedPercent 不可变动", () => {
  const makeScore = (percentA: number) => ({
    key: "EI" as const, poleA: "E" as const, poleB: "I" as const,
    percentA, percentB: 100 - percentA, pole: "E" as any, swing: false,
    answered: 10, total: 10, preferred: Math.max(percentA, 100 - percentA), strength: "strong" as any,
  });
  it.each([[0, -100], [100, 100], [50, 0], [25, -50], [75, 50]])("signedPercent(%s) → %s", (a, want) => {
    expect(signedPercent(makeScore(a))).toBe(want);
  });
});

/** DIMS 元数据 poleA / poleB 映射不可变 */
describe("DIMS 元数据不可变动", () => {
  const expected: Record<string, [string, string]> = {
    EI: ["E", "I"], SN: ["S", "N"], TF: ["T", "F"], JP: ["J", "P"],
    AC: ["A", "C"], OH: ["O", "H"],
  };
  for (const [dim, [a, b]] of Object.entries(expected)) {
    it(`${dim} poleA=${a} poleB=${b}`, () => {
      expect(DIMS[dim as keyof typeof DIMS].poleA).toBe(a);
      expect(DIMS[dim as keyof typeof DIMS].poleB).toBe(b);
    });
  }
});

/** scoreDimension 返回的 percentA 在 [0, 100] 内 */
describe("percentA 范围", () => {
  for (const dim of ["EI", "SN", "TF", "JP", "AC", "OH"] as const) {
    it(`${dim} percentA ∈ [0, 100]`, () => {
      const s = scoreDimension(dim, defaultAnswers(ALL_QUESTIONS), ALL_QUESTIONS);
      expect(s.percentA).toBeGreaterThanOrEqual(0);
      expect(s.percentA).toBeLessThanOrEqual(100);
    });
  }
});

/** quick 模式 60 题完整走完 */
describe("quick 模式", () => {
  it("60 题完整跑完输出合法 6 字母编码", () => {
    const r = scoreTest(defaultAnswers(CORE_QUESTIONS), CORE_QUESTIONS, "quick");
    expect(r.mode).toBe("quick");
    expect(r.totalCount).toBe(60);
    expect(r.complete).toBe(true);
    expect(isValidCode(r.code)).toBe(true);
  });
});

/** displayCode：摇摆后缀用 ? 但 code 仍合法 */
describe("摇摆型 displayCode 合法性", () => {
  // 极端输入：每题都选"说不清"—— Likert 维度 percentA 全部 = 50，AC/OH Likert 倾向模糊
  // 这种情况下 swing = true 是预期的
  const answers: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) answers[q.id] = 2;

  it("摇摆型 code 仍合法 6 字母", () => {
    const r = scoreTest(answers, ALL_QUESTIONS, "full");
    expect(isValidCode(r.code)).toBe(true);
  });

  it("displayCode 合法 6 字母（允许 ?）", () => {
    const r = scoreTest(answers, ALL_QUESTIONS, "full");
    expect(/^[EI][SN][TF][JP]-[?A]-[?OH]$/.test(r.displayCode)).toBe(true);
  });
});
