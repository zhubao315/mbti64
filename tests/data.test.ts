import { describe, expect, it } from "vitest";
import {
  ALL_QUESTIONS,
  CORE_QUESTIONS,
  EASTER_EGGS,
  QUESTION_BY_ID,
  QUICK_QUESTIONS,
  SESSION_ORDER,
  TOTAL_QUESTIONS,
  getQuestions,
} from "@/data/questions";
import { DIMS, DIM_ORDER, type DimKey } from "@/data/schema";
import { ALL_TYPES, BASE_TYPES, TYPE_CODES, getType, isKnownType } from "@/data/types64";
import { isValidCode } from "@/lib/scoring";
import { SHARE_TEMPLATES, fillTemplate } from "@/lib/share";

/**
 * 题库 / 型别库的数据契约测试
 *
 * 这类测试的价值在于「改文案时不会悄悄破坏规则」：
 * 每维必须有反向题、必须有足够二选一票源、图片题必须两侧均衡。
 */

describe("题库规模与分布", () => {
  it("共 120 题，其中 60 题属于精简模式", () => {
    expect(TOTAL_QUESTIONS).toBe(120);
    expect(ALL_QUESTIONS).toHaveLength(120);
    expect(QUICK_QUESTIONS).toBe(60);
    expect(CORE_QUESTIONS).toHaveLength(60);
  });

  it("每个维度 20 题（10 core + 10 extra）", () => {
    for (const dim of DIM_ORDER) {
      const list = ALL_QUESTIONS.filter((q) => q.dim === dim);
      expect(list).toHaveLength(20);
      expect(list.filter((q) => q.set === "core")).toHaveLength(10);
      expect(list.filter((q) => q.set === "extra")).toHaveLength(10);
    }
  });

  it("题目 id 唯一，且能通过 QUESTION_BY_ID 反查", () => {
    expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(120);
    for (const q of ALL_QUESTIONS) expect(QUESTION_BY_ID[q.id]).toBe(q);
  });

  it("每个维度至少 2 道反向题（规则要求 2–3 道）", () => {
    for (const dim of DIM_ORDER) {
      const reverses = ALL_QUESTIONS.filter((q) => q.dim === dim && q.reverse);
      expect(reverses.length).toBeGreaterThanOrEqual(2);
      expect(reverses.length).toBeLessThanOrEqual(3);
    }
  });

  it("题型配比符合设计：基础维 14 Likert + 4 二选一 + 2 图片；后缀维 14 Likert + 6 二选一", () => {
    for (const dim of DIM_ORDER) {
      const list = ALL_QUESTIONS.filter((q) => q.dim === dim);
      const count = (t: string) => list.filter((q) => q.type === t).length;
      expect(count("likert")).toBe(14);
      if (dim === "AC" || dim === "OH") {
        expect(count("binary")).toBe(6);
        expect(count("image")).toBe(0);
      } else {
        expect(count("binary")).toBe(4);
        expect(count("image")).toBe(2);
      }
    }
  });

  it("二选一 / 图片题的选项极向正确且均衡", () => {
    for (const q of ALL_QUESTIONS) {
      if (q.type === "likert") {
        expect(q.choices).toBeUndefined();
        continue;
      }
      const meta = DIMS[q.dim];
      const choices = q.choices ?? [];
      const poles = new Set(choices.map((c) => c.pole));
      expect(poles).toEqual(new Set([meta.poleA, meta.poleB]));

      if (q.type === "binary") {
        expect(choices).toHaveLength(2);
        // 约定：选项 0 恒为 poleA 侧
        expect(choices[0].pole).toBe(meta.poleA);
      } else {
        expect(choices).toHaveLength(4);
        expect(choices.filter((c) => c.pole === meta.poleA)).toHaveLength(2);
        expect(choices.filter((c) => c.pole === meta.poleB)).toHaveLength(2);
        // 图片题必须有 emoji 与说明
        for (const c of choices) {
          expect(c.emoji).toBeTruthy();
          expect(c.label.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("题干与场景完整，无占位符", () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.text.length).toBeGreaterThanOrEqual(5);
      expect(q.text).not.toContain("XX");
      expect(q.text).not.toContain("TODO");
      expect(["职场", "社交", "消费", "生活方式", "数字生活"]).toContain(q.scene);
    }
  });

  it("五个场景在题库中都有出现（本土化覆盖）", () => {
    const scenes = new Set(ALL_QUESTIONS.map((q) => q.scene));
    expect(scenes.size).toBe(5);
  });
});

describe("SESSION_ORDER 交错排题", () => {
  it("两种模式的题量与题库一致", () => {
    expect(SESSION_ORDER.quick).toHaveLength(60);
    expect(SESSION_ORDER.full).toHaveLength(120);
    expect(getQuestions("quick")).toBe(CORE_QUESTIONS);
    expect(getQuestions("full")).toBe(ALL_QUESTIONS);
  });

  it("相邻两题不同维度（降低套路作答）", () => {
    for (const mode of ["quick", "full"] as const) {
      const order = SESSION_ORDER[mode];
      for (let i = 1; i < order.length; i += 1) {
        expect(order[i].dim).not.toBe(order[i - 1].dim);
      }
    }
  });

  it("精简模式是完整模式的子集", () => {
    const fullIds = new Set(SESSION_ORDER.full.map((q) => q.id));
    for (const q of SESSION_ORDER.quick) expect(fullIds.has(q.id)).toBe(true);
  });

  it("每个维度的题在序列里均匀分布", () => {
    const dims = SESSION_ORDER.full.map((q) => q.dim);
    const counts: Record<string, number> = {};
    for (const d of dims) counts[d] = (counts[d] ?? 0) + 1;
    for (const d of DIM_ORDER as DimKey[]) expect(counts[d]).toBe(20);
  });
});

describe("彩蛋文案", () => {
  it("至少 10 条，且都足够短（非阻塞提示）", () => {
    expect(EASTER_EGGS.length).toBeGreaterThanOrEqual(10);
    for (const e of EASTER_EGGS) {
      expect(e.length).toBeGreaterThan(4);
      expect(e.length).toBeLessThan(120);
    }
  });
});

describe("64 型库", () => {
  it("16 个基础型 × 4 后缀 = 64 型，编码唯一且合法", () => {
    expect(BASE_TYPES).toHaveLength(16);
    expect(ALL_TYPES).toHaveLength(64);
    expect(new Set(TYPE_CODES).size).toBe(64);
    for (const code of TYPE_CODES) expect(isValidCode(code)).toBe(true);
  });

  it("每个基础型恰好 4 种后缀组合", () => {
    for (const base of BASE_TYPES) {
      const list = TYPE_CODES.filter((c) => c.startsWith(`${base.code}-`));
      expect(list).toHaveLength(4);
      expect(list.sort()).toEqual(
        [`${base.code}-A-H`, `${base.code}-A-O`, `${base.code}-C-H`, `${base.code}-C-O`].sort(),
      );
    }
  });

  it("每个族群的型别数为 16（4 基础型 × 4 组合）", () => {
    for (const g of ["analyst", "adventurer", "diplomat", "guardian"]) {
      expect(ALL_TYPES.filter((t) => t.group === g)).toHaveLength(16);
    }
  });

  it("文案字段齐全：描述 ≥ 200 字、优势/盲区非空、关键词 ≥ 3", () => {
    for (const t of ALL_TYPES) {
      expect(t.name.length).toBeGreaterThan(2);
      expect(t.description.length).toBeGreaterThanOrEqual(200);
      expect(t.strengths.length).toBeGreaterThanOrEqual(3);
      expect(t.blindspots.length).toBeGreaterThanOrEqual(2);
      expect(t.keywords.length).toBeGreaterThanOrEqual(3);
      expect(t.sideHustles.length).toBeGreaterThanOrEqual(2);
      expect(t.loveStyle.length).toBeGreaterThan(20);
      expect(t.workStyle.length).toBeGreaterThan(20);
      expect(t.socialGuide.length).toBeGreaterThan(20);
      expect(t.growth.length).toBeGreaterThan(20);
    }
  });

  it("一句话特质总结：64 型各不相同，且长度适合海报排版", () => {
    const essences = ALL_TYPES.map((t) => t.essence);
    for (const e of essences) {
      expect(e.length).toBeGreaterThan(20);
      expect(e.length).toBeLessThanOrEqual(90);
    }
    expect(new Set(essences).size).toBe(64);
  });

  it("名人组合带「娱乐猜测」所需的说明字段", () => {
    for (const t of ALL_TYPES) {
      expect(t.celebrities.length).toBeGreaterThanOrEqual(1);
      for (const c of t.celebrities) {
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.note.length).toBeGreaterThan(0);
      }
    }
  });

  it("getType 对非法编码回落到 ENFP-A-O，isKnownType 判断准确", () => {
    expect(getType("XXXX-X-X").code).toBe("ENFP-A-O");
    expect(isKnownType("INFJ-A-O")).toBe(true);
    expect(isKnownType("INFJ-A-X")).toBe(false);
  });
});

describe("分享文案库", () => {
  it("至少 10 条，四类都有", () => {
    expect(SHARE_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    const cats = new Set(SHARE_TEMPLATES.map((t) => t.category));
    expect(cats.size).toBe(4);
  });

  it("fillTemplate 注入变量、保留未知占位符", () => {
    const out = fillTemplate("{typeName} / {code} / {unknown}", {
      typeName: "深夜点灯人",
      code: "INFJ-A-O",
      tierName: "极稀有",
      per1000: "每 1000 人约 9 人",
      rankLabel: "4–9",
      strongest: "信息方式",
      strongestPercent: "92%",
    });
    expect(out).toBe("深夜点灯人 / INFJ-A-O / {unknown}");
  });

  it("所有模板的占位符都在 ShareVars 白名单内", () => {
    const allowed = new Set([
      "typeName",
      "code",
      "tierName",
      "per1000",
      "rankLabel",
      "strongest",
      "strongestPercent",
    ]);
    for (const t of SHARE_TEMPLATES) {
      for (const m of t.text.matchAll(/\{(\w+)\}/g)) {
        expect(allowed.has(m[1]), `${t.id} 使用了未知占位符 ${m[1]}`).toBe(true);
      }
    }
  });
});
