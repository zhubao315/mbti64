import {
  DIMS,
  DIM_ORDER,
  LIKERT_VALUES,
  type DimKey,
  type DimScore,
  type GroupKey,
  type Mode,
  type Pole,
  type Question,
  type Strength,
  type TestResult,
} from "@/data/schema";

/** 四大族群归属：由四字母基础型决定 */
export const BASE_GROUPS: Record<string, GroupKey> = {
  INTJ: "analyst",
  INTP: "analyst",
  ENTJ: "analyst",
  ENTP: "analyst",
  ISTP: "adventurer",
  ISFP: "adventurer",
  ESTP: "adventurer",
  ESFP: "adventurer",
  INFJ: "diplomat",
  INFP: "diplomat",
  ENFJ: "diplomat",
  ENFP: "diplomat",
  ISTJ: "guardian",
  ISFJ: "guardian",
  ESTJ: "guardian",
  ESFJ: "guardian",
};

export const BASE_ORDER: DimKey[] = ["EI", "SN", "TF", "JP"];

export const STRENGTH_LABEL: Record<Strength, string> = {
  fuzzy: "模糊",
  moderate: "较强",
  strong: "显著",
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 把主导侧百分比映射为倾向强度分档：
 * < 55 模糊 · 55–70 较强 · > 70 显著
 */
export function strengthOf(preferred: number): Strength {
  if (preferred < 55) return "fuzzy";
  if (preferred < 70) return "moderate";
  return "strong";
}

/**
 * 后缀维度的二选一票数门槛：总票数的 2/3 向上取整。
 * 完整模式 6 题 → 4 票；精简模式 3 题 → 2 票。
 */
export function voteThreshold(totalVotes: number): number {
  if (totalVotes <= 0) return 1;
  return Math.ceil((totalVotes * 2) / 3);
}

interface DimTally {
  sum: number;
  max: number;
  answered: number;
  total: number;
  binA: number;
  binB: number;
  likertSum: number;
  likertMax: number;
  likertAnswered: number;
}

function tallyDimension(key: DimKey, answers: Record<string, number>, questions: Question[]): DimTally {
  const meta = DIMS[key];
  const tally: DimTally = { sum: 0, max: 0, answered: 0, total: 0, binA: 0, binB: 0, likertSum: 0, likertMax: 0, likertAnswered: 0 };

  for (const q of questions) {
    if (q.dim !== key) continue;
    tally.total += 1;
    const idx = answers[q.id];
    if (typeof idx !== "number" || Number.isNaN(idx)) continue;

    if (q.type === "likert") {
      const value = LIKERT_VALUES[idx];
      if (typeof value !== "number") continue;
      tally.sum += q.reverse ? -value : value;
      tally.max += 2;
      tally.answered += 1;
      tally.likertSum += q.reverse ? -value : value;
      tally.likertMax += 2;
      tally.likertAnswered += 1;
      continue;
    }

    const choice = q.choices?.[idx];
    if (!choice) continue;
    const signed = choice.pole === meta.poleA ? 1 : -1;
    tally.sum += signed;
    tally.max += 1;
    tally.answered += 1;
    if (q.type === "binary") {
      if (signed > 0) tally.binA += 1;
      else tally.binB += 1;
    }
  }

  return tally;
}

/** 单维度计分：Σ得分 / 该维度满分 → 百分比倾向 */
export function scoreDimension(key: DimKey, answers: Record<string, number>, questions: Question[]): DimScore {
  const meta = DIMS[key];
  const tally = tallyDimension(key, answers, questions);

  // 基础百分比（Likert + Binary 合并，用于非后缀维度与回退）
  const percentA = tally.max === 0 ? 50 : round1(clamp(50 + (50 * tally.sum) / tally.max, 0, 100));
  const percentB = round1(100 - percentA);
  const preferred = round1(Math.max(percentA, percentB));
  const strength = strengthOf(preferred);
  const likertPole: Pole = percentA >= 50 ? meta.poleA : meta.poleB;

  const voteTotal = tally.binA + tally.binB;
  const need = voteThreshold(voteTotal);
  let pole = likertPole;
  let swing = false;

  if (key === "AC" || key === "OH") {
    // Likert 侧百分比
    const likertPct = tally.likertMax === 0 ? 50 : clamp(50 + (50 * tally.likertSum) / tally.likertMax, 0, 100);
    // Binary 侧百分比（ipsative 投票）
    const binPct = voteTotal === 0 ? 50 : (tally.binA / voteTotal) * 100;
    // 混合：Likert 60% + Binary 40%
    const blended = round1(0.6 * likertPct + 0.4 * binPct);

    if (voteTotal > 0) {
      if (tally.binA >= need) pole = meta.poleA;
      else if (tally.binB >= need) pole = meta.poleB;
      else {
        swing = true;
        pole = likertPole;
      }
      // 极向一致性保护：非摇摆态下，混合百分比方向必须与 pole 一致
      if (!swing) {
        const conflict = (pole === meta.poleA && blended < 50) || (pole === meta.poleB && blended > 50);
        if (conflict) {
          swing = true;
          pole = likertPole;
        }
      }
    } else {
      swing = strength === "fuzzy";
    }

    return {
      key,
      poleA: meta.poleA,
      poleB: meta.poleB,
      percentA: blended,
      percentB: round1(100 - blended),
      pole,
      preferred: round1(Math.max(blended, 100 - blended)),
      strength,
      answered: tally.answered,
      total: tally.total,
      binary: { a: tally.binA, b: tally.binB, total: voteTotal, need },
      swing,
    };
  }

  return {
    key,
    poleA: meta.poleA,
    poleB: meta.poleB,
    percentA,
    percentB,
    pole,
    preferred,
    strength,
    answered: tally.answered,
    total: tally.total,
    swing,
  };
}

export function isComplete(answers: Record<string, number>, questions: Question[]): boolean {
  return questions.every((q) => typeof answers[q.id] === "number");
}

export function answeredCount(answers: Record<string, number>, questions: Question[]): number {
  return questions.reduce((n, q) => (typeof answers[q.id] === "number" ? n + 1 : n), 0);
}

/**
 * 汇总计分：四字母 + A/C + O/H → 64 型之一。
 * 摇摆后缀以 ? 展示，但 code 仍落在 64 型内，保证榜单/统计可用。
 */
export function scoreTest(
  answers: Record<string, number>,
  questions: Question[],
  mode: Mode = "full",
  now = Date.now(),
): TestResult {
  const dims = {} as Record<DimKey, DimScore>;
  for (const key of DIM_ORDER) dims[key] = scoreDimension(key, answers, questions);

  const base = BASE_ORDER.map((k) => dims[k].pole).join("");
  const ac = dims.AC.pole;
  const oh = dims.OH.pole;
  const code = `${base}-${ac}-${oh}`;
  const displayCode = `${base}-${dims.AC.swing ? "?" : ac}-${dims.OH.swing ? "?" : oh}`;
  const total = questions.length;
  const done = answeredCount(answers, questions);

  return {
    base,
    code,
    displayCode,
    group: BASE_GROUPS[base] ?? "analyst",
    dims,
    swing: { AC: dims.AC.swing, OH: dims.OH.swing },
    mode,
    answeredCount: done,
    totalCount: total,
    complete: done >= total && total > 0,
    scoredAt: now,
  };
}

/** 雷达图 / 匹配算法用的有符号倾向：-100（poleB 极）… +100（poleA 极） */
export function signedPercent(score: DimScore): number {
  return Math.round((score.percentA - 50) * 2);
}

export const CODE_RE = /^[EI][SN][TF][JP]-[AC]-[OH]$/;

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code);
}
