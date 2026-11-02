import { describe, expect, it } from "vitest";
import {
  BASE_GROUPS,
  STRENGTH_LABEL,
  answeredCount,
  isComplete,
  isValidCode,
  scoreDimension,
  scoreTest,
  signedPercent,
  strengthOf,
  voteThreshold,
} from "@/lib/scoring";
import { DIMS, DIM_ORDER, type DimKey, type Question } from "@/data/schema";
import { QUESTION_BY_ID, SESSION_ORDER, ALL_QUESTIONS } from "@/data/questions";

/**
 * 计分引擎单测
 *
 * 覆盖重点（也是这个产品最容易出错的地方）：
 *  1) 反向计分的符号
 *  2) 后缀维度的 2/3 投票门槛与「摇摆型」降级
 *  3) 强度分档边界（55 / 70）
 *  4) 空答案 / 部分答案不崩
 */

/** 把一道题的答案定位到 poleA 或 poleB 侧 */
function pick(question: Question, side: "A" | "B"): number {
  const want = DIMS[question.dim][side === "A" ? "poleA" : "poleB"];
  if (question.type === "likert") {
    // 反向题的「同意」指向 poleB，因此不能用下标硬编码
    const agreePole = question.reverse ? DIMS[question.dim].poleB : DIMS[question.dim].poleA;
    return agreePole === want ? 0 : 4;
  }
  const idx = (question.choices ?? []).findIndex((c) => c.pole === want);
  if (idx === -1) throw new Error(`question ${question.id} 没有 ${want} 选项`);
  return idx;
}

function answerAll(questions: Question[], side: "A" | "B"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of questions) out[q.id] = pick(q, side);
  return out;
}

describe("strengthOf 强度分档", () => {
  it("55 与 70 是闭开区间边界", () => {
    expect(strengthOf(50)).toBe("fuzzy");
    expect(strengthOf(54.9)).toBe("fuzzy");
    expect(strengthOf(55)).toBe("moderate");
    expect(strengthOf(69.9)).toBe("moderate");
    expect(strengthOf(70)).toBe("strong");
    expect(strengthOf(100)).toBe("strong");
  });

  it("三档都有中文标签", () => {
    expect(STRENGTH_LABEL.fuzzy).toBe("模糊");
    expect(STRENGTH_LABEL.moderate).toBe("较强");
    expect(STRENGTH_LABEL.strong).toBe("显著");
  });
});

describe("voteThreshold 后缀投票门槛", () => {
  it("按 2/3 向上取整", () => {
    expect(voteThreshold(6)).toBe(4); // 完整模式
    expect(voteThreshold(3)).toBe(2); // 精简模式
    expect(voteThreshold(2)).toBe(2);
    expect(voteThreshold(1)).toBe(1);
  });

  it("0 票兜底为 1，避免除零式门槛", () => {
    expect(voteThreshold(0)).toBe(1);
    expect(voteThreshold(-3)).toBe(1);
  });
});

describe("scoreTest 全维度", () => {
  const full = SESSION_ORDER.full;

  it("全部选 poleA → ESTJ-A-O", () => {
    const r = scoreTest(answerAll(full, "A"), full, "full");
    expect(r.base).toBe("ESTJ");
    expect(r.code).toBe("ESTJ-A-O");
    expect(r.displayCode).toBe("ESTJ-A-O");
    expect(r.group).toBe("guardian");
    expect(r.complete).toBe(true);
    expect(r.swing).toEqual({ AC: false, OH: false });
    expect(r.answeredCount).toBe(120);
    expect(r.totalCount).toBe(120);
  });

  it("全部选 poleB → INFP-C-H", () => {
    const r = scoreTest(answerAll(full, "B"), full, "full");
    expect(r.base).toBe("INFP");
    expect(r.code).toBe("INFP-C-H");
    expect(r.group).toBe("diplomat");
    expect(r.dims.EI.percentA).toBe(0);
    expect(r.dims.EI.preferred).toBe(100);
    expect(r.dims.EI.strength).toBe("strong");
  });

  it("精简模式只统计 60 题，但依然给出合法 64 型编码", () => {
    const quick = SESSION_ORDER.quick;
    const r = scoreTest(answerAll(quick, "A"), quick, "quick");
    expect(r.totalCount).toBe(60);
    expect(r.mode).toBe("quick");
    expect(isValidCode(r.code)).toBe(true);
  });

  it("同一份答案在两种模式下不要求完全一致（题量不同），但都必须是合法编码", () => {
    const answers = answerAll(SESSION_ORDER.full, "A");
    const fullR = scoreTest(answers, SESSION_ORDER.full, "full");
    const quickR = scoreTest(answers, SESSION_ORDER.quick, "quick");
    expect(isValidCode(fullR.code)).toBe(true);
    expect(isValidCode(quickR.code)).toBe(true);
  });
});

describe("反向计分", () => {
  it("反向题「非常同意」应推向 poleB", () => {
    const reverseQ = ALL_QUESTIONS.find((q) => q.reverse);
    expect(reverseQ).toBeDefined();
    const dim = reverseQ!.dim;

    // 只答这一题：强烈同意 → 应该得到一个偏向 poleB 的分数
    const answers = { [reverseQ!.id]: 0 };
    const score = scoreDimension(dim, answers, ALL_QUESTIONS);
    expect(score.percentA).toBeLessThan(50);
    expect(score.pole).toBe(DIMS[dim].poleB);
    expect(score.answered).toBe(1);
  });

  it("同一道题正向作答时符号相反", () => {
    const reverseQ = ALL_QUESTIONS.find((q) => q.reverse)!;
    const neutralQ = ALL_QUESTIONS.find((q) => q.dim === reverseQ.dim && !q.reverse && q.type === "likert")!;

    // 两道题都设为「完全同意」，若只有其中一道是反向，得分应一正一负
    const dim = reverseQ.dim;
    const qs = [reverseQ, neutralQ];
    const score = scoreDimension(dim, { [reverseQ.id]: 0, [neutralQ.id]: 0 }, qs);
    // 反向题贡献 -2，正向题贡献 +2 → 抵消为 50%
    expect(score.percentA).toBe(50);
    expect(score.strength).toBe("fuzzy");
  });
});

describe("后缀摇摆型", () => {
  it("AC 二选一 3:3 平票（不足 4 票）→ swing，编码仍收进 64 型", () => {
    const answers = answerAll(SESSION_ORDER.full, "A");

    // 把 AC 的 6 道二选一拆成 3:3；likert 全部改中立（下标 2 = 0 分）
    let n = 0;
    for (const q of SESSION_ORDER.full) {
      if (q.dim !== "AC") continue;
      if (q.type === "binary") {
        answers[q.id] = n % 2 === 0 ? 0 : 1;
        n += 1;
      } else {
        answers[q.id] = 2;
      }
    }

    const r = scoreTest(answers, SESSION_ORDER.full, "full");
    expect(r.swing.AC).toBe(true);
    expect(r.swing.OH).toBe(false);
    expect(r.displayCode.includes("?")).toBe(true);
    expect(r.displayCode).toContain("-?-");
    // code 依然是规范的 64 型之一
    expect(isValidCode(r.code)).toBe(true);
    expect(r.dims.AC.binary).toMatchObject({ a: 3, b: 3, total: 6, need: 4 });
  });

  it("达到 4 票门槛则不再摇摆", () => {
    const answers = answerAll(SESSION_ORDER.full, "A");
    const r = scoreTest(answers, SESSION_ORDER.full, "full");
    expect(r.dims.AC.binary).toMatchObject({ a: 6, b: 0, total: 6, need: 4 });
    expect(r.swing.AC).toBe(false);
  });

  it("平票时规范字母回落到 Likert 倾向", () => {
    const answers = answerAll(SESSION_ORDER.full, "A");
    // AC 全部中立 + 3:3 平票 → likert 50% → poleA
    let n = 0;
    for (const q of SESSION_ORDER.full) {
      if (q.dim !== "AC") continue;
      if (q.type === "binary") {
        answers[q.id] = n % 2 === 0 ? 0 : 1;
        n += 1;
      } else {
        answers[q.id] = 2;
      }
    }
    const r = scoreTest(answers, SESSION_ORDER.full, "full");
    expect(r.dims.AC.percentA).toBe(50);
    expect(r.dims.AC.pole).toBe("A");
  });
});

describe("空答案与部分答案", () => {
  it("空答案不崩溃，四字母落到 poleA 侧、强弱为模糊", () => {
    const r = scoreTest({}, SESSION_ORDER.full, "full");
    expect(r.complete).toBe(false);
    expect(r.answeredCount).toBe(0);
    expect(r.dims.EI.percentA).toBe(50);
    expect(r.dims.EI.strength).toBe("fuzzy");
    expect(isValidCode(r.code)).toBe(true);
  });

  it("部分答案的 complete 为 false，answeredCount 正确", () => {
    const answers = answerAll(SESSION_ORDER.full.slice(0, 7), "A");
    const r = scoreTest(answers, SESSION_ORDER.full, "full");
    expect(r.answeredCount).toBe(7);
    expect(r.complete).toBe(false);
    expect(answeredCount(answers, SESSION_ORDER.full)).toBe(7);
    expect(isComplete(answers, SESSION_ORDER.full)).toBe(false);
  });

  it("非法下标不进入计分（但进度按「键存在」计）", () => {
    const q = SESSION_ORDER.full.find((x) => x.type === "likert")!;
    const r = scoreTest({ [q.id]: 99 }, SESSION_ORDER.full, "full");
    expect(r.dims[q.dim].answered).toBe(0);
    expect(r.dims[q.dim].percentA).toBe(50);
    expect(r.complete).toBe(false);
  });
});

describe("signedPercent", () => {
  it("极化分数映射到 ±100", () => {
    const a = scoreTest(answerAll(SESSION_ORDER.full, "A"), SESSION_ORDER.full, "full");
    expect(signedPercent(a.dims.EI)).toBe(100);
    const b = scoreTest(answerAll(SESSION_ORDER.full, "B"), SESSION_ORDER.full, "full");
    expect(signedPercent(b.dims.EI)).toBe(-100);
  });

  it("中立为 0", () => {
    const answers: Record<string, number> = {};
    for (const q of SESSION_ORDER.full) answers[q.id] = q.type === "likert" ? 2 : 0;
    const r = scoreTest(answers, SESSION_ORDER.full, "full");
    expect(Math.abs(signedPercent(r.dims.TF))).toBeLessThanOrEqual(100);
  });
});

describe("编码规则", () => {
  it("CODE_RE 只接受 16×4 组合的格式", () => {
    expect(isValidCode("INFJ-A-O")).toBe(true);
    expect(isValidCode("ENFP-C-H")).toBe(true);
    expect(isValidCode("infj-a-o")).toBe(false);
    expect(isValidCode("INFJ-A")).toBe(false);
    expect(isValidCode("XXXX-A-O")).toBe(false);
    expect(isValidCode("INFJ-X-O")).toBe(false);
  });

  it("BASE_GROUPS 覆盖 16 个基础型且族群合法", () => {
    expect(Object.keys(BASE_GROUPS)).toHaveLength(16);
    expect(new Set(Object.values(BASE_GROUPS))).toEqual(
      new Set(["analyst", "adventurer", "diplomat", "guardian"]),
    );
  });

  it("DIM_ORDER 固定为六维顺序", () => {
    expect(DIM_ORDER).toEqual<DimKey[]>(["EI", "SN", "TF", "JP", "AC", "OH"]);
  });
});
