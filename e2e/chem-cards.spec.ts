import { expect, test, type Page } from "@playwright/test";

/**
 * 合盘分享卡 E2E
 *
 * 覆盖三件事：
 * 1. 「生成双人合盘卡」点开后真的出图
 *    （之前把离屏 canvas 塞进 state，React 会新建一张空白 canvas 顶掉它 → 用户只看到白板）
 * 2. 四个关系象限都能正常出图（象限徽记 / 肖像 / 对撞图都不空）
 * 3. 批量出图：一次给多个对方型号各生成一张
 */

/** 画布是否真的画了东西：既不是全透明，也不是全白 */
async function canvasHasContent(page: Page): Promise<boolean> {
  return page
    .locator('[data-testid="chem-card-canvas"]')
    .first()
    .evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext("2d");
      if (!ctx || c.width === 0) return false;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let ink = 0;
      let sampled = 0;
      for (let i = 0; i < d.length; i += 4 * 53) {
        sampled += 1;
        const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
        if (a > 8 && (r < 240 || g < 240 || b < 240)) ink += 1;
      }
      return sampled > 0 && ink / sampled > 0.01;
    });
}

const QUADRANT_PAIRS: Array<{ a: string; b: string; label: string }> = [
  { a: "INFJ-A-O", b: "INFJ-A-O", label: "同频镜像" },
  { a: "INFJ-A-O", b: "INFJ-C-H", label: "底色相通" },
  { a: "INFJ-A-O", b: "ENTJ-A-O", label: "思维碰撞" },
  { a: "INFJ-A-O", b: "ESTP-C-H", label: "全维镜像" },
];

test("合盘卡：四个关系象限都能出图", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  for (const pair of QUADRANT_PAIRS) {
    await page.goto(`compare/?a=${pair.a}&b=${pair.b}`);
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: /生成双人合盘卡/ }).click();
    await expect(page.locator('[data-testid="chem-card-canvas"]')).toHaveCount(1, {
      timeout: 30_000,
    });
    await page.waitForTimeout(900);
    expect(await canvasHasContent(page), `${pair.label} 出图`).toBe(true);
    // 注意：不能点遮罩上的「关闭」（它被弹层内容盖住，点不到），要点右上角的 X
    await page.getByTestId("chem-card-close").click();
    await expect(page.locator('[data-testid="chem-card-canvas"]')).toHaveCount(0);
  }

  expect(errors).toEqual([]);
});

test("合盘卡：批量出图（一次给多个朋友各配一张）", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("compare/?a=INFJ-A-O&b=ESTP-C-H");
  await page.waitForTimeout(900);

  for (const label of ["冷焰策士·A-O", "拆解者·C-H", "推土机型统帅·A-H"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  await page.getByRole("button", { name: /生成 3 张合盘卡/ }).click();
  await expect(page.locator("figure img")).toHaveCount(3, { timeout: 90_000 });

  // 每张都能单独下载
  const links = page.locator('figure a[download]');
  await expect(links).toHaveCount(3);
  await expect(links.first()).toHaveAttribute("download", /MBTI64-合盘-.*\.png/);

  expect(errors).toEqual([]);
});
