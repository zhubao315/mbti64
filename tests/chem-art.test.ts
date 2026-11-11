import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import chemArt from "@/data/chem-art.json";

/**
 * 双人合盘 AI 主视觉单测
 *
 * 守住三件事：
 * 1. 清单里每个象限都有图（漏一张，页面就会出现空洞）
 * 2. 清单指向的文件真实存在（改名 / 漏提交会在 CI 暴露，而不是线上 404）
 * 3. 体积受控 —— 这五张图是全站唯一的新增资源，不能悄悄变成几 MB
 */
const ROOT = process.cwd();

const KEYS = ["hero", "mirror", "resonance", "collision", "shadow"] as const;

describe("双人合盘 AI 主视觉", () => {
  it("清单包含页头主视觉与四个关系象限", () => {
    for (const key of KEYS) {
      expect(chemArt.art[key], key).toBeTruthy();
      expect(chemArt.art[key].file).toMatch(/^\/assets\/chem\/chem-.*\.webp$/);
      expect(chemArt.art[key].width).toBeGreaterThan(200);
      expect(chemArt.art[key].height).toBeGreaterThan(200);
      expect(chemArt.art[key].label.length).toBeGreaterThan(1);
    }
  });

  it("每个象限的视觉文件真实存在", () => {
    for (const key of KEYS) {
      const file = path.join(ROOT, "public", chemArt.art[key].file);
      expect(fs.existsSync(file), chemArt.art[key].file).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(1024);
    }
  });

  it("五张图加起来不超过 400KB（webp）", () => {
    let total = 0;
    for (const key of KEYS) {
      total += fs.statSync(path.join(ROOT, "public", chemArt.art[key].file)).size;
    }
    expect(total).toBeLessThan(400 * 1024);
  });

  it("运行时只引用 webp，不带 PNG 原图", () => {
    for (const key of KEYS) {
      expect(chemArt.art[key].file.endsWith(".webp")).toBe(true);
    }
  });
});
