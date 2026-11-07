# MBTI64 v2.0 · 任务清单（Tasks）

**基线**：`9c7c6bb`｜**规格**：`docs/specs/mbti64-v2/spec.md`  
**图例**：`[ ]` 待做 · `[x]` 已完成｜每完成一个 Phase 跑一次全量回归（见 `docs/functional-baseline.md` §7）

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

**出口条件**：用户批准本 spec / tasks。

---

## Phase 1 · 设计系统

- [ ] P1-1 `docs/design-system.md`：token、组件、用法、禁止项
- [ ] P1-2 `components/ui/Button.tsx` + `Badge.tsx` + `Card.tsx` + `SectionHeader.tsx` + `index.ts`
- [ ] P1-3 `components/ui/GroupGlyph.tsx`，统一 `GROUP_META` 图标来源，替换首页与 `/rank` 的重复 `GROUP_ICONS`
- [ ] P1-4 `app/globals.css`：统一 `:focus-visible` 焦点环、`prefers-reduced-motion` 降级
- [ ] P1-5 `app/layout.tsx`：移动导航 ARIA（`aria-expanded` / `aria-controls` / Esc 关闭）
- [ ] P1-6 `app/about/page.tsx`：修正 AC/OH 释义
- [ ] P1-7 逐页替换重复标题/按钮为 ui 组件（不改文案语义）
- [ ] P1-8 回归：typecheck / build / 键盘 Tab / 对比度

**出口条件**：视觉不回退，A11y 基础项通过。

---

## Phase 2 · 首页 IA + 合规页

- [ ] P2-1 首页 10 段逐段核对（Hero / 64 模型 / 60-120 / 六维 / 四族群 / 探索 / 结果示例 / 稀有度 / FAQ / CTA）
- [ ] P2-2 60/120 入口补「进度将保留」提示
- [ ] P2-3 `TypeMatrix` 补「共 64 型」计数与空态
- [ ] P2-4 稀有度说明统一为三段式（相对等级 / 理论先验 / 真实样本）
- [ ] P2-5 新增 `app/disclaimer/page.tsx`（含 metadata + canonical）
- [ ] P2-6 Footer 补「免责声明」链接
- [ ] P2-7 `app/sitemap.ts` 补 `/about/`、`/privacy/`、`/disclaimer/`
- [ ] P2-8 `components/JsonLd.tsx`：WebSite + Organization；型别页 Article/ProfilePage
- [ ] P2-9 375px Hero 双卡不重叠、无横向溢出
- [ ] P2-10 回归：全站内链、sitemap、disclaimer 200

---

## Phase 3 · 测评体验

- [ ] P3-1 预计剩余时间（6s/题基准）
- [ ] P3-2 `components/PauseDialog.tsx` + 顶部「暂停并退出」
- [ ] P3-3 `components/AnswerCheckDialog.tsx`：提交确认 + 完整性 + 修改数 + 一致性提示 + 时长提示
- [ ] P3-4 反向题一致性检查（只提示，不改计分）
- [ ] P3-5 答题时长记录（内存）+ 异常提示（不改结果）
- [ ] P3-6 修改记录（内存）+ 提交层展示
- [ ] P3-7 键盘操作（1–5 / 方向键 / Enter / Esc）
- [ ] P3-8 选项点击区 48px、移动端整行可点
- [ ] P3-9 重新开始二次确认文案（明确清空两套进度）
- [ ] P3-10 回归：60/120 全流程、刷新续答、切模式、改答案、固定样本输出一致

---

## Phase 4 · 结果报告 + 64 型档案

- [ ] P4-1 `components/profile/GrowthPlan.tsx`（3 方向 + 30 天 4 周 + 3 反思问题）
- [ ] P4-2 `components/profile/RelationPanel.tsx`（相似 3 + 互补 3 + 差异对比 + 沟通建议）
- [ ] P4-3 `components/profile/DiffBars.tsx`
- [ ] P4-4 `components/ResultActions.tsx`（下载 / 复制代码 / 查看详情 / 重测 / 返回）
- [ ] P4-5 `ResultClient` 重排为六段；付费墙仅锁深度卡（待 D1 确认）
- [ ] P4-6 `data/typeProfiles.ts`：16 基础型 × 4 后缀的 traits / communication / relationship / stressResponse / growthAdvice / reflectionQuestions / englishName
- [ ] P4-7 `Type64` 增加可选字段并接入组装
- [ ] P4-8 `lib/profile.ts` `getTypeProfile(code)` 组合 match + rarity
- [ ] P4-9 结果页/详情页接入新字段
- [ ] P4-10 文案合规检查（无宿命论/优劣/诊断/职业唯一论）
- [ ] P4-11 回归：64 型字段覆盖、`audit:personality` 扩充、算法输出不变

---

## Phase 5 · 稀有度榜 + 海报

- [ ] P5-1 `components/RankExplorer.tsx`：搜索 + 族群筛选 + 档位筛选
- [ ] P5-2 卡片展示档位 / 排名区间 / per1000 / 理论先验 / 详情入口
- [ ] P5-3 三段式概率说明区
- [ ] P5-4 `lib/poster.ts` 抽象 `renderPoster(input, size)`，支持 1080×1350 / 1080×1080 / 1200×630
- [ ] P5-5 三尺寸切换与下载命名
- [ ] P5-6 Web Share API（files → url → 文案降级）
- [ ] P5-7 海报内容校验：Logo / 完整代码 / 中英文名 / 画像 / 雷达 / 族群色 / 网址 / 二维码
- [ ] P5-8 回归：三尺寸像素检查、文字不截断、失败降级

---

## Phase 6 · SEO / 性能 / A11y / 移动端

- [ ] P6-1 每页独立 metadata 与 canonical 复核
- [ ] P6-2 型别页 OG（64 张）齐全性校验
- [ ] P6-3 JSON-LD 全站与型别页
- [ ] P6-4 非首屏 `next/dynamic`；检查 `bookEnriched` 是否进客户端包
- [ ] P6-5 图片 `loading/width/height/fetchPriority`
- [ ] P6-6 图表 `role="img"` + `aria-label`
- [ ] P6-7 焦点管理、弹层 focus trap、Esc
- [ ] P6-8 7 档宽度回归（375–1920）
- [ ] P6-9 Lighthouse ≥ 90（移动）
- [ ] P6-10 无控制台报错

---

## Phase 7 · 测试与部署

- [ ] P7-1 新增存储测试（v1→v2、normalize、跨模式）
- [ ] P7-2 新增数据测试（新字段 64 覆盖）
- [ ] P7-3 Playwright 页面回归（首页/60/120/结果/详情/榜单/海报/导航）
- [ ] P7-4 静态部署验收（`out/` + `/mbti64/` 子路径 + 刷新）
- [ ] P7-5 `.github/workflows/deploy.yml`（注入 basePath/SITE_URL）
- [ ] P7-6 静态资源清理（D2 确认后）
- [ ] P7-7 `docs/implementation-report.md` + `docs/test-report.md`
- [ ] P7-8 升级前后固定样本一致性对比
- [ ] P7-9 用户确认后推送（不 force push、不动 tag、不带无关文件）

---

## 风险与回滚

- 每个 Phase 独立本地提交，提交信息注明 Phase 编号；不合并多个 Phase。
- 若回归失败：只回退该 Phase 的提交，不回退基线 commit。
- 若误改算法文件：以 `docs/functional-baseline.md` §1 的 blob 哈希为基准恢复并重跑 146 条测试。
