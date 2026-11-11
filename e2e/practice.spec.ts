import { expect, test } from "@playwright/test";

/**
 * 30 天行为实验实验室
 *
 * 结果页需要本机有结果快照才会渲染，因此先种一份再进页面。
 */
const RESULT_SEED = {
  base: "INFJ",
  code: "INFJ-A-O",
  displayCode: "INFJ-A-O",
  group: "diplomat",
  dims: {
    EI: { key: "EI", poleA: "E", poleB: "I", percentA: 62, percentB: 38, pole: "I", preferred: 62, strength: "moderate", answered: 20, total: 20, swing: false },
    SN: { key: "SN", poleA: "S", poleB: "N", percentA: 35, percentB: 65, pole: "N", preferred: 65, strength: "moderate", answered: 20, total: 20, swing: false },
    TF: { key: "TF", poleA: "T", poleB: "F", percentA: 55, percentB: 45, pole: "T", preferred: 55, strength: "moderate", answered: 20, total: 20, swing: false },
    JP: { key: "JP", poleA: "J", poleB: "P", percentA: 58, percentB: 42, pole: "J", preferred: 58, strength: "moderate", answered: 20, total: 20, swing: false },
    AC: { key: "AC", poleA: "A", poleB: "C", percentA: 60, percentB: 40, pole: "A", preferred: 60, strength: "moderate", answered: 20, total: 20, swing: false, binary: { a: 4, b: 2, total: 6, need: 4 } },
    OH: { key: "OH", poleA: "O", poleB: "H", percentA: 55, percentB: 45, pole: "O", preferred: 55, strength: "moderate", answered: 20, total: 20, swing: false, binary: { a: 4, b: 2, total: 6, need: 4 } },
  },
  swing: { AC: false, OH: false },
  mode: "full",
  answeredCount: 120,
  totalCount: 120,
  complete: true,
  scoredAt: 0,
};

test("30 天行为实验实验室：清单 / 词典 / 四象限", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript((seed) => {
    localStorage.setItem("p64:result:v1", JSON.stringify(seed));
  }, RESULT_SEED);

  await page.goto("result/index.html");
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);

  const txt = await page.evaluate(() => document.body.textContent ?? "");
  expect(txt).toContain("30 天行为实验");
  expect(txt).toContain("导出复盘手记");

  // 三个工具页
  await page.getByRole("button", { name: "吵架潜台词词典" }).click();
  await expect(page.locator("body")).toContainText("对方听成");

  await page.getByRole("button", { name: "职场四象限" }).click();
  const t2 = await page.evaluate(() => document.body.textContent ?? "");
  expect(t2).toContain("开荒");
  expect(t2).toContain("把关");

  expect(errors).toEqual([]);
});
