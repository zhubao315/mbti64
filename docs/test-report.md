# MBTI64 v2.0 · 测试报告

**被测版本**：`a76640d`（部署 `e6d7e62`）  
**测试时间**：2026-11-07  
**环境**：Windows / Node 25 / Chromium（本机 Edge，`playwright-core`）；本地静态服务 `http://127.0.0.1:4181/mbti64/`；线上 `https://zhubao315.github.io/mbti64/`

---

## 1. 结论

| 层 | 结果 |
| --- | --- |
| 单元测试 | 8 文件 / **156 条通过** |
| TypeScript | `tsc --noEmit` 通过 |
| 静态构建 | 72 个 `index.html`、66 张 OG、sitemap 70 条 |
| 本地子路径验收 | 58 项通过，HTTP 4xx/5xx = 0 |
| 线上主流程验收 | 58 项通过，HTTP 4xx/5xx = 0，console.error = 0 |
| 线上补充验收 | 71 项通过，console.error = 0 |
| 部署 | `gh-pages` 快进推送，线上已生效 |

---

## 2. 单元测试（156 条）

命令：`npm run test`

| 文件 | 覆盖 |
| --- | --- |
| `tests/algorithm-regression.test.ts` | 16/4/64 组合、固定样本输出、边界与缺答、摇摆 `?` |
| `tests/scoring.test.ts` | 正/反向计分、六维、后缀投票 `ceil(2/3)`、A/C、O/H |
| `tests/data.test.ts` | 64 编码唯一、名称、题库规模（120/60、每维 20）、引用有效、概率合计 |
| `tests/rarity.test.ts` | 七档分组、per1000、rank/rankLabel、先验与展示一致性 |
| `tests/match.test.ts` | 相似 3 / 互补 3、L1 距离、无自引用 |
| `tests/progress.test.ts` | `p64:v1` 结构、v1→v2 迁移、normalize、双模式独立、中断恢复 |
| `tests/answer-checks.test.ts`（新增） | 一致性中间值不误报、全选同向识别冲突、空答案、剩余时间估算 |
| `tests/type-profiles.test.ts`（新增） | 16 基础型齐全、字段完整、后缀继承与兜底、禁用词扫描 |

结果：`Test Files 8 passed (8)`，`Tests 156 passed (156)`，耗时约 4.5 s。

**算法文件零改动**：`lib/scoring.js`、`lib/rarity-core.js`、`data/questions*.ts`、`data/types64.ts`、`data/schema.ts` 与 `docs/functional-baseline.md` 记录的 blob 哈希一致；固定样本升级前后输出一致。

---

## 3. 构建验证

命令：

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/mbti64"
$env:NEXT_PUBLIC_SITE_URL="https://zhubao315.github.io"
npm run build
```

- `out/index.html` 资源前缀均为 `/mbti64/_next/...`。
- `out/disclaimer/index.html` 存在；`out/type/INFJ-A-O/index.html` 存在。
- `out/og/*.png` 66 张；`out/sitemap.xml` 70 条 `<loc>`；`out/.nojekyll` 存在。
- 部署前移除 `out/poster-preview/`（工作区他人未提交产物）。

---

## 4. 本地子路径验收（58 项）

脚本：`tools/_tmp/verify-preview.mjs`（临时工具，未提交），基址 `http://127.0.0.1:4181/mbti64`。

覆盖与结果（全部 PASS）：

1. **页面可访问**：`/`、`/test/`、`/result/`、`/rank/`、`/type/INFJ-A-O/`、`/about/`、`/privacy/`、`/disclaimer/` 均返回 200，有 title 与 `h1`。
2. **资源前缀**：首页 `<link>/<script>` 全部以 `/mbti64/` 开头。
3. **CSS 200**：`/_next/static/css/*.css` 实际可下载。
4. **答题流**：60 题逐题作答；答 10 题后刷新，进度从「还剩 50 题」恢复；`p64:v1` 中 `answers.quick` 计数正确。
5. **提交确认**：答完出现确认弹层，完整性通过后「确认生成」可用，跳转 `/result/`。
6. **结果页六段**：身份卡、六维雷达、人格分析、生活与工作、成长建议、人格关系均存在；显示合法编码。
7. **结果页刷新**：独立刷新仍渲染（冷启动等待 12 s 内完成），不暴露答题明细。
8. **海报**：默认 4:5 生成 dataURL；切 `1:1` 为 1080×1080；切横版为 1200×630。
9. **移动端**：首页 / 榜单 / 详情 / 免责在 375/390/430/768/1024/1440/1920 下横向溢出均为 0 px。
10. **派生文件**：`/sitemap.xml`、`/robots.txt` 均为 200。
11. **控制台**：0 个 `pageerror`。

---

## 5. 线上主流程验收（58 项）

同一脚本，`PREVIEW_BASE=https://zhubao315.github.io/mbti64`：

- 检查项 58，失败 0；HTTP 4xx/5xx = 0；`console.error = 0`、`pageerror = 0`。
- 线上实际完成：8 个页面访问、静态资源前缀、CSS 200、10 题刷新恢复、60 题完成、确认提交、结果六段、结果刷新、三尺寸海报、7 档宽度溢出、sitemap/robots。
- 控制台报错说明：首轮上线曾出现 5 条 `Failed to fetch RSC payload ... Falling back to browser navigation`，定位为 64 型链接批量预取在脚本快速换页时被中断。已将所有 64 型链接设 `prefetch={false}`，复测为 0；人工静置与点击导航复测亦为 0。

---

## 6. 线上补充验收（71 项）

脚本：`tools/_tmp/acceptance-extra.mjs`，全部 PASS：

| 分组 | 项数 | 内容 |
| --- | --- | --- |
| 移动导航 | 3 | 展开 `aria-expanded=true`、链接可见、Esc 关闭并回焦 |
| FAQ | 2 | `<details>` 可展开、答案可见 |
| 120 模式 | 4 | 完整模式存在 120 题、答题写入 `answers.full`、暂停弹层、Esc 关闭 |
| 改答案 | 1 | 回退上一题改选后，存储值更新为 `1` |
| 结果页入口 | 7 | 分享、复制代码、查看详情、榜单、再测一次；相似/互补；差异对比与沟通建议 |
| 海报下载 | 1 | 触发真实 `download` 事件并得到 PNG 文件名 |
| 可访问性 | 30 | 6 页 × 5 项：唯一 `h1`、图片 `alt`、控件可访问名称、表单标签、`lang=zh-CN` |
| SEO | 21 | 5 页 × canonical/description/OG/JSON-LD + sitemap 3 项 |
| 控制台 | 1 | 0 条 console.error |

---

## 7. 部署验收

| 检查 | 结果 |
| --- | --- |
| 线上首页 | 200，标题「MBTI64 · 64 Personalities」 |
| 子路径资源 | `/mbti64/_next/...` 全部 200 |
| 深层页刷新 | `/type/INFJ-A-O/`、`/result/`、`/rank/` 直接访问均正常 |
| 内链 | 首页 → 测评 / 榜单 / 详情 / 免责 均可点击到达 |
| HTTPS | `http://` 301 → `https://` |
| 404 | 不存在路径返回 404 |
| sitemap / robots | 200；sitemap 含 64 个详情页与免责声明 |
| 控制台 | 0 error / 0 pageerror |

发布：`main` 快进至 `a76640d`；`gh-pages` 部署提交 `e6d7e62`；无 force push、未动 tag 与其他分支。

---

## 8. 未覆盖与残余风险

1. **真机与浏览器矩阵**：仅在真机 Edge（Chromium）验证；Safari/iOS 微信内置浏览器未跑，Canvas 海报字体渲染需真机复核。
2. **Lighthouse 分数**：未跑；构建体积与首屏包体已记录，建议 CI 补 Lighthouse CI。
3. **视觉回归**：以截图人工抽查为主（首页桌面/移动、测评、结果、榜单、分享弹层），无像素级 baseline。
4. **真实用户样本**：稀有度仅模型先验，页面已声明非经验证人口统计。
5. **静态资源体积**：`out/` 约 378 MB，首次访问仅按需加载页面与图片，但 Pages 存储占用偏高。
