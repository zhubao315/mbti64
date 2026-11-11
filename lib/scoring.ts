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

/* ------------------------------------------------------------------ 临界副型 */

/** 前四维每一维的两种极性字母 */
const POLE_PAIRS: Record<string, readonly [string, string]> = {
  EI: ["E", "I"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

/**
 * 临界副型探针（Borderline & Subtype Probe）
 *
 * 【要解决的问题】
 * 前四维只要 preferred < 55 就被标为「模糊」，但输出里仍然只有一个基础型。
 * 一个在【决策依据 T/F】上只拿到 52% F 的人，得到的仍是 INFJ，
 * 而他很可能同时带着 INTJ 的特征 —— 结果页不揭示这一点，
 * 临界分用户就会觉得「不太像我」。
 *
 * 【口径】
 * - 只看前四维（EI/SN/TF/JP）：后缀两维已经用摇摆型（?）表达不确定性了；
 * - 只有 strength === "fuzzy"（50 ≤ preferred < 55）的维度才算临界；
 * - 翻转该维度得到一个邻近基础型，后缀保持不变；
 * - 离中位越近（preferred 越接近 50），这个邻近型越可能是「真实的另一半」，
 *   所以按离中位的距离升序排列。
 *
 * 【边界】
 * 本函数只做提示，不改变 scoreTest 的主编码输出。
 */
export interface BorderlineArchetype {
  /** 邻近基础型编码，如 INTJ-A-O */
  code: string;
  /** 被翻转的那个维度 */
  flipped: DimKey;
  /** 该维度离中位有多近（百分点，0~5，越小越临界） */
  margin: number;
  /** 一句话说明 */
  note: string;
}

export function detectBorderlineArchetypes(result: TestResult, limit = 2): BorderlineArchetype[] {
  const base = result.base;
  if (!base || base.length !== 4) return [];

  const candidates: BorderlineArchetype[] = [];

  for (const [i, key] of BASE_ORDER.entries()) {
    const d = result.dims[key];
    if (!d) continue;
    if (d.strength !== "fuzzy") continue;

    const pair = POLE_PAIRS[key];
    if (!pair) continue;
    const flippedPole = pair[0] === d.pole ? pair[1] : pair[0];
    const letters = base.split("");
    letters[i] = flippedPole;
    const code = `${letters.join("")}-${result.dims.AC.pole}-${result.dims.OH.pole}`;

    const margin = round1(d.preferred - 50);
    const dimName = DIMS[key].name;
    const poleName = d.pole === DIMS[key].poleA ? DIMS[key].poleAName : DIMS[key].poleBName;

    candidates.push({
      code,
      flipped: key,
      margin,
      note: `你在【${dimName}】上非常接近中位（${poleName} ${d.preferred}%），因此除了主型 ${result.displayCode}，你身上也常带有 ${code} 的跨界特征。`,
    });
  }

  return candidates.sort((a, b) => a.margin - b.margin).slice(0, Math.max(0, limit));
}

/* ------------------------------------------------------- 逐维读数的动态解读 */

/**
 * 逐维读数的动态解读。
 *
 * 同一个字母，85% 与 53% 说的是两件事：
 * 前者是稳定倾向，后者几乎还没有方向。
 * 结果页「逐维读数」里据此给每维补一句具体的、可对照自身经验的说明。
 */
export function dimensionReading(dims: Record<DimKey, DimScore>, key: DimKey): string {
  const d = dims[key];
  if (!d) return "";
  const meta = DIMS[key];
  const poleName = d.pole === meta.poleA ? meta.poleAName : meta.poleBName;
  const pct = Math.round(d.preferred);

  if (d.strength === "fuzzy") {
    return `${poleName} 只有 ${pct}%，几乎没有方向 —— 你在这一维上更像随情境切换，而不是固定的一种人。`;
  }
  if (d.strength === "moderate") {
    return `${poleName} ${pct}%，倾向存在但不算强 —— 大多数场合你会走这一侧，偶尔也会翻面。`;
  }
  return `${poleName} ${pct}%，是很稳的一侧 —— 你在这件事上的默认反应，几乎不需要临场决定。`;
}
