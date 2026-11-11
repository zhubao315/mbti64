# Phase 0 · 完整代码与功能审计报告

**项目**：MBTI64 — 64 Personalities（`https://zhubao315.github.io/mbti64/`）  
**仓库**：`zhubao315/mbti64` → 本地 `D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn`  
**审计基线**：`origin/main` @ `9c7c6bb`（2026-11-07 已 `git fetch`）  
**审计方式**：只读代码审计 + 本地执行测试/构建校验，不改代码  
**审计范围**：框架、路由、题库、64 型数据、计分、六维、稀有度、localStorage、图表、静态资源、Pages 部署、移动端、SEO、重复代码；11 个页面逐一审计

> 说明：仓库内 `docs/audit/*` 是 2026-11-05 针对 `a38bfc0` 的旧审计，与当前主线（store v2、`/about`、`/privacy`、`portraits-light`、结果页付费区）已不一致。本报告以当前主线为准，旧文档仅作历史参考。

---

## 1. 技术栈结论

| 项目 | 结论 |
|---|---|
| 框架 | Next.js `14.2.15` App Router（`app/` 目录） |
| React | `18.3.1`（`react` / `react-dom`） |
| 语言 | TypeScript `5.6.3`，严格模式由 `tsconfig.json` 控制 |
| 样式 | Tailwind CSS `3.4.14` + `app/globals.css` 语义类（`.card` / `.btn-primary` / `.btn-ghost` / `.eyebrow` / `.section-title`） |
| 状态 | `zustand@4.5.5` + `persist`（localStorage） |
| 动效 | `framer-motion@11.11.17` |
| 图标 | `@phosphor-icons/react@2.1.10`（SSR 变体用于 Server Component） |
| 二维码 | `qrcode@1.5.4`（海报内动态 import） |
| 测试 | `vitest@2.1.4`（6 个测试文件 / 146 条断言）、`playwright-core@1.64.1`（工具脚本） |
| 构建产物 | 纯静态导出 `output: "export"`，无 API Route / ISR / 服务端运行时 |
| 部署 | GitHub Pages 项目站点，子路径 `/mbti64/`，`basePath` 由 `NEXT_PUBLIC_BASE_PATH` 注入 |

**判断**：技术栈轻量、无重依赖，适合静态托管；工程健康的短板集中在「内容/交互完整性」与「部署自动化」，而非框架选型。

---

## 2. 构建与部署审计

### 2.1 `next.config.mjs`

```
output: "export"
basePath: process.env.NEXT_PUBLIC_BASE_PATH || ""
trailingSlash: true
images: { unoptimized: true }
experimental.optimizePackageImports: ["framer-motion"]
```

- `trailingSlash: true` → 所有页面输出为 `xxx/index.html`，GitHub Pages 刷新不会 404（除根路径外均带斜杠）。
- `images.unoptimized: true` → `next/image` 不做优化，也**不会自动加 basePath**；所有 `<img>` / 图片资源必须走 `withBasePath()`。当前首页、型别页、结果页、海报均已显式调用，风险可控。
- `public/.nojekyll` 存在 → Pages 不会忽略 `_` 前缀资源。

### 2.2 路径工具（`lib/site.ts`）

- `BASE_PATH`、`withBasePath(path)`、`absoluteUrl(path)`、`METADATA_BASE` 为唯一拼路径入口。
- 二维码、分享链接、OG 图均走 `absoluteUrl()`，避免 `/mbti64/mbti64/` 双前缀。

### 2.3 部署自动化缺口

- 仓库中**未发现** `.github/workflows/` 部署流水线；发布依赖手动构建/推送 `gh-pages`。
- 风险：本地构建参数（`NEXT_PUBLIC_BASE_PATH=/mbti64`、`NEXT_PUBLIC_SITE_URL`）靠人工记忆，容易漏配导致全站资源 404。
- 建议（Phase 7）：补 `.github/workflows/deploy.yml`，把两个环境变量固化在 CI 中。

### 2.4 静态资源体积（高风险）

| 目录 | 文件数 | 体积 |
|---|---|---|
| `public/assets/portraits-light` | 256 | 171.9 MB |
| `public/assets/portraits` | 384 | 196.7 MB |
| 合计 | 640 | **368.6 MB** |

- 站点实际引用的是 `portraits-light/{hero-1200x1600, thumb-512}`；`portraits/` 疑似历史遗留或中间产物。
- GitHub Pages 单站点上限约 1 GB，368 MB 尚未触顶，但会显著拖慢克隆、构建与发布。
- **不得擅自删除**：需先全仓扫描引用（含 `docs/`、脚本、海报、OG 生成器）确认无引用后，再按 Phase 7 计划清理。

---

## 3. 路由清单（App Router）

| # | URL | 文件 | 渲染 | SEO | 核心数据/算法 | 备注 |
|---|---|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` | SSG | 继承根 metadata | 稀有度、64 型、六维 | 已实现 10 段首页结构 |
| 2 | `/test` | `app/test/page.tsx` | 客户端组件 `TestClient` | 有 title/desc，可索引 | `SESSION_ORDER`、`computeResult` | 60/120 双模式 |
| 3 | `/result` | `app/result/page.tsx` | 客户端组件 `ResultClient` | `robots: noindex,nofollow` | `computeResult`、`similarTypes`、`complementaryTypes` | 依赖本地答题数据 |
| 4 | `/rank` | `app/rank/page.tsx` | SSG | 有 title/desc | `PRIOR_TABLE`、`rarityPyramid` | 七档 + 族群索引 |
| 5 | `/type/[code]` | `app/type/[code]/page.tsx` | SSG × 64 | `generateMetadata` + canonical + OG | `ALL_TYPES`、`getType`、`PRIOR_TABLE`、`similarTypes` | `dynamicParams: false` |
| 6 | `/about` | `app/about/page.tsx` | SSG | 有 title/desc | 静态文案 | 已存在 |
| 7 | `/privacy` | `app/privacy/page.tsx` | SSG | 待复核 | 静态文案 | 已存在 |
| 8 | `/robots.txt` | `app/robots.ts` | 构建期生成 | — | — | `disallow: /result/` |
| 9 | `/sitemap.xml` | `app/sitemap.ts` | 构建期生成 | — | `TYPE_CODES` | 仅收录 `/`、`/rank/`、`/test/`、64 型页 |
| 10 | `/disclaimer` | — | **缺失** | — | — | 任务书要求独立免责声明页 |
| 11 | `/og/[code].png` | 预生成静态 PNG | 静态 | — | — | 型别页引用 64 张，需验证齐全 |

**路由结论**：主体路由齐全、64 型全部 SSG；缺口是「独立免责声明页」与「sitemap 未收录 about / privacy」。

---

## 4. 逐页审计

### 4.1 首页 `/`

**现状**：已按 10 段信息架构落地 —— Hero（双人物卡）→ 认识 MBTI64（16×4=64）→ 开始测评（60/120 双入口）→ 六维模型 → 四大族群 → 探索 64 型（`TypeMatrix` 筛选）→ 结果示例（INFJ-A-O 演示）→ 稀有度金字塔 + 最稀有 6 型 → FAQ → 最终 CTA；Footer 在根 layout。

**数据源**：`PRIOR_TABLE`、`rarityPyramid`、`ALL_TYPES`、`BASE_TYPES`、`idealResult`、`DIMS`、`GROUP_META`。

**问题**：
- P2：Hero 双人物卡依赖 `portraits-light/thumb-512`，两卡绝对定位 + 中心 Logo，375px 下需实测不遮挡文字。
- P2：族群卡文案「{count} 种基础人格 · {count * 4} 种组合」中 `count` 只统计 A-O 变体，逻辑正确但易误读。
- P3：`GROUP_ICONS` 在首页与 `/rank` 各写一份，属重复代码。
- P2：`idealResult("INFJ-A-O")` 为演示数据，已标注「演示数据」，合规。

**回归要求**：所有原入口（`/test?mode=quick`、`/test?mode=full`、`/type/*`、`/rank`）不得失效；首屏图片不得变形。

### 4.2 测评入口 `/test`

**现状**：`TestClient` 单组件承载「入口 + 答题 + 完成态」。入口按 URL `?mode=` 切换；顶部有模式切换（精简 60 / 完整 120）、「退出」链接、「重新开始」（带 `role="dialog"` 重置确认）。

**已有能力**：自动保存（zustand persist）、退出恢复（`normalize()`）、防连点（`lockedRef`）、漏答拉回、完成态「生成我的 64 型结果」按钮、剩余题数提示。

**问题**：
- P1：无「预计剩余时间」。
- P1：无提交前确认弹窗（最后一题直接进入完成态/结果页）。
- P1：无暂停/退出说明卡（「退出」直接离开，进度说明只在答题中显示）。
- P1：无答题质量控制：反向题一致性、答题时长异常提示、答案修改记录。
- P2：模式切换无「已答 X 题将保留」提示。
- P2：未见键盘快捷键（grep 无 `keydown`），键盘用户需逐项 Tab。

**回归要求**：60 题、120 题、刷新续答、改答案、切模式、`p64:v1` 结构均不得改变。

### 4.3 答题页（`TestClient` 内）

**现状**：一屏一题，`QuestionCard` 支持 Likert 五级、二选一、四选一图片；选择后自动前进，保留上一题；顶部 `ProgressBar` + `ProgressDots`（均以「已答数」为口径）；底部展示「当前维度」。

**问题**：
- P1：选项点击区高度未统一保证 ≥ 44px（需按 `QuestionCard` 实测）。
- P1：无「本题作答时长」记录，也无异常提示。
- P2：彩蛋按已答数触发，`seenEggs` 持久化，但无历史回看入口。
- P2：`ProgressDots` 在 120 题时点数密集，移动端可读性需实测。

**回归要求**：题目顺序 `SESSION_ORDER` 固定；自动前进逻辑不得跳过未答题。

### 4.4 结果页 `/result`

**现状**（`ResultClient`）：① 身份卡（插画、displayCode、名称、tagline、稀有度、关键词、分享/解锁/榜单按钮）→ ② 六维雷达 + 逐维读数（含后缀投票明细与摇摆说明）→ ③ 稀有度金字塔 → ④ 最像 3 型 / 最互补 3 型 → ⑤ **付费区**（优势 / 盲区 / 30 天成长路径 / 四张主题卡，未解锁时模糊 + 渐变 + 解锁卡）→ ⑥ 同族型 + 操作（生成海报 / 再测一次 / 回首页）+ 移动端固定分享条。

**问题**：
- **P0**：与任务书「六段结构」不一致。任务书要求：身份卡 → 六维雷达 → 人格分析 → 生活与工作 → 成长建议（3 方向 + 30 天计划 + 反思问题）→ 人格关系（最相似 3 + 最互补 3 + 差异对比 + 沟通建议）。当前「人格分析 / 生活与工作」被付费墙遮蔽且无独立段落；「成长建议」只有一段 `growth`，无 3 方向与反思问题；「人格关系」缺差异对比与沟通建议。
- **P0**：付费墙（Demo 本地解锁）把报告主体锁住。需产品决策：保留解锁但免费区补齐六段，或取消 Demo 付费墙（**不得擅自删除现有付费功能**）。
- **P1**：操作项缺「复制代码」「查看详情（跳型别页）」「直接下载 PNG」（下载仅在海报弹窗内）。
- **P1**：结果页强制 `<h1>` 为型别名，页面语义可接受；但 `displayCode` 含 `?` 时需确保读屏可读（当前为纯文本）。
- **P2**：固定底栏在 375px 下需实测是否遮挡内容（已有 `pb-28` 预留）。
- **P2**：页面含 `framer-motion` 动画，未见 `prefers-reduced-motion` 降级。

**回归要求**：`computeResult` 输出不变；`?` 摇摆展示规则不变；结果页不得上传/回传任何答题数据。

### 4.5 64 型列表（`/rank#groups` 与首页 `#types`）

**现状**：`/rank` 按七档分组列出 64 型，附档位索引、`MyRankBar`（本地结果名次）、四族群索引（每族群 4 个 A-O 基础型 + 提示三种变体）；首页 `TypeMatrix` 支持按阵营/基础型/代码/名称筛选。

**问题**：
- P1：`/rank` 无搜索框与族群筛选（只有锚点跳转）；任务书要求「档位、每档数量、排名、理论先验概率、每 1000 人换算、族群筛选、搜索、详情入口」。
- P1：`/rank` 未展示「理论先验概率」列，只展示 per1000 与档位。
- P2：「区分相对稀有等级 / 模型理论概率 / 真实样本分布」的说明文字已有（页面头部），但未做成可视化对照。
- P2：`MyRankBar` 依赖本地结果，无结果时行为需确认。

**回归要求**：64 型全部可访问；档位分组与顺序不变。

### 4.6 人格详情 `/type/[code]`

**现状**：64 条 SSG；头图（`aspect-[3/4]` + `hero-1200x1600`）→ 族群/稀有度徽标 → 代码/名称/tagline → 四字母逐词释义 → 中文引语 → 5 节长文（`TypeAnalysis`）→ 相近 3 / 互补 3（`MatchList`）→ 稀有度条 + 同档其他型 → 后缀变体 Tab → 书稿深度模块（`LifecycleCompass`、`MirrorMentorCard`、`NeuroStackCard`、`ChinaSliceCard`、`DeliberatePracticeCard`、`BookChapterCard`）→ 免责声明。

**问题**：
- P1：信息密度极大，移动端需 3000px+ 滚动；建议折叠/分层（Phase 3）。
- P1：`bookEnriched.json` 体积需关注（构建期读取，不进客户端；但详情页 props 可能很大）。
- P2：头图 `w-[180px]` 在 375px 下视觉占比偏小。
- P2：相近/互补只在 `idealResult` 上计算（型别页固定展示，非用户结果），语义与结果页不同，需文案区分。

**回归要求**：64 编码、`generateStaticParams`、canonical、OG 路径不得变。

### 4.7 稀有度榜 `/rank`

见 4.5。额外问题：`sitemap` 收录、`robots` 允许，均正确。

### 4.8 测评说明

**现状**：无独立 `/test/guide` 或说明页；说明内容散落在首页 `#start`、`#model`、`#six-dims` 与 FAQ。任务书页面清单中的「测评说明」目前以首页锚点体系承载。

**建议**：Phase 2 保持锚点入口，或补轻量说明区（不新增重路由）。

### 4.9 关于 `/about`

**现状**：静态文章，含「我们的视角 / 六维模型 / 四大人格族群 / 关于准确度 / 关于本书」。

**问题（P1，内容错误）**：六维列表写成 `AC 自我 / 协作 · 自主姿态`、`OH 有序 / 流动 · 变化偏好`，与 `data/schema.ts` 的 **AC 坚定 A / 审慎 C**、**OH 求新 O / 守成 H** 冲突（本报告成文时写作「内省 / 探索」，后经 P0 出版审校统一为「审慎 / 求新」），会直接误导用户。需在 Phase 1/2 修正文案（不改数据结构、不改人格名称数据）。

### 4.10 隐私政策 `/privacy`

**现状**：独立路由存在；需在 Phase 1 复核是否完整声明「本地优先、默认不上传答题数据、localStorage 用途、清除方式、第三方（GitHub Pages）」。当前未逐句核对正文。

### 4.11 免责声明 `/disclaimer`

**现状**：**无独立页面**；免责文案分散在 Footer、`DisclaimerBar`、结果页与关于页。

**问题（P0，页面清单缺口）**：任务书要求独立「免责声明」页；需新增 `/disclaimer` 并补 metadata、sitemap、Footer 链接。

---

## 5. 核心资产清单

### 5.1 题库与人格数据

| 资产 | 位置 | 规模 | 状态 |
|---|---|---|---|
| 题库 | `data/questions.zh-CN.ts` | 120 题（60 core + 60 extra），6 维 × 20 | 测试锁定 |
| 题目索引 | 同上 | `QUESTION_BY_ID` 120 条 | 唯一 |
| 排题顺序 | 同上 | `SESSION_ORDER` quick/full | 轮转交错 |
| 彩蛋文案 | 同上 | `EASTER_EGGS` 12 条 | 固定 |
| 基础型 | `data/types64.ts` | 16 条 `BASE_TYPES` | 完整 |
| 后缀 | 同上 | 4 条 `SUFFIX_MODIFIERS` | 完整 |
| 64 型 | 同上 | `ALL_TYPES` 64 条 / `TYPE_CODES` 64 | 唯一 |
| 书稿深度数据 | `data/bookEnriched.json` | 16 基础型 × 多章节 | 仅详情页 |

### 5.2 品牌资产（Phase 1 直接沿用，不重画 Logo）

`public/assets/brand/`：`logo-primary.svg`（924×240）、`logo-stacked.svg`、`logo-light/dark.svg`、`logo-mono-black/white.svg`、`logo-stacked-*`、`logo-icon*.svg`、`favicon.svg/16/32/48`、`icon-192/512/512-maskable`、`apple-touch-icon`、`brand-guidelines.md`。

`public/og/home.png`（1200×630）、`public/site.webmanifest`、`app/icon.svg`。

### 5.3 人物插画

- `public/assets/portraits-light/thumb-512/{code}-thumb-512.webp`（512×512，方图）→ 首页、结果页、卡片。
- `public/assets/portraits-light/hero-1200x1600/{code}-hero-1200x1600.webp`（1200×1600，竖图）→ 型别页、海报。
- `public/assets/portraits/*`（384 文件，196.7 MB）→ 疑似未引用，待扫描后处置。

### 5.4 图表与海报

| 资产 | 实现 | 规格 |
|---|---|---|
| 六维雷达 | `components/RadarChart.tsx` | 客户端/SSR 可用，带标签 |
| 稀有度金字塔 | `components/RarityPyramid.tsx` + `PyramidExplorer.tsx` | 七档可交互 |
| 分享海报 | `components/SharePoster.tsx` + `lib/poster.ts` | Canvas 2D **仅 1080×1440** |
| 二维码 | `qrcode`（动态 import） | 海报内绘制 |
| 原生分享 | `navigator.share`（files + url 双路径） | 有降级文案 |

### 5.5 本地存储

- 键 `p64:v1`，zustand persist `version: 2`，`migrateV1` 兼容旧扁平结构。
- 字段：`mode`、`answers{quick,full}`、`index{quick,full}`、`startedAt{quick,full}`、`finishedAt{quick,full}`、`seenEggs`、`unlocked`。
- 结果不入库，`computeResult()` 现算。

---

## 6. 高风险问题清单

| 级别 | 编号 | 问题 | 证据 | 影响 | 建议阶段 |
|---|---|---|---|---|---|
| **P0** | A1 | 结果页六段结构不完整，且付费墙遮住「人格分析 / 生活与工作 / 成长建议」 | `components/ResultClient.tsx` L299-L375 | 不满足任务书第五阶段与验收标准 | Phase 4（需产品决策） |
| **P0** | A2 | 海报仅 1080×1440，缺 1080×1350 / 1080×1080 / 1200×630 | `lib/poster.ts` L22-L23 | 不满足第八阶段三种尺寸 | Phase 5 |
| **P0** | A3 | 缺独立免责声明页 `/disclaimer` | `app/` 目录无该路由；sitemap 未收录 | 页面清单缺项、合规风险 | Phase 2 |
| **P0** | A4 | `public` 静态资源 368.6 MB，含疑似未引用 `portraits/` | 目录实测 | 构建/发布慢、仓库膨胀 | Phase 7（先扫描引用） |
| **P1** | B1 | 答题质量控制缺失：反向题一致性、时长异常提示、修改记录、提交前确认 | `components/TestClient.tsx` 无相关逻辑 | 不满足第四阶段 | Phase 3 |
| **P1** | B2 | 无「预计剩余时间」，只有剩余题数 | `TestClient.tsx` L213-L217 | 体验缺口 | Phase 3 |
| **P1** | B3 | `/about` 的 AC/OH 释义与数据契约冲突 | `app/about/page.tsx` L39-L40 vs `data/schema.ts` L83-L97 | 内容错误、误导用户 | Phase 1（文案修正） |
| **P1** | B4 | 64 型档案字段与任务书 20 字段有差距 | `data/types64.ts` `BaseType` | 不满足第六阶段字段清单 | Phase 4（新增可选字段 + 派生） |
| **P1** | B5 | 结果页缺「复制代码 / 查看详情 / 直接下载 PNG / 差异对比 / 沟通建议」 | `ResultClient.tsx` L388-L412 | 不满足第五阶段交互清单 | Phase 4 |
| **P1** | B6 | `/rank` 缺搜索与族群筛选、缺「理论先验概率」列 | `app/rank/page.tsx` | 不满足第七阶段 | Phase 5 |
| **P1** | B7 | sitemap 未收录 `/about`、`/privacy`（未来 `/disclaimer`）；全站无 JSON-LD 结构化数据 | `app/sitemap.ts` L12-L16 | SEO 缺口 | Phase 6 |
| **P1** | B8 | 移动端导航用 `<details>`，无 `aria-expanded` / 焦点管理；未见键盘快捷键 | `app/layout.tsx` L115-L137 | WCAG 2.2 AA 风险 | Phase 1 |
| **P2** | C1 | 重复代码：`GROUP_ICONS`、族群数组、稀有度读法在多页重复 | `app/page.tsx` L39、`app/rank/page.tsx` L19 | 维护成本 | Phase 1 |
| **P2** | C2 | 无 GitHub Actions 部署流水线 | 无 `.github/workflows` | 发布靠手工 | Phase 7 |
| **P2** | C3 | `framer-motion` 动画未见 `prefers-reduced-motion` 降级 | 全局 | A11y 风险 | Phase 1 |
| **P2** | C4 | 结果页固定底栏、首页双卡叠放在 375px 下需实测 | 布局代码 | 移动端风险 | Phase 6 |

---

## 7. 数据与算法审计结论

- `npm run test`：**6 个测试文件 / 146 条测试全部通过**（scoring 21、algorithm-regression 50、rarity 26、match 16、progress 10、data 23）。
- `npm run audit:personality`：**9 项通过 / 0 警告 / 0 错误**（16 基础型、64 亚型、稀有度 rank 1–64 唯一、per1000 全正、镜像导师双向一致、无旧域名）。
- 稀有度实测：概率范围 `0.006379 – 0.032443`，总和 `1.000000`；per1000 `6.4 – 32.4`；16 个并列组；七档实际数量 `2/6/8/10/12/12/14`。
- **未发现题目文本、选项极向、反向题数量、编码唯一性方面的缺陷**；算法层只记录观测，不做修改（详见 `docs/algorithm-spec.md` §6）。

---

## 8. 重复代码与技术债

| # | 重复点 | 位置 |
|---|---|---|
| 1 | `GROUP_ICONS` 图标映射 | `app/page.tsx`、`app/rank/page.tsx` |
| 2 | 族群顺序数组 `["analyst","diplomat","guardian","adventurer"]` | 首页、榜单、`lib/rarity.ts` 局部 |
| 3 | 稀有度说明文案（「档位是相对、per1000 是绝对」） | 首页 `#rarity`、`/rank` 头部、结果页 §3 |
| 4 | 型别卡片内「每 1000 人约 X」拼接 | `TypeCard`、`/rank` 族群列表、首页 |
| 5 | 海报/分享文案模板 | `lib/share.ts` 与 `SharePoster` 双入口 |

建议在 Phase 1 建立 `components/ui/` 与 `data/copy.ts` 收敛，但不得改变文案语义。

---

## 9. SEO / 性能 / 可访问性 / 移动端

| 维度 | 现状 | 缺口 |
|---|---|---|
| title/description/OG/Twitter | 根 layout 完整；型别页 `generateMetadata` + canonical | about/privacy 有基础 metadata；缺 `/disclaimer` |
| Sitemap | 68 条（1 + 2 + 64 + 1） | 缺 about/privacy/disclaimer |
| robots | 允许全站，屏蔽 `/result/` | 合理 |
| 结构化数据 | **未发现 JSON-LD** | 需补 WebSite / Organization / Article（型别页） |
| 服务端可见内容 | 首页/榜单/型别页为 SSG，正文在 HTML 中 | `/test`、`/result` 为客户端渲染（符合业务） |
| 图片 | 全部 `<img>`，512/1200 宽 webp | 无 `width/height` 缺失问题；但 368MB 体积 |
| 字体 | 未发现自定义字体加载 | 需确认是否使用系统字体栈 |
| A11y | 有 skip link、`aria-modal` 重置弹窗、`aria-hidden` 装饰、`min-h-44` 大部分按钮 | `<details>` 菜单、图表文字替代、`prefers-reduced-motion`、键盘快捷键 |
| 移动端 | `max-w-5xl` + `px-4`，多处 `sm:` 断点；结果页固定底栏 | 需按 375/390/430/768/1024/1440/1920 做溢出与点击区实测 |

---

## 10. 推荐实施顺序（Phase 0 → 7）

| 阶段 | 内容 | 关键交付 | 是否触碰算法/数据 |
|---|---|---|---|
| **0 ✅** | 审计 + 冻结基线 | `audit-report.md`、`functional-baseline.md`、`algorithm-spec.md` | 否 |
| **1** | 品牌 CI 与设计系统 | 设计令牌、按钮/卡片/导航、`prefers-reduced-motion`、复用方案一 Logo、四族群色 | 否（仅文案修正 B3） |
| **2** | 首页 IA 收口 + `/disclaimer` | 10 段核对、Footer 合规链接、sitemap 补页、JSON-LD 基础 | 否 |
| **3** | 测评体验 | 预计时间、暂停/退出说明、提交前确认、反向题一致性、时长异常提示、修改记录、键盘操作 | 不改题库/计分，仅新增「提示层」 |
| **4** | 结果报告六段 + 64 型档案字段补齐 | 六段结构、3 方向 + 30 天计划 + 反思问题、差异对比、沟通建议、复制代码/详情/下载 | 不改 `computeResult`；新增可选字段 + 派生 |
| **5** | 稀有度榜 + 分享海报 | 交互金字塔（筛选/搜索/概率说明）、三尺寸海报、独立海报组件 | 不改稀有度算法 |
| **6** | SEO / 性能 / A11y / 移动端 | JSON-LD、sitemap、Lighthouse、WCAG 2.2 AA、7 档宽度回归 | 否 |
| **7** | 测试与部署 | 算法/数据/页面/部署测试，Pages 子路径验收，静态资源清理，CI 流水线 | 否 |

---

## 11. 需要用户决策的事项（Phase 1 前）

1. **付费墙**：结果页「完整报告」Demo 解锁是否保留？（影响六段结构与免费区可见范围）
2. **静态资源**：`public/assets/portraits/`（196.7 MB）是否确认未引用后删除？（需先扫描）
3. **免责声明页**：是否新增独立 `/disclaimer`，还是把 Footer 免责区块扩为独立页？
4. **64 型 20 字段**：新增字段是否允许「构建期派生 + 可选字段」方式补齐（不改现有字段与编码）？
5. **海报三尺寸**：三种尺寸是否都要在结果页可切换下载，还是按场景自动选择？

---

## 12. 审计结论

- 工程底座健康：静态导出、子路径兼容、算法测试与数据审计齐备。
- 主要风险不在算法，而在**产品完整性**（结果页六段、答题质控、稀有度榜交互、海报尺寸、独立免责页）与**工程治理**（368 MB 静态资源、无 CI、SEO 结构化数据缺失）。
- 所有改造必须遵守 `docs/algorithm-spec.md` 的不可变清单；相同答题输入在升级前后必须产生相同 `code` / `displayCode` / `dims` / `rare` 输出。
