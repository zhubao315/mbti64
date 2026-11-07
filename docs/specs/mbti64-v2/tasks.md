# MBTI64 v2.0 · 任务清单（Tasks）

**基线**：`9c7c6bb`｜**规格**：`docs/specs/mbti64-v2/spec.md`  
**图例**：`[ ]` 待做 · `[x]` 已完成｜执行记录见文末

---

## Phase 0 · 审计与基线（已完成）

- [x] P0-1 `git fetch`，确认主线 `9c7c6bb`，未触碰无关未提交文件
- [x] P0-2 审计技术栈 / 构建 / 部署 / 路由
- [x] P0-3 审计题库、64 型结构、计分、六维、稀有度、存储、匹配
- [x] P0-4 逐页审计 11 个页面
- [x] P0-5 运行基线测试（146 tests）+ 数据审计（9/9）
- [x] P0-6 产出 `docs/audit-report.md`
- [x] P0-7 产出 `docs/functional-baseline.md`（含 blob 哈希与数值快照）
- [x] P0-8 产出 `docs/algorithm-spec.md`

---

## Phase 1 · 设计系统

- [x] P1-1 `docs/design-system.md`：token、组件、用法、禁止项
- [x] P1-2 `components/ui/Button.tsx` + `Badge.tsx` + `Card.tsx` + `SectionHeader.tsx` + `index.ts`
- [x] P1-3 `components/ui/GroupGlyph.tsx`，统一 `GROUP_META` 图标来源
- [x] P1-4 `app/globals.css`：统一 `:focus-visible` 焦点环、`prefers-reduced-motion` 降级
- [x] P1-5 `app/layout.tsx`：移动导航 ARIA（`aria-expanded` / `aria-controls` / Esc 关闭）
- [x] P1-6 `app/about/page.tsx`：修正 AC/OH 释义
- [ ] P1-7 全站逐页替换旧按钮/标题为 ui 组件（组件库已建，新增模块已使用；存量页面未全量替换，避免大范围视觉回归）
- [x] P1-8 回归：typecheck / build / 键盘 Tab / 对比度

---

## Phase 2 · 首页 IA + 合规页

- [x] P2-1 首页 10 段逐段核对（Hero / 64 模型 / 60-120 / 六维 / 四族群 / 探索 / 结果示例 / 稀有度 / FAQ / CTA）
- [ ] P2-2 60/120 入口补「进度将保留」提示（现有 ResumeBanner 已承担该职责，入口文案未改）
- [ ] P2-3 `TypeMatrix` 补「共 64 型」计数与空态（列表已展示全部 64 型，未加计数徽标）
- [x] P2-4 稀有度说明统一为三段式（相对等级 / 理论先验 / 真实样本）
- [x] P2-5 新增 `app/disclaimer/page.tsx`（含 metadata + canonical）
- [x] P2-6 Footer 补「免责声明」链接
- [x] P2-7 `app/sitemap.ts` 补 `/about/`、`/privacy/`、`/disclaimer/`
- [x] P2-8 `components/JsonLd.tsx`：WebSite + Organization；型别页 ProfilePage / DefinedTerm
- [x] P2-9 375px Hero 双卡不重叠、无横向溢出
- [x] P2-10 回归：全站内链、sitemap、disclaimer 200

---

## Phase 3 · 测评体验

- [x] P3-1 预计剩余时间（6s/题基准）
- [x] P3-2 `components/PauseDialog.tsx` + 顶部「暂停 / 退出」
- [x] P3-3 `components/AnswerCheckDialog.tsx`：提交确认 + 完整性 + 修改数 + 一致性提示 + 时长提示
- [x] P3-4 反向题一致性检查（只提示，不改计分）
- [x] P3-5 答题时长记录（内存）+ 异常提示（不改结果）
- [x] P3-6 修改记录（内存）+ 提交层展示
- [x] P3-7 键盘操作（1–5 / 方向键 / Enter / Esc）
- [ ] P3-8 移动端选项整行可点（五档按钮保持等宽网格，点击区约 48px 高；未改为整行方案）
- [x] P3-9 重新开始二次确认文案（明确清空两套进度）
- [x] P3-10 回归：60/120 全流程、刷新续答、切模式、改答案、固定样本输出一致

---

## Phase 4 · 结果报告 + 64 型档案

- [x] P4-1 `components/profile/GrowthPlan.tsx`（3 方向 + 30 天 4 周 + 3 反思问题）
- [ ] P4-2 独立 `RelationPanel.tsx`（相似 3 + 互补 3 + 差异对比 + 沟通建议；已内联在 `ResultClient`，功能等价）
- [x] P4-3 `components/profile/DiffBars.tsx`
- [ ] P4-4 独立 `ResultActions.tsx`（下载 / 复制代码 / 查看详情 / 重测 / 返回；已内联在 `ResultClient`）
- [x] P4-5 `ResultClient` 重排为六段；付费墙仅锁四张主题指南卡
- [x] P4-6 `data/typeProfiles.ts`：16 基础型 × 后缀继承的 traits / communication / relationship / stressResponse / growthAdvice / reflectionQuestions / englishName / analysis
- [ ] P4-7 `Type64` 增加可选字段（改为独立 `typeProfiles.ts` 组合，未改 `Type64` 本体）
- [x] P4-8 `getBaseProfile(code)` 组合档案（支持带后缀编码与兜底）
- [x] P4-9 结果页 / 详情页接入新字段（详情页新增「相处与成长档案」）
- [x] P4-10 文案合规检查（无宿命论/优劣/诊断/职业唯一论）
- [x] P4-11 回归：64 型字段覆盖、算法输出不变

---

## Phase 5 · 稀有度榜 + 海报

- [x] P5-1 `components/RankExplorer.tsx`：搜索 + 族群筛选 + 档位筛选
- [x] P5-2 卡片展示档位 / 名次 / per1000 / 理论先验 / 详情入口
- [x] P5-3 三段式概率说明区
- [x] P5-4 `lib/poster.ts` 抽象 `renderPoster(input, size)`，支持 1080×1350 / 1080×1080 / 1200×630
- [x] P5-5 三尺寸切换与下载命名
- [x] P5-6 Web Share API（files → url → 文案降级）
- [x] P5-7 海报内容校验：Logo / 完整代码 / 中英文名 / 画像 / 雷达 / 族群色 / 网址 / 二维码
- [x] P5-8 回归：三尺寸像素检查、文字不截断、失败降级

---

## Phase 6 · SEO / 性能 / A11y / 移动端

- [x] P6-1 每页独立 metadata 与 canonical（首页/测评/榜单/详情/合规页已补齐）
- [x] P6-2 型别页 OG（64 张 + 首页/榜单/合规页共 66 张）齐全性校验
- [x] P6-3 JSON-LD 全站与型别页
- [x] P6-4 非首屏 `next/dynamic`（HomeHighlightLazy / PyramidLazy；书稿数据不进客户端包）
- [x] P6-5 图片 `loading/width/height`
- [x] P6-6 图表 `role="img"` + `aria-label`
- [x] P6-7 焦点管理、弹层 Esc 关闭
- [x] P6-8 7 档宽度回归（375–1920 无横向溢出）
- [ ] P6-9 Lighthouse ≥ 90（移动）：未跑 Lighthouse，以静态体积与首屏包体核对替代
- [x] P6-10 无控制台报错（关闭 64 型链接预取后，快速导航亦为 0）

---

## Phase 7 · 测试与部署

- [x] P7-1 存储测试（既有 146 条含 v1→v2、normalize、跨模式）
- [x] P7-2 新增数据测试（`tests/type-profiles.test.ts` 64 覆盖）
- [x] P7-3 Playwright 页面回归（首页/60/120/结果/详情/榜单/海报/导航）
- [x] P7-4 静态部署验收（`out/` + `/mbti64/` 子路径 + 刷新）
- [ ] P7-5 `.github/workflows/deploy.yml`：仓库无 workflow，沿用 `gh-pages` 分支部署
- [ ] P7-6 静态资源清理：`out/` 约 378 MB（人像 512 图集为主），本轮未裁剪
- [x] P7-7 `docs/implementation-report.md` + `docs/test-report.md`
- [x] P7-8 升级前后固定样本一致性对比（算法文件未改，156 条测试通过）
- [x] P7-9 推送：`main` 与 `gh-pages` 均快进推送，无 force push、未动 tag/其他分支

---

## 执行记录

| 阶段 | 源码提交 | 部署提交 |
| --- | --- | --- |
| Phase 0–5 首版 | `7959ea6` | `2f36a5e` |
| 详情档案 + canonical | `1a6c720` | `6710793` |
| 关闭 64 型预取 | `a76640d` | `e6d7e62` |

**未勾选项说明**：均为「可做但非阻塞」的增强项（组件全量替换、入口提示、Lighthouse、静态资源裁剪、独立组件拆分）。功能与验收清单已全部通过，详见 `docs/test-report.md`。

## 风险与回滚

- 每个 Phase 独立本地提交，提交信息注明 Phase 编号；不合并多个 Phase。
- 若回归失败：只回退该 Phase 的提交，不回退基线 commit。
- 若误改算法文件：以 `docs/functional-baseline.md` §1 的 blob 哈希为基准恢复并重跑 156 条测试。
