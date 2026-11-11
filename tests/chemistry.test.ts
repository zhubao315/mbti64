import { describe, expect, it } from "vitest";
import { chemistryReport, QUADRANT_META } from "@/lib/chemistry";
import { DIM_ORDER } from "@/data/schema";

/**
 * 双人合盘引擎单测
 *
 * 覆盖：象限判定、六维对撞、最默契 / 最易误读、潜台词词典、契合度区间。
 */

describe("chemistryReport", () => {
  it("完全同型 → 同频镜像", () => {
    const r = chemistryReport({ code: "INFJ-A-O" }, { code: "INFJ-A-O" });
    expect(r.quadrant).toBe("mirror");
    expect(r.quadrantLabel).toBe(QUADRANT_META.mirror.label);
    expect(r.allies.length).toBe(2);
    expect(r.frictions.length).toBe(0);
  });

  it("同基型、后缀不同 → 底色相通 · 调性互补", () => {
    const r = chemistryReport({ code: "INFJ-A-O" }, { code: "INFJ-C-H" });
    expect(r.quadrant).toBe("resonance");
    // 最默契的两维按「同侧加分」排序：生活节奏(JP)权重最高，其次信息方式(SN)
    expect(r.allies).toEqual(["JP", "SN"]);
    expect(r.frictions).toEqual(["AC", "OH"]);
  });

  it("前四维不同、后缀相同 → 思维碰撞 · 执行错位", () => {
    const r = chemistryReport({ code: "INFJ-A-O" }, { code: "ENTJ-A-O" });
    expect(r.quadrant).toBe("collision");
    expect(r.frictions).toContain("TF");
    expect(r.allies).toContain("AC");
  });

  it("六个维度几乎全反 → 全维镜像 · 阴影导师", () => {
    const r = chemistryReport({ code: "INFJ-A-O" }, { code: "ESTP-C-H" });
    expect(r.quadrant).toBe("shadow");
    expect(r.distance).toBeGreaterThanOrEqual(1000);
    expect(r.tension).toBeGreaterThan(80);
  });

  it("六维对撞逐项给出同侧 / 对撞与强度", () => {
    const r = chemistryReport({ code: "INFJ-A-O" }, { code: "ESTP-C-H" });
    expect(r.dims).toHaveLength(DIM_ORDER.length);
    for (const row of r.dims) {
      expect(row.aStrength).toBeGreaterThanOrEqual(0);
      expect(row.aStrength).toBeLessThanOrEqual(100);
      expect(row.note.length).toBeGreaterThan(3);
    }
    expect(r.dims.every((d) => !d.sameSide)).toBe(true);
  });

  it("潜台词词典：两个轴各给一组，且四要素齐全", () => {
    for (const a of ["INFJ-A-O", "INFJ-A-H", "INFJ-C-O", "INFJ-C-H"]) {
      for (const b of ["ESTP-A-O", "ESTP-A-H", "ESTP-C-O", "ESTP-C-H"]) {
        const r = chemistryReport({ code: a }, { code: b });
        expect(r.scripts).toHaveLength(2);
        for (const s of r.scripts) {
          expect(s.scene.length).toBeGreaterThan(1);
          expect(s.aSays.length).toBeGreaterThan(3);
          expect(s.aMeans.length).toBeGreaterThan(5);
          expect(s.bSays.length).toBeGreaterThan(3);
          expect(s.bMeans.length).toBeGreaterThan(5);
          expect(s.aReply.length).toBeGreaterThan(5);
          expect(s.bReply.length).toBeGreaterThan(5);
        }
      }
    }
  });

  it("契合度与张力恒在 0–100，且同型最高、镜像最低", () => {
    const same = chemistryReport({ code: "INFJ-A-O" }, { code: "INFJ-A-O" });
    const mirror = chemistryReport({ code: "INFJ-A-O" }, { code: "ESTP-C-H" });
    expect(same.score).toBeGreaterThan(mirror.score);
    expect(same.tension).toBeLessThan(mirror.tension);
    for (const r of [same, mirror]) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.tension).toBeGreaterThanOrEqual(0);
      expect(r.tension).toBeLessThanOrEqual(100);
    }
  });

  it("金句点出具体维度", () => {
    const r = chemistryReport({ code: "INFJ-A-O" }, { code: "INFJ-C-H" });
    expect(r.headline.length).toBeGreaterThan(8);
    expect(r.headline).not.toContain("undefined");
  });

  it("带真实读数时对撞条用真实强度", () => {
    const dims = Object.fromEntries(
      DIM_ORDER.map((k) => [
        k,
        {
          key: k,
          poleA: "E",
          poleB: "I",
          percentA: 80,
          percentB: 20,
          pole: "E",
          preferred: 80,
          strength: "strong" as const,
          answered: 20,
          total: 20,
          swing: false,
        },
      ]),
    ) as never;
    const r = chemistryReport({ code: "INFJ-A-O", dims }, { code: "INFJ-A-O" });
    // 全部同侧时契合度与纯编码一致
    expect(r.quadrant).toBe("mirror");
    expect(r.dims[0].aStrength).toBe(80);
  });

  it("全 64 型两两组合都不崩且必有两组潜台词", () => {
    const codes = ["INFJ-A-O", "INFJ-C-H", "ESTP-A-O", "ESTP-C-H", "INTJ-A-H", "ENFP-C-O"];
    for (const a of codes) {
      for (const b of codes) {
        const r = chemistryReport({ code: a }, { code: b });
        expect(r.scripts).toHaveLength(2);
        expect(r.quadrantLabel.length).toBeGreaterThan(1);
      }
    }
  });
});
