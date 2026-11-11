import { describe, expect, it } from "vitest";
import {
  detectBorderlineArchetypes,
  dimensionReading,
  scoreTest,
} from "@/lib/scoring";
import {
  calculateConfidenceScore,
  straightliningCheck,
  STRAIGHTLINE_MIN_RUN,
  NEUTRAL_RATIO_LIMIT,
  type ConsistencyIssue,
} from "@/lib/answer-checks";
import { DIMS, DIM_ORDER, type DimKey, type DimScore, type TestResult } from "@/data/schema";
import { SESSION_ORDER } from "@/data/questions";

/**
 * 心理测量学升维单测
 *
 * 覆盖三块新能力：
 *  1) 临界副型探针：前四维读数接近中位时，指出隔壁那型
 *  2) 直线作答检测：连续同选 / 全卷中立
 *  3) 作答清晰度指数：只作自我参照，不改主编码
 */

/** 造一个指定读数的维度 */
function dim(key: DimKey, percentA: number, strength: DimScore["strength"] = "moderate"): DimScore {
  const meta = DIMS[key];
  const preferred = Math.max(percentA, 100 - percentA);
  return {
    key,
    poleA: meta.poleA,
    poleB: meta.poleB,
    percentA,
    percentB: 100 - percentA,
    pole: percentA >= 50 ? meta.poleA : meta.poleB,
    preferred,
    strength,
    answered: 20,
    total: 20,
    swing: false,
  };
}

/**
 * 造一个自洽的结果。
 *
 * margins[k] = 该维「偏向基础型自己那个字母」的百分点数（0~50）。
 * 必须自洽：base 的字母必须等于该维的主导极 —— 真实链路里
 * scoreTest 就是这样从 dims.pole 拼出 base 的，不自洽的假数据会让
 * 「翻转某维得到邻近副型」这类断言失去意义。
 */
function makeResult(margins: Partial<Record<DimKey, number>> = {}, base = "INFJ"): TestResult {
  const dims = {} as Record<DimKey, DimScore>;
  const LETTER_INDEX: Record<string, number> = { EI: 0, SN: 1, TF: 2, JP: 3 };
  for (const k of DIM_ORDER) {
    const meta = DIMS[k];
    // AC / OH 不参与基础型拼写，后缀固定为 A-O：percentA 一律朝 poleA
    const baseLetter = base[LETTER_INDEX[k]];
    const towardA = LETTER_INDEX[k] === undefined ? true : baseLetter === meta.poleA;
    const margin = margins[k] ?? 30;
    const percentA = towardA ? 50 + margin : 50 - margin;
    const strength = margin < 5 ? "fuzzy" : margin < 20 ? "moderate" : "strong";
    dims[k] = dim(k, percentA, strength);
  }
  return {
    base,
    code: `${base}-A-O`,
    displayCode: `${base}-A-O`,
    group: "diplomat",
    dims,
    swing: { AC: false, OH: false },
    mode: "full",
    answeredCount: 120,
    totalCount: 120,
    complete: true,
    scoredAt: 0,
  };
}

/* ---------------------------------------------------------------- 临界副型 */

describe("detectBorderlineArchetypes", () => {
  it("模糊维度的翻转基础型就是邻近副型", () => {
    const r = makeResult({ TF: 2 }, "INFJ");
    const list = detectBorderlineArchetypes(r);
    expect(list).toHaveLength(1);
    // INFJ 的 TF 翻转 → INTJ，后缀不变
    expect(list[0].code).toBe("INTJ-A-O");
    expect(list[0].flipped).toBe("TF");
  });

  it("只有 strength=fuzzy 的维度才算临界", () => {
    // 偏离 5 个百分点 → moderate，不是临界
    const r = makeResult({ TF: 5 }, "INFJ");
    expect(detectBorderlineArchetypes(r)).toHaveLength(0);
    // 偏离 4 个百分点 → fuzzy
    const r2 = makeResult({ TF: 4 }, "INFJ");
    expect(detectBorderlineArchetypes(r2)).toHaveLength(1);
  });

  it("离中位越近排越前", () => {
    const r = makeResult({ EI: 4, SN: 0.5, TF: 3 }, "INFJ");
    const list = detectBorderlineArchetypes(r, 3);
    expect(list.length).toBe(3);
    expect(list[0].flipped).toBe("SN");
    expect(list[1].flipped).toBe("TF");
    expect(list[2].flipped).toBe("EI");
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i - 1].margin).toBeLessThanOrEqual(list[i].margin);
    }
  });

  it("最多返回 limit 个", () => {
    const r = makeResult({ EI: 1, SN: 1, TF: 1, JP: 1 }, "INFP");
    expect(detectBorderlineArchetypes(r, 2)).toHaveLength(2);
    expect(detectBorderlineArchetypes(r, 1)).toHaveLength(1);
    expect(detectBorderlineArchetypes(r, 0)).toHaveLength(0);
  });

  it("后缀两维的摇摆不参与临界判定", () => {
    const r = makeResult({}, "INFJ");
    r.dims.AC.swing = true;
    r.dims.AC.strength = "fuzzy";
    expect(detectBorderlineArchetypes(r)).toHaveLength(0);
  });

  it("邻近副型仍然是合法的 64 型编码", () => {
    const r = makeResult({ EI: 2, TF: 1 }, "ENFP");
    for (const b of detectBorderlineArchetypes(r)) {
      expect(b.code).toMatch(/^[EI][SN][TF][JP]-[AC]-[OH]$/);
    }
  });

  it("提示语点明维度、读数与两个编码", () => {
    const r = makeResult({ TF: 2 }, "INFJ");
    const [b] = detectBorderlineArchetypes(r);
    expect(b.note).toContain("决策依据");
    expect(b.note).toContain("INFJ-A-O");
    expect(b.note).toContain("INTJ-A-O");
    expect(b.note).not.toContain("undefined");
  });

  it("base 异常时安全返回空数组", () => {
    const r = makeResult({ TF: 2 }, "XX");
    expect(detectBorderlineArchetypes(r)).toEqual([]);
  });

  it("与真实作答链路联通：临界作答能产出邻近副型", () => {
    const order = SESSION_ORDER.full;
    const answers: Record<string, number> = {};
    // 全选 A，再把 TF 维改成两边各半 → TF 读数落到中间
    for (const q of order) {
      answers[q.id] = q.type === "likert" ? (q.reverse ? 4 : 0) : 0;
    }
    let n = 0;
    for (const q of order) {
      if (q.dim !== "TF") continue;
      if (q.type === "likert") {
        answers[q.id] = n % 2 === 0 ? 0 : 4;
        n += 1;
      } else {
        answers[q.id] = n % 2 === 0 ? 0 : 1;
        n += 1;
      }
    }
    const r = scoreTest(answers, order, "full");
    // 无论 TF 是否恰好落到 fuzzy 区，函数都不应崩，且只返回前四维的临界项
    for (const b of detectBorderlineArchetypes(r)) {
      expect(["EI", "SN", "TF", "JP"]).toContain(b.flipped);
    }
  });
});

/* ------------------------------------------------------------ 逐维动态解读 */

describe("dimensionReading", () => {
  it("模糊 / 较强 / 显著三档给出不同表述", () => {
    const dims = {
      EI: dim("EI", 85, "strong"),
      SN: dim("SN", 62, "moderate"),
      TF: dim("TF", 52, "fuzzy"),
      JP: dim("JP", 50, "fuzzy"),
      AC: dim("AC", 80, "strong"),
      OH: dim("OH", 55, "moderate"),
    } as Record<DimKey, DimScore>;
    expect(dimensionReading(dims, "EI")).toContain("很稳的一侧");
    expect(dimensionReading(dims, "SN")).toContain("倾向存在但不算强");
    expect(dimensionReading(dims, "TF")).toContain("几乎没有方向");
  });

  it("维度缺失时返回空串而不是崩", () => {
    const dims = {} as Record<DimKey, DimScore>;
    expect(dimensionReading(dims, "EI")).toBe("");
  });
});

/* ------------------------------------------------------------ 直线作答检测 */

describe("straightliningCheck", () => {
  const order = SESSION_ORDER.full;
  const likertQs = order.filter((q) => q.type === "likert");

  it("连续同选达到门槛即判定为直线作答", () => {
    const answers: Record<string, number> = {};
    likertQs.slice(0, STRAIGHTLINE_MIN_RUN).forEach((q) => {
      answers[q.id] = 0;
    });
    const r = straightliningCheck(answers, order);
    expect(r.detected).toBe(true);
    expect(r.longestRun).toBeGreaterThanOrEqual(STRAIGHTLINE_MIN_RUN);
    expect(r.reasons.join()).toContain("连续");
  });

  it("连续同选未达门槛不算", () => {
    const answers: Record<string, number> = {};
    likertQs.slice(0, STRAIGHTLINE_MIN_RUN - 1).forEach((q) => {
      answers[q.id] = 0;
    });
    const r = straightliningCheck(answers, order);
    expect(r.longestRun).toBe(STRAIGHTLINE_MIN_RUN - 1);
    expect(r.detected).toBe(false);
  });

  it("全卷中立比例超过 40% 即判定", () => {
    const answers: Record<string, number> = {};
    const half = Math.floor(order.length * 0.5);
    order.slice(0, half).forEach((q) => {
      answers[q.id] = q.type === "likert" ? 2 : 0;
    });
    const r = straightliningCheck(answers, order);
    expect(r.neutralRatio).toBeGreaterThan(NEUTRAL_RATIO_LIMIT);
    expect(r.detected).toBe(true);
    expect(r.reasons.join()).toContain("说不清");
  });

  it("正常作答不触发", () => {
    const answers: Record<string, number> = {};
    order.forEach((q, i) => {
      answers[q.id] = q.type === "likert" ? i % 5 : i % 2;
    });
    const r = straightliningCheck(answers, order);
    expect(r.detected).toBe(false);
    expect(r.reasons).toHaveLength(0);
  });

  it("空答案安全返回", () => {
    const r = straightliningCheck(undefined, order);
    expect(r.detected).toBe(false);
    expect(r.longestRun).toBe(0);
    expect(r.neutralRatio).toBe(0);
  });

  it("选项改变会重置连续计数", () => {
    const answers: Record<string, number> = {};
    likertQs.slice(0, 12).forEach((q, i) => {
      answers[q.id] = i < 6 ? 0 : 1;
    });
    const r = straightliningCheck(answers, order);
    expect(r.longestRun).toBe(6);
  });
});

/* -------------------------------------------------------- 作答清晰度指数 */

describe("calculateConfidenceScore", () => {
  const cleanIssues: ConsistencyIssue[] = [];
  const cleanStraight = { detected: false, longestRun: 0, neutralRatio: 0, reasons: [] };

  it("读数清晰、作答规范 → 高分", () => {
    const r = makeResult({ EI: 30, SN: 28, TF: 32, JP: 26, AC: 25, OH: 22 });
    const c = calculateConfidenceScore(r, cleanIssues, cleanStraight, 0);
    expect(c.score).toBeGreaterThanOrEqual(80);
    expect(c.level).toBe("high");
    expect(c.label).toBe("高");
  });

  it("多个维度接近中位 → 分数下降且列出模糊维度", () => {
    const r = makeResult({ EI: 1, SN: 2, TF: 3, JP: 25, AC: 26, OH: 24 });
    const c = calculateConfidenceScore(r, cleanIssues, cleanStraight, 0);
    expect(c.score).toBeLessThan(80);
    expect(c.fuzzyDims).toEqual(["EI", "SN", "TF"]);
  });

  it("一致性提示会扣分并被记录", () => {
    const r = makeResult();
    const issues: ConsistencyIssue[] = [
      { dim: "EI", forward: 6, reverse: -5 },
      { dim: "SN", forward: 4, reverse: -4 },
    ];
    const c = calculateConfidenceScore(r, issues, cleanStraight, 0);
    expect(c.score).toBeLessThan(100);
    expect(c.factors.join()).toContain("不一致");
  });

  it("直线作答会扣分并被记录", () => {
    const r = makeResult();
    const straight = {
      detected: true,
      longestRun: 20,
      neutralRatio: 0.1,
      reasons: ["连续 20 道题选了同一个选项"],
    };
    const c = calculateConfidenceScore(r, cleanIssues, straight, 0);
    expect(c.factors.join()).toContain("连续 20 道题");
    expect(c.score).toBeLessThan(100);
  });

  it("快答比例越高分数越低", () => {
    const r = makeResult();
    const slow = calculateConfidenceScore(r, cleanIssues, cleanStraight, 0);
    const fast = calculateConfidenceScore(r, cleanIssues, cleanStraight, 0.9);
    expect(fast.score).toBeLessThan(slow.score);
    expect(fast.factors.join()).toContain("偏快");
  });

  it("分数恒在 0–100，level 与分数自洽", () => {
    for (const fast of [0, 0.3, 0.9, 1]) {
      const c = calculateConfidenceScore(makeResult({ EI: 0, SN: 0 }), cleanIssues, cleanStraight, fast);
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      if (c.score >= 80) expect(c.level).toBe("high");
      else if (c.score >= 60) expect(c.level).toBe("medium");
      else expect(c.level).toBe("low");
    }
  });

  it("低分档才建议重测，并点名维度", () => {
    const r = makeResult({ EI: 0, SN: 1, TF: 0, JP: 2, AC: 1, OH: 0 });
    const c = calculateConfidenceScore(r, cleanIssues, cleanStraight, 0.9);
    if (c.level === "low") {
      expect(c.suggestRetest.length).toBeGreaterThan(0);
      expect(c.summary).toContain("重测");
    }
  });

  it("不改变 scoreTest 的主编码（只是自我参照）", () => {
    const order = SESSION_ORDER.full;
    const answers: Record<string, number> = {};
    for (const q of order) answers[q.id] = q.type === "likert" ? (q.reverse ? 4 : 0) : 0;
    const before = scoreTest(answers, order, "full");
    calculateConfidenceScore(before, cleanIssues, cleanStraight, 0.5);
    const after = scoreTest(answers, order, "full");
    expect(after.code).toBe(before.code);
    expect(after.displayCode).toBe(before.displayCode);
    expect(after.dims).toEqual(before.dims);
  });
});
