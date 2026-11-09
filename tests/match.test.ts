import { describe, expect, it } from "vitest";
import {
  complementaryTypes,
  compatibilityLabel,
  l1Distance,
  loveCompatibility,
  sameGroupTypes,
  similarTypes,
  similarityOf,
  vectorFromCode,
  vectorFromDims,
} from "@/lib/match";
import { idealResult } from "@/lib/ideal";
import { TYPE_CODES } from "@/data/types64";
import { DIM_ORDER } from "@/data/schema";

/**
 * 匹配算法单测
 *
 * 语义约定（写进 README 和 UI 文案的口径）：
 *  - 向量每维 -100…+100，poleA 取正
 *  - 相似 = L1 距离最小；互补 = L1 距离最大
 *  - 恋爱兼容度在距离约 300 时最高
 */

describe("vectorFromCode", () => {
  it("极向字母映射为 ±100", () => {
    expect(vectorFromCode("ESTJ-A-O")).toEqual([100, 100, 100, 100, 100, 100]);
    expect(vectorFromCode("INFP-C-H")).toEqual([-100, -100, -100, -100, -100, -100]);
  });

  it("混合型逐位正确", () => {
    // I(-) N(-) F(-) J(+) A(+) O(+)
    expect(vectorFromCode("INFJ-A-O")).toEqual([-100, -100, -100, 100, 100, 100]);
  });

  it("同型距离为 0，完全相反为 1200", () => {
    expect(l1Distance(vectorFromCode("INFJ-A-O"), vectorFromCode("INFJ-A-O"))).toBe(0);
    expect(l1Distance(vectorFromCode("ESTJ-A-O"), vectorFromCode("INFP-C-H"))).toBe(1200);
  });
});

describe("vectorFromDims", () => {
  it("理想型（每维满分）得到与 vectorFromCode 相同的向量", () => {
    const r = idealResult("INFJ-A-O");
    expect(vectorFromDims(r.dims)).toEqual(vectorFromCode("INFJ-A-O"));
  });

  it("六维全部 50% 时向量为全 0", () => {
    const dims = Object.fromEntries(
      DIM_ORDER.map((k) => [
        k,
        {
          key: k,
          poleA: "E" as const,
          poleB: "I" as const,
          percentA: 50,
          percentB: 50,
          pole: "E" as const,
          preferred: 50,
          strength: "fuzzy" as const,
          answered: 0,
          total: 0,
          swing: false,
        },
      ]),
    );
    const v = vectorFromDims(dims as never);
    expect(v).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("similarTypes", () => {
  it("返回 3 条，且不含自己", () => {
    const me = idealResult("INFJ-A-O");
    const list = similarTypes(me, 3);
    expect(list).toHaveLength(3);
    expect(list.every((m) => m.type.code !== me.code)).toBe(true);
  });

  it("按距离升序，相似度降序", () => {
    const list = similarTypes(idealResult("INFJ-A-O"), 5);
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i].distance).toBeGreaterThanOrEqual(list[i - 1].distance);
      expect(list[i].similarity).toBeLessThanOrEqual(list[i - 1].similarity);
    }
  });

  it("最小距离为 200（只差一个字母）", () => {
    const me = idealResult("INFJ-A-O");
    const top = similarTypes(me, 3);
    // 同基础型换一个后缀、或换一个基础字母，距离都是 200
    expect(top[0].distance).toBe(200);
    for (const m of top) expect(m.distance).toBeLessThanOrEqual(400);
  });

  it("相似度落在 0–100", () => {
    for (const code of TYPE_CODES.slice(0, 8)) {
      for (const m of similarTypes(idealResult(code), 3)) {
        expect(m.similarity).toBeGreaterThanOrEqual(0);
        expect(m.similarity).toBeLessThanOrEqual(100);
        expect(m.reason.length).toBeGreaterThan(4);
      }
    }
  });

  it("只差一个维度的同基础型变体，相似度约 83（不再被压到 60 以下）", () => {
    const top = similarTypes(idealResult("INFJ-A-O"), 3);
    expect(top[0].distance).toBe(200);
    expect(top[0].similarity).toBe(83);
    for (const m of top) expect(m.similarity).toBeGreaterThanOrEqual(67);
  });

  it("温和倾向的用户，最近型别相似度仍不低于 80", () => {
    // INFP-C-O 的极向：前四维与 AC 取 B 侧、OH 取 A 侧；percentA 42/58 表示「温和偏科」
    const me = vectorFromDims(idealResult("INFP-C-O").dims);
    const mild = me.map((x) => Math.round(x * 0.4)) as typeof me;
    const nearest = Math.max(...TYPE_CODES.filter((c) => c !== "INFP-C-O").map((c) => similarityOf(mild, l1Distance(mild, vectorFromCode(c)))));
    expect(nearest).toBeGreaterThanOrEqual(80);
  });
});

describe("complementaryTypes", () => {
  it("返回距离最大的 3 条", () => {
    const me = idealResult("INFJ-A-O");
    const list = complementaryTypes(me, 3);
    expect(list).toHaveLength(3);
    expect(list[0].distance).toBe(1200); // 完全相反
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i].distance).toBeLessThanOrEqual(list[i - 1].distance);
    }
  });

  it("互补对象与自己的四字母全部相反或后缀相反", () => {
    const list = complementaryTypes(idealResult("ESTJ-A-O"), 3);
    expect(list[0].type.code).toBe("INFP-C-H");
  });

  it("reason 提到「镜像」或某个维度名", () => {
    const list = complementaryTypes(idealResult("ENFP-A-H"), 3);
    for (const m of list) expect(m.reason).toMatch(/镜像|维度|盲区|倾向/);
  });

  it("镜像型相似度为 0，差异展示为 100（旧实现会出现 200%）", () => {
    const list = complementaryTypes(idealResult("INFJ-A-O"), 3);
    expect(list[0].distance).toBe(1200);
    expect(list[0].similarity).toBe(0);
    expect(100 - list[0].similarity).toBe(100);
  });

  it("互补 reason 至少列出两个维度", () => {
    const list = complementaryTypes(idealResult("INFJ-A-O"), 3);
    expect(list[0].reason).toMatch(/、/);
  });
});

describe("sameGroupTypes", () => {
  it("只返回同族群型别，且不含自己", () => {
    const me = idealResult("INFJ-A-O");
    const list = sameGroupTypes(me, 3);
    expect(list).toHaveLength(3);
    expect(list.every((m) => m.type.group === me.group)).toBe(true);
    expect(list.some((m) => m.type.code === me.code)).toBe(false);
  });

  it("按距离升序", () => {
    const list = sameGroupTypes(idealResult("INFJ-A-O"), 3);
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i].distance).toBeGreaterThanOrEqual(list[i - 1].distance);
    }
  });
});

describe("loveCompatibility", () => {
  it("同型与完全相反都落在 35 分下限（太像 / 太不像都不合拍）", () => {
    expect(loveCompatibility("INFJ-A-O", "INFJ-A-O")).toBe(35);
    expect(loveCompatibility("INFJ-A-O", "ESTJ-C-H")).toBe(35);
  });

  it("距离 200 与 400 得分相同（都以 300 为理想值对称）", () => {
    // 只差 EI → 距离 200；差 EI+JP → 距离 400
    const close = loveCompatibility("INFJ-A-O", "ENFJ-A-O");
    const far = loveCompatibility("INFJ-A-O", "ENFP-A-O");
    expect(close).toBe(67);
    expect(far).toBe(close);
  });

  it("分数恒在 35–96 之间", () => {
    for (const a of TYPE_CODES.slice(0, 10)) {
      for (const b of TYPE_CODES.slice(10, 20)) {
        const s = loveCompatibility(a, b);
        expect(s).toBeGreaterThanOrEqual(35);
        expect(s).toBeLessThanOrEqual(96);
      }
    }
  });

  it("compatibilityLabel 四档覆盖", () => {
    expect(compatibilityLabel(90)).toBe("很合拍");
    expect(compatibilityLabel(75)).toBe("比较顺");
    expect(compatibilityLabel(60)).toBe("需要磨合");
    expect(compatibilityLabel(40)).toBe("差异较大");
  });
});
