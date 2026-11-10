import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke E2E：首页 → 精简版答题 → 结果页 → 相似型别 → 型别详情页
 *
 * 只保留一条高价值路径，失败时会上传 trace 与截图（见 playwright.config.ts）。
 */

/** 当前题卡的题目 id（题卡切换即状态机前进） */
async function currentQid(page: Page): Promise<string> {
  return (await page.getByTestId("question-card").getAttribute("data-qid")) ?? "";
}

/** 在当前题卡里点一个可选项（Likert / 二选一 / 图片题通用） */
async function pickFirstOption(page: Page): Promise<void> {
  const card = page.getByTestId("question-card");
  const likert = card.locator("button[data-choice]").first();
  if (await likert.count()) {
    await likert.click({ force: true });
    return;
  }
  await card.locator("button[aria-pressed]").first().click({ force: true });
}

test("smoke: 首页 → 精简测评 → 结果页 → 相似型别 → 型别页", async ({ page }) => {
  // 1. 首页
  await page.goto("/index.html");
  await expect(page).toHaveTitle(/MBTI64/);

  // 2. 点「精简版」入口
  await page.getByRole("link", { name: /开始快速测评/ }).first().click();
  await page.waitForURL(/\/test/);
  await page.waitForSelector('[data-testid="question-card"]');

  // 3. 连续选择第一项直到完成（题卡切换即状态机在走）
  const TOTAL = 60;
  for (let i = 0; i < TOTAL + 10; i++) {
    // 已答完时会出现提交前确认对话框
    const confirm = page.getByRole("button", { name: /确认生成/ });
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      break;
    }

    // 全部答完后出现「生成我的 64 型结果」按钮
    const finish = page.getByRole("button", { name: /生成我的 64 型结果/ });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      await page.getByRole("button", { name: /确认生成/ }).click();
      break;
    }

    const before = await currentQid(page);
    await pickFirstOption(page);

    // 等题卡切换（自动跳题 260ms + 动画）
    await page
      .waitForFunction(
        (prev) => {
          const el = document.querySelector('[data-testid="question-card"]');
          return el ? el.getAttribute("data-qid") !== prev : false;
        },
        before,
        { timeout: 8000 },
      )
      .catch(() => {
        /* 最后一题不会切题（停在原地等提交），交给下一轮处理 */
      });
  }

  // 4. 结果页：六维雷达 + 型别编码
  await page.waitForURL(/\/result/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /六维倾向/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /六维倾向雷达图/ })).toBeVisible();

  const codeText = await page.locator("body").innerText();
  expect(codeText).toMatch(/[A-Z]{4}-[AC]-[OH]/);

  // 5. 点一个「相似型别」链接 → 型别详情页
  const similarLink = page.locator('a[href*="/type/"]').first();
  await similarLink.click();
  await page.waitForURL(/\/type\/[A-Z]{4}-[AC]-[OH]/);

  // 6. 型别页标题与 OG meta
  await expect(page).toHaveTitle(/·/);
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toBeTruthy();
  expect(ogImage).toMatch(/og\//);
});
