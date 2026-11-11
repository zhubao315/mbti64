import { expect, test } from "@playwright/test";

/**
 * 双人合盘 E2E：深链 → 报告渲染 → 换一方 → 生成分享卡
 *
 * 用相对路径导航，baseURL 已含部署子路径前缀（本地跑 out-local 时为空）。
 */
test("compare: 深链参数 → 合盘报告 → 分享卡", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("compare/?a=INFJ-A-O&b=ESTP-C-H");
  await expect(page.getByRole("heading", { name: /双人合盘实验室/ })).toBeVisible();

  // 报告主体
  await expect(page.getByText("六维逐项对撞")).toBeVisible();
  await expect(page.getByText("吵架潜台词翻译器")).toBeVisible();
  await expect(page.getByText(/契合度/)).toBeVisible();
  // 两组场景 × A/B 两侧 = 4 条接话建议
  await expect(page.getByText(/可以这样接/)).toHaveCount(4);

  // 深链里的两个编码都要出现
  const body = await page.locator("body").innerText();
  expect(body).toContain("INFJ");
  expect(body).toContain("ESTP");

  // 换一方
  await page.selectOption('select[aria-label="参与者 B基础型"]', "INTJ");
  await expect(page.locator("body")).toContainText("INTJ");

  // 分享卡（Canvas 1080×1440）
  await page.getByRole("button", { name: /生成双人合盘卡/ }).click();
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 20_000 });

  expect(errors).toEqual([]);
});
