# MBTI64 Product Experience & Brand Redesign v2.0 · 规格（Spec）

**状态**：待用户审批（Spec Mode）  
**基线**：`9c7c6bb`（`origin/main`）  
**上游依据**：任务书 v2.0 + `docs/audit-report.md` + `docs/functional-baseline.md` + `docs/algorithm-spec.md`  
**复用**：已完成的品牌 CI（`docs/specs/mbti64-brand-ci/`、`tailwind.config.ts`、`app/globals.css`、`components/BrandLogo.tsx`、`public/assets/brand/*`）。**Logo 沿用方案一，不重画。**

---

## 0. 不可变约束（全部 Phase 生效）

1. 16 原型、4 后缀、64 编码、六维模型、60/120 题库与选项、正反向计分、A/C 与 O/H 判定、摇摆型机制、人格名称数据、七档稀有度分组、相似/互补推荐、`p64:v1` 存储结构、中断恢复机制 —— **只读**。
2. 发现算法/题目问题：写入证据表，等待确认，不擅自改评分规则或题目。
3. 数据结构新增字段必须可选 + 有默认值；不得清空用户本地数据。
4. GitHub Pages 子路径 `/mbti64/`：所有图片/链接/OG/分享地址必须走 `lib/site.ts` 的 `withBasePath` / `absoluteUrl`。
5. 移动端优先：375 / 390 / 430 / 768 / 1024 / 1440 / 1920 无横向溢出。
6. 不触碰工作区未提交的无关文件；不 force push；不推其他分支；不动 tag；**未经确认不 push**。

---

## 1. Phase 1 · 品牌 CI 与设计系统

### 1.1 现状（可直接复用，不重做）

- `tailwind.config.ts`：navy `#0F2747` / deep `#0A1B33`、paper/wash/line `#E7ECF2`、ink 系列、四族群色（analyst `#7B61FF`、diplomat `#4CAF6B`、guardian `#4A90E2`、adventurer `#F6C343`，各带 text/soft/light）、`rounded-card 12px` / `rounded-panel 16px`、`shadow-card/lift`。
- `app/globals.css`：`.card`、`.btn-primary`、`.btn-ghost`、`.btn-tertiary`、`.eyebrow`、`.section-title`、`.section-sub`、`.portrait-blob`、`.prose-type`。
- `components/BrandLogo.tsx`：variant × tone，内部已 `withBasePath`。
- 品牌资产：`public/assets/brand/`（primary/stacked/light/dark/mono/icon/favicon/192/512/maskable/apple-touch）、`public/og/home.png`、`public/site.webmanifest`、`brand-guidelines.md`。

### 1.2 本阶段改动（最小必要）

| 文件 | 改动 | 验收 |
|---|---|---|
| `docs/design-system.md`（新建） | 汇总 token、组件、用法、禁止项；引用既有 `docs/design/*` | 文档可直接指导实现 |
| `components/ui/Button.tsx`（新建） | 统一 `primary/ghost/tertiary/danger` + `size sm/md/lg` + `asChild`（Link/button 双形态） | 现有按钮视觉不回退 |
| `components/ui/Card.tsx`（新建） | `card` / `panel` / `flat` 三态 + 可选 hover lift | 首页/榜单/结果页可复用 |
| `components/ui/Badge.tsx`（新建） | 族徽/稀有度/摇摆/中性四种 tone | 与现有 `RarityBadge` 视觉一致 |
| `components/ui/SectionHeader.tsx`（新建） | eyebrow + title + sub + action 插槽 | 替换各页重复标题写法 |
| `components/ui/index.ts` | 统一导出 | tree-shaking 正常 |
| `app/globals.css` | 增补 `:focus-visible` 统一焦点环、`prefers-reduced-motion` 全局降级、`.sr-only` 已存在 | 键盘可见焦点；动画用户可关闭 |
| `app/layout.tsx` | 移动导航改为 `aria-expanded + aria-controls` 的按钮式菜单（保留 `<details>` 亦可，但必须补 ARIA） | 键盘可开合、Esc 关闭 |
| `app/about/page.tsx` | 修正 AC/OH 释义为「坚定 A / 审慎 C」「求新 O / 守成 H」 | 与 `data/schema.ts` 一致 |
| `components/ui/GroupGlyph.tsx` | 复用 `GROUP_META`，消除页面内重复 `GROUP_ICONS` | 单一来源 |

**不改**：Logo 图形、族群主色、现有页面路由、任何算法文件。

**验收**：
- `npm run build` 通过；截图对比首页/榜单/结果页无视觉回退（同一断点）。
- 键盘 Tab 可到达所有交互项，焦点环可见；`prefers-reduced-motion: reduce` 下动画关闭。
- 对比度：文字/底色 ≥ 4.5:1（用 `GROUP_META.text` 而非 `color` 写文字）。

---

## 2. Phase 2 · 首页 IA 收口 + 合规页

### 2.1 首页（`app/page.tsx`）

现有 10 段顺序已基本符合任务书。本阶段只做「收口与一致性」，不推翻：

1. Header（`app/layout.tsx`）：导航固定为 首页 / 人格测评 / 64 型人格（`/rank#groups`）/ 稀有榜 / 关于；右侧 CTA「开始测评」；移动端 ARIA 菜单。
2. Hero：保留双卡 + 四族群色条；确保 375px 不重叠；副文案保留「本地保存 / 无需注册」。
3. 64 型模型：保留 16×4=64 三卡乘法；补一句「后缀不属于传统 MBTI 官方体系」（已有）。
4. 60/120 入口：保留双卡；补「已答进度将保留」提示（读取 store）。
5. 六维模型：保留 6 卡。
6. 四大族群：保留 4 卡；`typesByGroup` 计数口径统一。
7. 64 型探索：`TypeMatrix` 保留筛选；补「共 64 型」计数与空态。
8. 稀有度金字塔：保留 `PyramidExplorer`；说明文字统一为「相对等级 / 理论先验 / 无真实样本」三段式。
9. 结果示例：保留；标注「演示数据」。
10. FAQ + 最终 CTA + Footer。

**新增**：
- `app/disclaimer/page.tsx`：独立免责声明页（非临床诊断、非人口统计结论、非职业唯一依据、人格流动、危机求助指引）。
- `app/sitemap.ts`：补 `/about/`、`/privacy/`、`/disclaimer/`。
- `app/layout.tsx` Footer：补「免责声明」链接。
- `app/layout.tsx` 或 `components/JsonLd.tsx`：补 `WebSite` + `Organization` JSON-LD（全站）；型别页补 `Article`/`ProfilePage` JSON-LD。

**验收**：
- 首页 10 段齐全、无断链；`/disclaimer` 200；sitemap 含新增页。
- 375px 无横向溢出；Hero 图片不变形。

---

## 3. Phase 3 · 测评系统体验（题库与算法零改动）

### 3.1 `components/TestClient.tsx`

新增（只读现有 state，不改 `useQuizStore` 的写入语义）：

| 能力 | 实现方式 |
|---|---|
| 预计剩余时间 | 按 `remaining × 平均每题耗时`（无历史时用 6 秒/题）估算，显示「约 X 分钟」 |
| 暂停/退出 | 顶部「暂停并退出」按钮 → 打开说明弹层：进度已保存在本机、如何恢复、继续/退出 |
| 提交前确认 | 点击最后「看结果」时打开确认弹层：已答/总题数、预计用时、是否有修改记录；确认后 `handleFinish()` |
| 完整性检查 | 已有 `done` 逻辑保留；弹层中显示未答题数并提供「补齐」跳转 |
| 反向题一致性 | **只做提示**：同维正向/反向答案方向冲突≥阈值时，在提交确认层显示「有 N 组答案方向相反，建议回看」，不改变计分 |
| 答题时长异常 | 记录每题首次进入/作答时间（仅内存 + 可选本地日志），单题 < 1.5 秒占比过高时提示「答得较快，可回看」，**不改变结果** |
| 答案修改记录 | 内存中记录 `questionId → {first, last, changes}`；提交确认层展示修改数量；**不写入 `answers` 结构** |
| 防误清 | 现有重置弹窗保留；新增「重新开始」二次确认文案明确「将清空 60/120 两套进度」 |
| 键盘操作 | Likert：数字 1–5 / 左右方向键选择；Enter 下一题；Esc 关闭弹层 |
| 选项点击区 | `min-h-[48px]`，移动端整行可点 |

**不改**：`data/questions.*`、`lib/scoring.ts`、`lib/store.ts` 的字段与迁移版本。

### 3.2 组件

- `components/AnswerCheckDialog.tsx`（新建）：提交确认 + 完整性 + 一致性提示 + 时长提示。
- `components/PauseDialog.tsx`（新建）：暂停/退出说明。
- `components/QuestionCard.tsx`：仅改交互尺寸与键盘事件，不改选项数据。

**验收**：
- 60/120 全流程可完成；刷新续答；切模式进度独立；改答案后结果随之变化。
- 用固定答案样本跑 `scoreTest`，升级前后输出完全一致。
- 提示层不改变任何 `answers` 值。

---

## 4. Phase 4 · 结果报告六段 + 64 型档案字段

### 4.1 结果页（`components/ResultClient.tsx`）

六段结构（**免费可见**，付费墙只允许锁「深度扩展卡」，不得锁六段主体）：

1. 身份卡：插画、displayCode、名称/tagline、族群、稀有度、关键词、六个操作（分享/下载/复制代码/查看详情/再测/返回）。
2. 六维雷达 + 逐维读数（保留）。
3. 人格分析：优势 / 局限 / 行为表现 / 成长空间 四小块（来自新档案字段）。
4. 生活与工作：关系、工作方式、压力反应、沟通风格。
5. 成长建议：3 个方向 + 30 天计划（4 周）+ 3 个反思问题。
6. 人格关系：最相似 3 + 最互补 3 + 差异对比（逐维对比条）+ 沟通建议。

新增组件：
- `components/profile/GrowthPlan.tsx`
- `components/profile/RelationPanel.tsx`（含差异对比与沟通建议）
- `components/profile/DiffBars.tsx`
- `components/ResultActions.tsx`（下载 PNG / 复制代码 / 查看详情 / 重测 / 返回）

**付费墙**：保留 `unlocked` 机制，但仅作用于 `InterestCards` / 书稿深度卡；六段主体始终可见。若用户选择「取消 Demo 付费」则移除 `PaywallModal`（待确认，见 §8）。

### 4.2 64 型档案字段（`data/types64.ts` + 新模块）

- 新增 `data/typeProfiles.ts`：按 16 基础型 + 4 后缀组合派生 `traits`、`communication`、`relationship`、`stressResponse`、`growthAdvice`（3 条）、`reflectionQuestions`（3 条）、`englishName`。
- `Type64` 接口**新增可选字段**（不删旧字段、不改编码）：
  `englishName?`、`traits?`、`communication?`、`relationship?`、`stressResponse?`、`growthAdvice?`、`reflectionQuestions?`。
- `similarTypes` / `complementaryTypes` / `rarity` / `probability` 不写入静态数据；由 `lib/profile.ts` 的 `getTypeProfile(code)` 组合 `lib/match.ts` + `lib/rarity.ts` 返回，保证单一事实源。

**验收**：
- 64 型全部具备新字段；编码唯一；引用有效；`audit:personality` 扩充后 0 错误。
- 文案同时写优势、局限、行为表现、成长空间；无宿命论/绝对化/优劣排名/医学诊断/职业唯一论。
- 算法输出不变。

---

## 5. Phase 5 · 稀有度榜 + 分享海报

### 5.1 `/rank`

- 新增客户端组件 `components/RankExplorer.tsx`：
  - 搜索（代码/中文名/tagline）；
  - 族群筛选（四族群 chip）；
  - 档位筛选 + 「全部」；
  - 每卡展示：档位、排名区间、`per1000`、理论先验概率、详情入口。
- 说明区固定三段：「相对稀有等级（档位）/ 模型理论概率（先验）/ 真实样本分布（当前无采样）」。

### 5.2 海报（`lib/poster.ts` + `components/SharePoster.tsx`）

- 抽象 `renderPoster(input, size)`，支持：
  - `1080 × 1350`（4:5，朋友圈）
  - `1080 × 1080`（1:1，头像/群聊）
  - `1200 × 630`（OG/横版）
- 内容：Logo、完整代码、中英文名、一句话画像、六维雷达、族群色、网址、二维码（按尺寸自适应）。
- 独立海报组件（非截全页），Canvas 2D，高清（devicePixelRatio 或固定 2x）。
- 交互：下载 PNG（默认 4:5，可切换）、Web Share API（`files` 优先，`url` 降级）、复制链接、失败提示 + 文字分享降级。

**注意**：`lib/poster.ts` 当前为已提交文件；工作区海报脚本属于无关改动，**不得纳入本次提交**。

**验收**：
- 三尺寸均可生成、文字不截断；移动端 Safari/Chrome 至少一种成功；失败有降级。
- 海报中的稀有度/代码与结果页一致（同源读取）。

---

## 6. Phase 6 · SEO / 性能 / A11y / 移动端

| 项 | 改动 |
|---|---|
| SEO | 每页独立 title/description；型别页 canonical + OG + Article JSON-LD；`/disclaimer` metadata；sitemap 补页；robots 保持 `/result/` 屏蔽 |
| 性能 | 非首屏组件 `next/dynamic`；`portraits-light` 缩略图保持 512；海报/二维码动态 import（已做）；检查 `bookEnriched` 是否进入客户端 bundle |
| 图片 | 所有 `<img>` 保留 `width/height`；补 `loading="lazy"`（首屏 `fetchPriority="high"` 除外）；确认 64 张 OG 齐全 |
| A11y | 键盘全流程、焦点环、`aria-label`、图表 `role="img"` + `aria-label` 文字替代、`prefers-reduced-motion`、不单靠颜色表意（档位加文字） |
| 移动端 | 375/390/430/768/1024/1440/1920 回归；固定底栏不遮挡；导航可开合 |

**验收**：Lighthouse 四项 ≥ 90（移动）；无控制台报错；无横向溢出。

---

## 7. Phase 7 · 测试与部署

### 7.1 测试

| 类型 | 内容 |
|---|---|
| 算法 | 16/4/64 编码、正反向、A/C、O/H、摇摆、边界（全 0/全 2/全 4/空答）、缺答、双模式 |
| 数据 | 完整性、唯一性、引用、概率、稀有度、题量、反向题数量、新增字段 64 覆盖 |
| 存储 | v1→v2 迁移、normalize、游标、跨模式隔离（新增测试） |
| 页面 | 首页、60/120、退出恢复、改答案、结果、详情、榜单、海报、移动导航（Playwright） |
| 部署 | Pages、`/mbti64/`、刷新、资源、内链、HTTPS、无控制台报错 |

### 7.2 部署

- 新增 `.github/workflows/deploy.yml`：`npm ci` → `npm run test` → `npm run build`（注入 `NEXT_PUBLIC_BASE_PATH=/mbti64`、`NEXT_PUBLIC_SITE_URL=https://zhubao315.github.io`）→ 发布 `out` 到 Pages。
- 先事务性验证：本地 `out/` 用 `python -m http.server` 逐路径检查；`/mbti64/` 双前缀扫描。
- **push 前必须获得用户确认。**

---

## 8. 待确认决策（阻塞 Phase 4/5 的部分）

| # | 决策点 | 默认建议 |
|---|---|---|
| D1 | 结果页 Demo 付费墙是否保留 | 保留机制，但六段主体免费可见；付费只锁深度扩展卡 |
| D2 | `public/assets/portraits/`（196.7 MB）是否删除 | 先全仓扫描引用，确认无引用后删除 |
| D3 | 64 型 `englishName` 采用哪套命名 | 原创英文原型名，避免商标型别名 |
| D4 | 海报默认尺寸 | 1080×1350（朋友圈优先），另两尺寸可切换 |
| D5 | `/disclaimer` 是否独立页 | 是，独立路由 |

---

## 9. 完成定义（Definition of Done）

- [ ] Phase 0 三份文档入库。
- [ ] Phase 1 设计系统落地，`/about` 文案修正。
- [ ] Phase 2 首页 10 段收口 + `/disclaimer` + sitemap/JSON-LD。
- [ ] Phase 3 测评质控与交互全部可用，算法零变化。
- [ ] Phase 4 结果六段 + 64 型字段全覆盖。
- [ ] Phase 5 稀有度交互榜 + 三尺寸海报。
- [ ] Phase 6 SEO/性能/A11y/移动端达标。
- [ ] Phase 7 测试全绿、Pages 子路径验收通过。
- [ ] 升级前后固定样本输出完全一致。
- [ ] 未提交/未推送任何无关文件；未改动红线清单。
