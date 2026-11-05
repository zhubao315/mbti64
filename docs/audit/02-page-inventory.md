# 02 · 页面功能审计

**基线 commit**：`a38bfc0`

---

## 路由清单（App Router）

| URL | 文件 | 类型 | SEO Metadata | 核心算法关联 |
|---|---|---|---|---|
| `/` | `app/page.tsx` | SSG | ✅ 根 layout | 无 |
| `/test` | `app/test/page.tsx` | 客户端 | ✅ | 调用 `SESSION_ORDER`, `scoreTest` |
| `/result` | `app/result/page.tsx` | 客户端 | - | 调用 `computeResult`, `scoreTest` |
| `/rank` | `app/rank/page.tsx` | SSG | ✅ | 调用 `priorProbability`, `TIER_DEFS` |
| `/type/[code]` | `app/type/[code]/page.tsx` | SSG 64 条 | ✅ generateMetadata | 调用 `ALL_TYPES`, `BASE_GROUPS` |
| 根 layout | `app/layout.tsx` | 全局 | ✅ 完整 OG + Twitter | 无 |

---

## 逐页审计

### 1. 首页 `/`

**信息架构（从上到下）**：

1. Hero 首屏 — Logo + 品牌口号 + 两个 CTA（开始测评 / 认识 64 型人格）
2. 测评说明区块（How it works anchor，`/#how-it-works`）
3. 快速 / 完整测评对比卡
4. 稀有度概览（榜单入口 + 示例）
5. 64 型人格目录缩略图 + 跳转
6. 两个人物插画卡（hero 级，512 正方图）
7. FAQ 折叠

**组件使用**：`BrandLogo`, `StartButtons`, `RarityPyramid`, `TypeCard` × N, `HomeHighlight` × 2, `Faq`, `DisclaimerBar`

**问题**：
- **P1** 两个 hero 插画容器用的是正方 `aspect-square` 装竖版 hero 3:4 图，虽 `object-fit:contain` 不裁切但视觉留白多
- **P2** 导航有 4 项（首页 / 64型人格 / 稀有榜 / 测评说明），任务书建议的「人格测评」独立入口缺失
- **P2** 首屏 Hero 文案较长，移动端被截断需要滚动（375px 视口测试）
- **P3** 品牌主色用 `bg-navy #0F2747` 但没有配套的二级 / 三级品牌色，色彩体系扁平

---

### 2. 测评入口 `/test`

**功能**：两种模式入口 + 答题进度恢复 + 彩蛋触发

**数据来源**：
- 模式：URL query `mode=quick` / `mode=full`
- 题库：`SESSION_ORDER[mode]`（quick 60 / full 120）
- 状态机：`useQuizStore`（zustand，`p64:v1`）

**组件使用**：`TestClient.tsx`（主容器） + 复用 `QuestionCard`, `RadarChart` 预览

**问题**：
- **P1** 入口按钮文案差异不够显著（"精简 60 题" vs "完整 120 题" 只有数字不同），缺少「适合初次探索」/「适合深入了解」这类场景说明
- **P2** 切换模式时保留已答题（合理）但缺少显式提示 "已答 X 题将保留"

---

### 3. 答题页面（嵌在 TestClient 内，非独立路由）

**功能**：一屏一题、五级 Likert + 二选一 binary + 四选 image 三种题型混合

**技术实现**：`TestClient.tsx` 内部 `QuestionCard`，当前题号来自 `SESSION_ORDER[mode][state.index]`

**问题**：
- **P0** 无显式"退出并保留进度"按钮，只能靠浏览器后退或切 tab 不答题（自动保存存在但用户不知道）
- **P1** 五级 Likert 的五个选项在手机上需要纵向排列（当前已做到 ✅），但 binary / image 选项尺寸偏小（手指点击区域 < 44px）
- **P1** 进度条显示完成百分比但不显示 "还剩 X 题 / 预计 X 分钟"，用户对剩余量无感
- **P2** 彩蛋触发时机在答题进行中（约 30 题附近），`seenEggs` 存 localStorage 但无对应 UI 反馈入口

---

### 4. 结果页 `/result`

**数据来源**：
- 结果 = `computeResult(state)` 实时计算
- 六维雷达 = `Dims` 组件渲染 `dims.*.percentA`
- 型别详情 = `ALL_TYPES[result.base]` + 后缀文案叠加
- 分享海报 = `SharePoster` 用 `html-to-image` 或 Canvas 生成

**组件使用**：`ResultClient`, `RadarChart`, `SharePoster`, `TypeShareButton`, `MirrorMentorCard`, `NeuroStackCard`, `DeliberatePracticeCard`, `ChinaSliceCard`, `BookChapterCard`

**问题**：
- **P1** 结果页已包含大量深度组件（人格镜像、神经堆叠、刻意练习、切片漫画、章节卡），但加载是串行的，首屏 LCP 受影响——可懒加载
- **P1** 分享海报 DOM 结构复杂 + 中文字体渲染，手机端生成失败率偏高（`SharePoster.tsx` L18 有降级 try/catch 但兜底不够明显）
- **P2** "付费完整报告 Demo" 提示在 footer 里但结果页中间有 `PaywallModal` 可能打断 flow

---

### 5. 稀有度榜单 `/rank`

**数据来源**：
- 先验概率 = `priorProbability(code)`（六维独立概率相乘）
- 分档 = `TIER_DEFS`（7 档，从万里挑一到无处不在）
- 排序 = 理论先验升序（先验越小越稀有）

**组件使用**：`TypeRarityBar`, `RarityPyramid`

**问题**：
- **P0 · 红线** 任务书第九章明确指出：`priorProbability` 使用各维概率（EI=0.55, SN=0.65, TF=0.5, JP=0.55, AC=0.6, OH=0.45）做六维独立相乘，结果约在 0.00000016 – 0.0007 范围，但档位标签用的是「万分之一」「千分之一」「百分之一」——**理论数值和文字表述可能不对齐**。Phase 9 必须先审计先验数值再校准文字。
- **P1** 榜单默认先验排序，点击「阵营」标签后过滤是纯客户端实现，64 条性能没问题但交互上缺少「全部 → 阵营 → 基础型 → 完整型」逐级下钻

---

### 6. 型别详情 `/type/[code]`（64 条 SSG）

**数据来源**：
- 型别定义 = `ALL_TYPES[result.base]`
- 后缀修饰 = `SUFFIX_MODIFIERS[result.A or C][result.O or H]`
- 相近 / 互补 = `getMatches(code, strategy)`
- 主视觉图 = `assets/portraits-light/hero-1200x1600/{code}-hero-1200x1600.webp`
- 头像缩略 = `assets/portraits-light/thumb-512/{code}-thumb-512.webp`

**组件使用**：`TypeAnalysis`, `TypeVariantTabs`, `TypeQuote`, `TypeLetterRow`, `TypeRarityBar`, `MatchList`

**问题**：
- **P1** 16 种基础型 + 4 种后缀 = 64 条 `generateStaticParams` 已正确 SSG ✅
- **P1** 详情页信息密度极大（主视觉 + 代码 + 6 维雷达 + 5 节长文 + 相近 + 互补 + 稀有度 + 变体 Tab + 引用 + 章节卡），移动端单页可能需要 3000+ px 滚动
- **P2** 主视觉图容器 `aspect-[3/4] w-[180px]` 在 375px 视口下被压缩到 ~130px，视觉占比偏低

---

## 导航信息架构（现状 vs 任务书建议）

| 现状（`app/layout.tsx` L58-L63） | 任务书建议（L609-L614） | 差距 |
|---|---|---|
| 首页 ✅ | 首页 | - |
| 64 型人格（`/rank#groups`，一个链接） | 64型人格 | 现状 OK |
| 稀有榜（`/rank`） | 稀有度榜 | 现状 OK |
| 测评说明（`/#how-it-works`） | 关于（独立页） | 缺独立 `/about` 页 |
| 开始测评（CTA 按钮 ✅） | 人格测评（独立导航项） | 现状是 CTA 按钮，任务书建议同时导航栏也显式列出 |
| - | 关于 | 缺 |

---

## 关键功能清单（受 2.1 节保护原则保护，禁止改动）

| # | 功能 | 位置 |
|---|---|---|
| 1 | 60 题题库（`CORE_QUESTIONS`） | `data/questions.zh-CN.ts` |
| 2 | 120 题题库（`ALL_QUESTIONS` = core + extra 每维各 +10） | 同上 |
| 3 | Likert / binary / image 三种题型 | `data/schema.ts` `ItemType` |
| 4 | 六维计分（Likert 百分比 + 后缀二选一 ≥2/3 投票） | `lib/scoring.ts` `scoreDimension` / `voteThreshold` |
| 5 | 摇摆型判定（票数 < 2/3 → displayCode 用 `?`） | `lib/scoring.ts` L125-L138 |
| 6 | 64 型编码生成（base-AC-OH） | `lib/scoring.ts` L169-L199 |
| 7 | 先验概率计算（六维独立相乘） | `lib/rarity.ts` `priorProbability` |
| 8 | localStorage 答题进度保存（键 `p64:v1`，version=1） | `lib/store.ts` + `lib/store-key.ts` |
| 9 | 结果现算（不入库，避免陈旧） | `lib/store.ts` L114-L116 |
| 10 | 64 型文案与后缀修饰 | `data/types64.ts` + `SUFFIX_MODIFIERS` |
| 11 | 四阵营归属映射（BASE_GROUPS） | `lib/scoring.ts` L16-L33 |
| 12 | 稀有度分档定义（TIER_DEFS） | `lib/rarity.ts` |

**Phase 1–6 任何改动不得修改上述 12 项的输入 / 输出 / 语义。**
