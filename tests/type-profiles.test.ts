import { describe, expect, it } from "vitest";
import { BASE_PROFILES, getBaseProfile } from "@/data/typeProfiles";
import { BASE_TYPES } from "@/data/types64";

const REQUIRED = ["advantages", "limitations", "behavior", "growthSpace"] as const;

describe("64 型档案内容模块", () => {
  it("16 个基础型全部有档案", () => {
    expect(Object.keys(BASE_PROFILES)).toHaveLength(16);
    for (const base of BASE_TYPES) {
      expect(BASE_PROFILES[base.code]).toBeTruthy();
    }
  });

  it("每个档案字段齐全且非空", () => {
    for (const [code, p] of Object.entries(BASE_PROFILES)) {
      expect(p.englishName.trim(), `${code} englishName`).not.toBe("");
      expect(p.traits.length, `${code} traits`).toBe(3);
      expect(p.growthAdvice.length, `${code} growthAdvice`).toBe(3);
      expect(p.reflectionQuestions.length, `${code} reflectionQuestions`).toBe(3);
      for (const key of REQUIRED) {
        expect(p.analysis[key].trim(), `${code} analysis.${key}`).not.toBe("");
      }
      expect(p.communication.trim(), `${code} communication`).not.toBe("");
      expect(p.relationship.trim(), `${code} relationship`).not.toBe("");
      expect(p.stressResponse.trim(), `${code} stressResponse`).not.toBe("");
    }
  });

  it("接受带后缀的完整编码，并对未知编码给出兜底", () => {
    expect(getBaseProfile("INTJ-A-O").englishName).toBe(BASE_PROFILES.INTJ.englishName);
    expect(getBaseProfile("XXXX").englishName).not.toBe("");
  });

  it("文案不含宿命论或绝对化措辞", () => {
    const forbidden = ["注定", "永远都是", "一定就是", "无可救药", "诊断你是"];
    for (const [code, p] of Object.entries(BASE_PROFILES)) {
      const text = [
        p.englishName,
        ...p.traits,
        p.communication,
        p.relationship,
        p.stressResponse,
        ...p.growthAdvice,
        ...p.reflectionQuestions,
        ...REQUIRED.map((k) => p.analysis[k]),
      ].join(" ");
      for (const word of forbidden) {
        expect(text.includes(word), `${code} 含禁用词「${word}」`).toBe(false);
      }
    }
  });
});
