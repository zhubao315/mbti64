import { describe, expect, it } from "vitest";
import bookEnriched from "@/data/bookEnriched";
import { findAnchored, stripAnchors, wrapAnchor } from "@/scripts/lib/book-anchor.mjs";

/**
 * 书稿提取锚点单测
 *
 * 守住两件事：
 * 1. 锚点优先于正则：作者润色文笔也不会让数据管道退化；
 * 2. 数据 100% 来自原稿 —— 不再有「书里没有、网站有」的编辑补写。
 */

describe("书稿锚点", () => {
  it("findAnchored 精确命中带后缀的锚点", () => {
    const body = `前面\n<!-- @stuck:C-O -->\n卡点正文。\n<!-- /@stuck:C-O -->\n后面`;
    expect(findAnchored(body, "stuck", "C-O")).toBe("卡点正文。");
  });

  it("同名锚点按后缀区分，不会串台", () => {
    const body = `<!-- @stuck:C-O -->\nC-O 卡点。\n<!-- /@stuck:C-O -->\n<!-- @stuck:A-H -->\nA-H 卡点。\n<!-- /@stuck:A-H -->`;
    expect(findAnchored(body, "stuck", "C-O")).toBe("C-O 卡点。");
    expect(findAnchored(body, "stuck", "A-H")).toBe("A-H 卡点。");
  });

  it("嵌套锚点（卡点与信号同段）各自取出正文，且不互相吞掉", () => {
    const body = `<!-- @stuck:C-O -->\n<!-- @signal:C-O -->\n同一段正文。\n<!-- /@signal:C-O -->\n<!-- /@stuck:C-O -->`;
    expect(findAnchored(body, "stuck", "C-O")).toBe("同一段正文。");
    expect(findAnchored(body, "signal", "C-O")).toBe("同一段正文。");
  });

  it("没有锚点时返回空串，交给正则兜底", () => {
    expect(findAnchored("普通正文，没有任何锚点。", "stuck", "C-O")).toBe("");
  });

  it("stripAnchors 只删标记，不删包裹的正文", () => {
    const body = `<!-- @stuck:C-O -->\n正文不能丢。\n<!-- /@stuck:C-O -->`;
    expect(stripAnchors(body)).toContain("正文不能丢。");
    expect(stripAnchors(body)).not.toContain("@stuck");
  });

  it("wrapAnchor 生成对称的锚点对", () => {
    const out = wrapAnchor("signal", "A-H", "信号正文。");
    expect(out).toContain("<!-- @signal:A-H -->");
    expect(out).toContain("<!-- /@signal:A-H -->");
    expect(findAnchored(out, "signal", "A-H")).toBe("信号正文。");
  });
});

describe("书稿数据 100% 来自原稿", () => {
  const types = bookEnriched.types as Record<string, { spiralStage: Record<string, { hiddenStuck: string; hiddenStuckSource: string; leapSignal: string; leapSignalSource: string }> }>;

  it("64 个状态的卡点与跃迁信号全部来自原稿（EDITORIAL 补写表已清零）", () => {
    const editorial: string[] = [];
    for (const [base, t] of Object.entries(types)) {
      for (const [suffix, v] of Object.entries(t.spiralStage)) {
        if (v.hiddenStuckSource !== "manuscript") editorial.push(`${base}-${suffix} stuck`);
        if (v.leapSignalSource !== "manuscript") editorial.push(`${base}-${suffix} signal`);
      }
    }
    expect(editorial).toEqual([]);
  });

  it("没有任何一条卡点 / 信号是通用兜底文案", () => {
    for (const [base, t] of Object.entries(types)) {
      for (const [suffix, v] of Object.entries(t.spiralStage)) {
        expect(v.hiddenStuck, `${base}-${suffix}`).not.toMatch(/优势用过了头/);
        expect(v.leapSignal, `${base}-${suffix}`).not.toMatch(/旧模式开始不够用|不再让你费力/);
      }
    }
  });

  it("提取出来的正文里不含锚点标记", () => {
    for (const [base, t] of Object.entries(types)) {
      for (const [suffix, v] of Object.entries(t.spiralStage)) {
        expect(v.hiddenStuck, `${base}-${suffix}`).not.toContain("@stuck");
        expect(v.leapSignal, `${base}-${suffix}`).not.toContain("@signal");
      }
    }
  });
});
