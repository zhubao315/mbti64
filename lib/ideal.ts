import { DIMS, DIM_ORDER, type DimKey, type DimScore, type TestResult } from "@/data/schema";
import { BASE_GROUPS } from "@/lib/scoring";

/**
 * 「理想型」构造器：把 64 型编码反解成一份满分倾向的 DimScore。
 *
 * 用途：静态型别页 /type/[code] 没有用户答题数据，但需要雷达图、相近型别与文案。
 * 这里所有维度取极值（100% / 0%），代表「该型别最典型的形态」，
 * 而不是假装我们统计过该型用户的平均分 —— 页面上会明确写「典型形态」。
 */

function polesOf(code: string): Record<DimKey, string> {
  const [base, ac, oh] = code.split("-");
  const letters = base.split("");
  return {
    EI: letters[0],
    SN: letters[1],
    TF: letters[2],
    JP: letters[3],
    AC: ac,
    OH: oh,
  };
}

export function idealDims(code: string): Record<DimKey, DimScore> {
  const poles = polesOf(code);
  const dims = {} as Record<DimKey, DimScore>;

  for (const key of DIM_ORDER) {
    const meta = DIMS[key];
    const mine = poles[key];
    const isA = mine === meta.poleA;
    const percentA = isA ? 100 : 0;
    const isSuffix = key === "AC" || key === "OH";

    dims[key] = {
      key,
      poleA: meta.poleA,
      poleB: meta.poleB,
      percentA,
      percentB: 100 - percentA,
      pole: mine as DimScore["pole"],
      preferred: 100,
      strength: "strong",
      answered: 10,
      total: 10,
      ...(isSuffix
        ? {
            binary: {
              a: isA ? 6 : 0,
              b: isA ? 0 : 6,
              total: 6,
              need: 4,
            },
            swing: false,
          }
        : { swing: false }),
    };
  }

  return dims;
}

/** 由编码构造一个「完整」的 TestResult，仅供静态页面复用匹配/雷达组件 */
export function idealResult(code: string): TestResult {
  const base = code.split("-")[0];
  return {
    base,
    code,
    displayCode: code,
    group: BASE_GROUPS[base] ?? "analyst",
    dims: idealDims(code),
    swing: { AC: false, OH: false },
    mode: "full",
    answeredCount: 120,
    totalCount: 120,
    complete: true,
    scoredAt: 0,
  };
}
