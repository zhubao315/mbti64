import { describe, expect, it } from "vitest";
import {
  DIM_PRIOR,
  PRIOR_TABLE,
  RARITY_TIERS,
  TIER_BY_KEY,
  blendStats,
  formatPercent,
  getRanked,
  leaderboard,
  per1000Text,
  priorProbability,
  beatText,
  rankText,
  rarityPyramid,
} from "@/lib/rarity";
import { TYPE_CODES } from "@/data/types64";

/**
 * 稀有度层单测
 *
 * 这层最容易出现「看起来对、其实穿帮」的问题：
 *  - 概率之和不等于 1
 *  - 并列名次被算成连续名次
 *  - 档位分桶总数不是 64
 *  - 融合后排序反了（把最常见算成最稀有）
 */

describe("先验概率", () => {
  it("64 型先验之和为 1", () => {
    const sum = TYPE_CODES.reduce((s, c) => s + priorProbability(c), 0);
    expect(sum).toBeCloseTo(1, 9);
  });

  it("六维先验与声明一致（E55 S65 T50 J55 A60 O45）", () => {
    expect(DIM_PRIOR).toMatchObject({ EI: 0.55, SN: 0.65, TF: 0.5, JP: 0.55, AC: 0.6, OH: 0.45 });
  });

  it("单一维度的两个极向概率互补", () => {
    const a = priorProbability("ESTJ-A-O");
    const acSwap = priorProbability("ESTJ-C-O");
    expect(a / acSwap).toBeCloseTo(0.6 / 0.4, 10);
  });

  it("先验落在 0.6%–3.2% 的现实区间内", () => {
    const values = TYPE_CODES.map(priorProbability);
    expect(Math.min(...values)).toBeGreaterThan(0.004);
    expect(Math.min(...values)).toBeLessThan(0.01);
    expect(Math.max(...values)).toBeLessThan(0.033);
  });
});

describe("PRIOR_TABLE 排名", () => {
  it("64 条，byCode 完整", () => {
    expect(PRIOR_TABLE.ranked).toHaveLength(64);
    expect(Object.keys(PRIOR_TABLE.byCode)).toHaveLength(64);
    expect(PRIOR_TABLE.source).toBe("prior");
    expect(PRIOR_TABLE.total).toBe(64);
  });

  it("按概率升序排列（rank 1 = 最低概率 = 最稀有）", () => {
    for (let i = 1; i < PRIOR_TABLE.ranked.length; i += 1) {
      expect(PRIOR_TABLE.ranked[i].probability).toBeGreaterThanOrEqual(PRIOR_TABLE.ranked[i - 1].probability);
    }
    expect(PRIOR_TABLE.ranked[0].rank).toBe(1);
    expect(PRIOR_TABLE.ranked[0].probability).toBe(Math.min(...TYPE_CODES.map(priorProbability)));
    // 最后一名是最常见
    expect(PRIOR_TABLE.ranked[63].probability).toBe(Math.max(...TYPE_CODES.map(priorProbability)));
    // 最常见的一档因并列，名次是 63–64
    expect(PRIOR_TABLE.ranked[63].rankLabel).toBe("63–64");
  });

  it("同概率并列同一名次（T/F 50:50 会产生大量并列）", () => {
    const groups = new Map<number, string[]>();
    for (const r of PRIOR_TABLE.ranked) {
      const arr = groups.get(r.rank) ?? [];
      arr.push(r.code);
      groups.set(r.rank, arr);
    }
    const tied = [...groups.values()].filter((g) => g.length > 1);
    expect(tied.length).toBeGreaterThan(0);
    // 并列组内的概率必须完全一致
    for (const codes of tied) {
      const p = PRIOR_TABLE.byCode[codes[0]].probability;
      for (const c of codes) expect(PRIOR_TABLE.byCode[c].probability).toBe(p);
    }
    // rankSize 与并列组大小一致
    for (const r of PRIOR_TABLE.ranked) {
      expect(r.rankSize).toBe((groups.get(r.rank) ?? []).length);
    }
  });

  it("名次覆盖 1–64 且不重复计数", () => {
    const sizes = new Map<number, number>();
    for (const r of PRIOR_TABLE.ranked) sizes.set(r.rank, r.rankSize);
    let cursor = 1;
    for (const rank of [...sizes.keys()].sort((a, b) => a - b)) {
      expect(rank).toBe(cursor);
      cursor += sizes.get(rank)!;
    }
    expect(cursor - 1).toBe(64);
  });

  it("档位合计 64，且「同概率必同档」（并列不会被拆到两档）", () => {
    const layers = rarityPyramid(PRIOR_TABLE);
    expect(layers).toHaveLength(7);
    expect(layers.reduce((s, l) => s + l.count, 0)).toBe(64);
    for (const r of PRIOR_TABLE.ranked) {
      const peers = PRIOR_TABLE.ranked.filter((x) => x.probability === r.probability);
      for (const peer of peers) expect(peer.tier.key).toBe(r.tier.key);
    }
  });

  it("档位按概率单调排列：越靠下的档位越常见", () => {
    const layers = rarityPyramid(PRIOR_TABLE);
    const rangeOf = (key: string) => {
      const items = PRIOR_TABLE.ranked.filter((r) => r.tier.key === key);
      return { min: Math.min(...items.map((r) => r.probability)), max: Math.max(...items.map((r) => r.probability)) };
    };
    for (let i = 1; i < layers.length; i += 1) {
      const prev = rangeOf(layers[i - 1].tier.key);
      const cur = rangeOf(layers[i].tier.key);
      expect(cur.min).toBeGreaterThanOrEqual(prev.max);
    }
  });

  it("金字塔人口占比自上而下递增（顶部最窄）", () => {
    const layers = rarityPyramid(PRIOR_TABLE);
    expect(layers[0].share).toBeLessThan(layers[layers.length - 1].share);
    // 每一档都至少有 1 型，且都有非零占比
    for (const l of layers) {
      expect(l.count).toBeGreaterThan(0);
      expect(l.share).toBeGreaterThan(0);
    }
  });

  it("层内占比之和约等于 1", () => {
    const layers = rarityPyramid(PRIOR_TABLE);
    const share = layers.reduce((s, l) => s + l.share, 0);
    expect(share).toBeGreaterThan(99);
    expect(share).toBeLessThan(101);
  });

  it("每 1000 人数字有下限 0.1，不会出现 0 人", () => {
    for (const r of PRIOR_TABLE.ranked) expect(r.per1000).toBeGreaterThanOrEqual(0.1);
  });

  it("beatPercent 随稀有度下降而下降，且最稀有的接近满值", () => {
    const rarest = PRIOR_TABLE.ranked[0];
    const commonest = PRIOR_TABLE.ranked[PRIOR_TABLE.ranked.length - 1];
    expect(rarest.beatPercent).toBeGreaterThan(90);
    expect(rarest.beatPercent).toBeLessThanOrEqual(100);
    expect(commonest.beatPercent).toBeGreaterThanOrEqual(0);
    expect(rarest.beatPercent).toBeGreaterThan(commonest.beatPercent);
  });

  it("beatText 对最常见的档位改用中性文案", () => {
    const commonest = PRIOR_TABLE.ranked[PRIOR_TABLE.ranked.length - 1];
    if (commonest.beatPercent <= 0.05) expect(beatText(commonest)).toBe("属于最常见的一档");
    expect(beatText(PRIOR_TABLE.ranked[0])).toContain("更稀有");
  });
});

describe("getRanked / leaderboard / 文案", () => {
  it("getRanked 按 code 取到对应条目", () => {
    for (const code of TYPE_CODES) {
      expect(getRanked(code)?.code).toBe(code);
    }
    expect(getRanked("NOPE-A-O")).toBeUndefined();
  });

  it("leaderboard 默认返回先验榜", () => {
    expect(leaderboard()).toHaveLength(64);
    expect(leaderboard()[0].code).toBe(PRIOR_TABLE.ranked[0].code);
  });

  it("rankText / per1000Text / formatPercent 输出稳定", () => {
    const r = PRIOR_TABLE.ranked[0];
    expect(r.total).toBe(64);
    expect(rankText(r)).toContain("共 64 型");
    expect(per1000Text(r)).toContain("每 1000 人约");
    expect(per1000Text(r).endsWith("人")).toBe(true);
    expect(formatPercent(0.0234)).toBe("2.3%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });

  it("rankLabel 在并列时是区间", () => {
    const tied = PRIOR_TABLE.ranked.find((r) => r.rankSize > 1);
    expect(tied).toBeDefined();
    expect(tied!.rankLabel).toContain("–");
  });
});

describe("blendStats 统计融合", () => {
  it("无数据时回落到先验表", () => {
    expect(blendStats(null)).toBe(PRIOR_TABLE);
    expect(blendStats({ counts: {}, total: 0 })).toBe(PRIOR_TABLE);
  });

  it("观测到大量样本的型别会被排到最常见（rank 64）", () => {
    const target = "INFJ-A-O";
    const table = blendStats({ counts: { [target]: 5000 }, total: 5000 });
    expect(table.source).toBe("blended");
    expect(table.sampleSize).toBe(5000);
    expect(table.byCode[target].rank).toBe(64);
    expect(table.byCode[target].probability).toBeGreaterThan(0.9);
  });

  it("融合后概率仍归一，且排名结构完整", () => {
    const table = blendStats({ counts: { "INFJ-A-O": 10, "ENFP-C-H": 30 }, total: 40 }, 50);
    const sum = table.ranked.reduce((s, r) => s + r.probability, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(table.ranked).toHaveLength(64);
    expect(table.ranked[0].rank).toBe(1);
  });

  it("priorWeight 越大越保守（越接近先验）", () => {
    const stats = { counts: { "INFJ-A-O": 100 }, total: 100 };
    const conservative = blendStats(stats, 1_000_000);
    const aggressive = blendStats(stats, 1);
    expect(conservative.byCode["INFJ-A-O"].probability).toBeLessThan(
      aggressive.byCode["INFJ-A-O"].probability,
    );
  });
});

describe("档位元数据", () => {
  it("7 档齐全且 rank 递增", () => {
    expect(RARITY_TIERS).toHaveLength(7);
    RARITY_TIERS.forEach((t, i) => {
      expect(t.rank).toBe(i);
      expect(TIER_BY_KEY[t.key]).toBe(t);
      expect(t.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("档位名称覆盖需求里的 7 个中文名", () => {
    expect(RARITY_TIERS.map((t) => t.name)).toEqual([
      "万里挑一",
      "极稀有",
      "稀有",
      "千分之一",
      "百分之一",
      "常见型",
      "无处不在",
    ]);
  });
});
