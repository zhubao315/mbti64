# MBTI64 品牌 CI 全面升级 — 实施规格（Spec）

项目：MBTI64 · 64 型人格探索平台
目录：`d:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn`
性质：Next.js `output: "export"` 静态站，部署于 GitHub Pages 子路径 `/mbti64/`

---

## 1. 目标与边界

### 1.1 目标

在不改动测评业务逻辑的前提下，把现有「人格测试网页」升级为具有统一品牌识别度的产品：Logo、色彩、字体、组件、首页、族群体系、型别卡、答题流程、结果报告、分享海报、SEO 资源全部落在同一套 CI 规范内。

核心品牌语：

- `64 PERSONALITIES · ONE UNIQUE YOU`
- 中文：`64 型人格 · 自我认知探索平台`
- 英文：`64 Personalities · Discover Yourself`

### 1.2 不改动（硬约束）

- `data/questions.ts` 题目内容、题量、反向计分
- `lib/scoring.ts` 计分算法
- `lib/rarity.ts` 的概率、分桶、排名算法（仅允许改档位的展示色/文案字段值，不得改 `priorProbability`、`assignTiers`、`buildRanked`、`blendStats`）
- `data/types64.ts` 64 型名称/代码/关键词
- `lib/store.ts` localStorage schema 与 key
- `data/schema.ts` 维度定义与 64 型编码规则
- `public/assets/portraits/*` 全部角色插画（只引用，不重绘、不覆盖）
- 现有测试 `tests/*` 的断言逻辑

### 1.3 不新增

- 不新增第三方依赖（不引入 UI 库、字体包、图标包；沿用已装的 `@phosphor-icons/react` 与 `framer-motion`）
- 不新增后端/API 路由
- 不新增页面路由

---

## 2. 现状结论（已核实）

| 项 | 现状 | 影响 |
|---|---|---|
| `tailwind.config.ts` | 仍是 `paper/wash/line/ink` + 旧族群色（`#88619D/#33A474/#4A8FB5/#E4AE3A`），残留 `violet/avocado/coral/cream/sand/glass/glow` | 需整体重估 token 值并清理遗留 |
| `app/globals.css` | 引入 Google Fonts `Noto Sans SC` + jsDelivr `LXGW WenKai`；`.text-gradient`、`.progress-band`、`.glass` 等旧装饰 | 需移除外部字体依赖与旧装饰 |
| `app/layout.tsx` | Header 仅「稀有榜 + 开始测评」，Logo 是墨色方块「64」；Footer 只有免责声明 | 需重建 Header/Footer，统一品牌 |
| `app/page.tsx` | Hero 右侧是两张旋转角色卡；数据区/六维/族群/榜单结构已存在 | 保留结构，按 CI 重排视觉 |
| `app/rank/page.tsx` | 使用 `text-violet-deep`、`bg-white/60`、`glass`、族群 emoji、`tier.badge` emoji | 需替换为 navy + 中性档位标签 |
| `data/schema.ts` | `GROUP_META` 仍是旧四色 + emoji | 需改为新四色 + 深色文字版 + 去 emoji |
| `lib/rarity.ts` | 7 档使用彩虹色 + emoji `badge` | 需改为 navy/slate 中性梯度 + 纯文字档位名 |
| `components/TypeCard.tsx` | 族群色仅作 2px 圆点，分享型别卡结构可保留 | 升级为族群 chip + 中性稀有度标签 |
| `components/ResultClient.tsx` | 残留 `violet/coral/avocado`、emoji、模糊色块、渐变锁区 | 需整体换肤并补品牌头部 |
| `components/QuestionCard.tsx` | 硬编码 `#7C5CFF` 与 violet 类 | 需改为 navy 选中态 |
| `components/ProgressBar.tsx` | violet 渐变 + `progress-band` 闪光 | 需改为 navy 实色进度 |
| `components/SharePoster.tsx` + `lib/poster.ts` | 彩虹渐变背景 + 色块 + violet 雷达 | 需按新海报规范重绘（Canvas） |
| `app/icon.svg` | 旧渐变图标 | 替换为四象限几何图标 |
| `lib/site.ts` | `SITE_NAME = "64 型人格稀有度测评"` | 改为 `MBTI64` 品牌 |
| 品牌资源 | `public/assets/brand/` 不存在，仅有 `public/logo/MBTI64品牌视觉规范展示板-1.png` | 需新建全套 SVG/PNG |

---

## 3. 品牌 Design Tokens（唯一来源）

### 3.1 品牌基础色

| Token | 值 | 用途 |
|---|---|---|
| `--brand-navy` / `navy.DEFAULT` | `#0F2747` | 字标、H1、导航文字、主按钮、页脚品牌区 |
| `navy.deep` | `#0A1B33` | 主按钮 hover |
| `navy.soft` | `#E8EEF5` | navy 淡底 |
| `brand.background` / `surface-page` | `#F8FAFC` | 页面底色 |
| `brand.surface` / `surface-card` | `#FFFFFF` | 卡片 |
| `brand.border` / `border-default` | `#E7ECF2` | 卡片/导航边框 |
| `border-strong` | `#CBD5E1` | 输入框/次按钮边框 |
| `surface-hover` | `#F1F5F9` | hover 背景 |

> 页面背景保持浅色，不做大面积深色主题；深色仅用于页脚品牌区与个别 CTA 区。

### 3.2 四大人格族群色

| 族群 | key | 主色 `color` | 深色文字 `text` | 淡底 `soft` | 浅底 `light` |
|---|---|---|---|---|---|
| 分析师 | `analyst` | `#7B61FF` | `#5A3FD1` | `#E5DEFF` | `#F1EDFF` |
| 外交家 | `diplomat` | `#4CAF6B` | `#24803F` | `#D5EFDE` | `#EAF7EE` |
| 守护者 | `guardian` | `#4A90E2` | `#1E6FB8` | `#D6E8FB` | `#EAF3FD` |
| 冒险家 | `adventurer` | `#F6C343` | `#8A6200` | `#FBE9B3` | `#FFF7DF` |

规则：

- `color` 只用于 Logo、图形填充、色点、雷达/图表填充；**不用于正文文字**。
- 白底文字一律用 `text` 变体（对比度 ≥ 4.5:1）。
- 中文名保持现有：分析师 / 外交家 / 守护者 / 冒险家。
- 现有英文：`Analyst / Diplomat / Guardian / Adventurer`；品牌展示层可用复数 `ANALYSTS / DIPLOMATS / GUARDIANS / ADVENTURERS`。
- 删除 `GROUP_META.emoji` 字段与所有调用；改用 Phosphor 线性图标（`Brain / Leaf / ShieldCheck / Compass`）。

### 3.3 中性色 / 语义色

| Token | 值 |
|---|---|
| `text-primary` / `ink.DEFAULT` | `#172B45` |
| `text-secondary` / `ink.soft` | `#64748B` |
| `text-muted` / `ink.mute` | `#94A3B8` |
| `success` | `#24803F` |
| `warning` | `#8A6200` |
| `error` | `#B42318` |
| `info` | `#1E6FB8` |
| `disabled` | `#94A3B8` |

语义色不得与族群色混用。

### 3.4 稀有度档位（独立中性体系）

改为 navy → slate 的 7 级中性梯度，不使用族群色、不使用 emoji：

| rank | key | name | color | text | soft | badge |
|---|---|---|---|---|---|---|
| 0 | oneInTenThousand | 万里挑一 | `#0F2747` | `#0F2747` | `#E8EEF5` | `万里挑一` |
| 1 | extremelyRare | 极稀有 | `#1E3A5F` | `#1E3A5F` | `#EBF0F6` | `极稀有` |
| 2 | rare | 稀有 | `#33507A` | `#33507A` | `#EEF2F7` | `稀有` |
| 3 | oneInThousand | 千分之一 | `#4A678F` | `#3D5A80` | `#F1F5F9` | `千分之一` |
| 4 | oneInHundred | 百分之一 | `#64748B` | `#475569` | `#F4F6F9` | `百分之一` |
| 5 | common | 常见型 | `#8291A5` | `#64748B` | `#F7F9FB` | `常见型` |
| 6 | everywhere | 无处不在 | `#A3B0C2` | `#64748B` | `#FAFBFC` | `无处不在` |

`rank` 数值、`TIER_BUCKETS`、算法保持不变。

### 3.5 字体与排版

字体栈（Tailwind `fontFamily.sans` 与 `body`）：

```css
Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif
```

- 删除 `.quote` 的 `LXGW WenKai`；`TypeQuote` 改用系统衬线回退 `Georgia, "Songti SC", serif`，避免外部字体请求。
- 删除 `@import` 两个外链字体（离线构建/首屏稳定）。
- 字号层级（Tailwind 直接用任意值类，不新增复杂 scale）：
  - H1 `32–44px`（移动端 `30–36px`）
  - H2 `24–32px`
  - 区块标题 `20–24px`
  - 卡片标题 `16–20px`
  - 正文 `14–16px`
  - 辅助 `12–13px`
  - 数据指标 `28–40px`（`.num-hero` 保留 `tabular-nums`）
- 英文大写标签字间距 `0.14–0.18em`。

### 3.6 圆角 / 阴影 / 动效

- 卡片圆角 `12px`；大容器 `16px`；按钮 `10px`；标签胶囊 `999px`（仅标签/筛选）。
- 阴影仅 `shadow-card: 0 1px 2px rgba(15,39,71,.06)` 与 `shadow-lift: 0 12px 28px -14px rgba(15,39,71,.18)`。
- 动效：入场 220ms；hover `translateY(-2px)`；禁止 breathe/float/shimmer、玻璃拟态、光晕。

---

## 4. 品牌资源（新建）

目录：`public/assets/brand/`

| 文件 | 内容 | 技术要求 |
|---|---|---|
| `logo-icon.svg` | 四象限几何符号：2×2 四个圆角方块，对角同色；紫左上、绿右上、蓝左下、黄右下（pinwheel 外圆角） | 纯 `<path>/<rect>`，viewBox `0 0 64 64`，透明底，24px 可辨 |
| `logo-primary.svg` | 图标 + 右侧 navy `MBTI64` 字标（字标转路径或系统字体+`font-weight:800`，最终以路径绘制保证一致） | viewBox `0 0 240 64` |
| `logo-stacked.svg` | 图标上、字标下 | viewBox `0 0 160 128` |
| `logo-light.svg` | 彩色图标 + 白色字标 | 深底用 |
| `logo-dark.svg` | 全 navy（图标 + 字标）单色 | 浅底单色 |
| `logo-mono-black.svg` | 全黑单色 | 印刷/水印 |
| `logo-mono-white.svg` | 全白单色 | 深底水印 |
| `favicon.svg` | 仅四象限图标，16–48px 可读 | 透明底 |
| `favicon-16.png` `favicon-32.png` `favicon-48.png` | 由同一几何直接绘制 | Pillow 生成，非截图 |
| `apple-touch-icon.png` | 180×180，白/浅底 + 四象限 | Pillow |
| `icon-192.png` `icon-512.png` | manifest 用 | Pillow |
| `brand-guidelines.md` | 规范文档（见第 11 节） | — |

Logo 几何规范（四个方块，间距 2，外圆角 6，中心聚合）：

- 画布 `64×64`，四块各 `28×28`，位置 `(2,2)/(34,2)/(2,34)/(34,34)`，仅外角 6px 圆角（形成风车感）。
- 颜色严格使用 3.2 的 `color`，不得更改。

`app/icon.svg` 替换为同款 favicon 内容；`app/apple-icon.png` 指向 180px 资源（或 metadata `icons.apple`）。

---

## 5. 组件层改造（文件级）

### 5.1 新建 `components/BrandLogo.tsx`

Props：

```ts
type BrandLogoProps = {
  variant?: "primary" | "icon" | "stacked";
  tone?: "color" | "light" | "dark" | "mono";
  size?: number;        // 图标像素
  withWordmark?: boolean;
  className?: string;
  priority?: boolean;
};
```

实现：内联 SVG（不读外部文件），四象限 + `MBTI64` 字标；`aria-label="MBTI64"`；`next/image` 不用于 SVG。

### 5.2 `app/layout.tsx`

- Header：`sticky`，白底 95% + `border-b border-brand-border`，高度约 60px。
  - 左：`BrandLogo variant="primary"`（图标 + `MBTI64`，不再重复「64 型人格」）。
  - 右（桌面）：首页 `/`、64 型人格 `/rank`、稀有榜 `/rank`、测评说明 `/#how-it-works` + 主按钮「开始测评」。
  - 移动端：`<details>` 折叠菜单（无 JS），按钮为汉堡图标（Phosphor `List`），展开后纵向链接，点击即关。
- Footer：浅底 `surface-page` 上分区；左品牌区（Logo + 中文/英文描述 + 标语），中导航，右免责声明；底部版权 `© 2026 MBTI64`。保留完整免责声明原文。
- Metadata：`SITE_NAME` 改为 `MBTI64`；title `MBTI64 · 64 Personalities`；description 见 8.1；`icons`、`manifest`、`appleWebApp`；`themeColor: #0F2747`（`colorScheme: light`）。
- 保留「跳到主要内容」无障碍链接。

### 5.3 `components/TypeCard.tsx`

- 顶部左侧：族群 chip（`soft` 底 + `text` 色 + 族群中文名）+ `font-mono` 代码（navy）。
- 右侧：`RarityBadge`（中性）。
- 标题 16–17px navy；tagline 12.5px secondary；关键词中性 chip；底部「每 1000 人约 X 人 · 稀有度第 N 位」。
- 卡片 hover 仅 `translateY(-2px)` + 边框略深；不再用 `ring-ink`，highlight 改 `ring-2 ring-[--brand-navy]`。

### 5.4 `components/RarityBadge.tsx`

- 不再用 `rgba(41,37,36,α)`；改用 `tier.color` 色点（深浅表达档次）+ 白底 + `border-brand-border`，文字 `tier.text`。
- 保留 `sm/md/lg`，保留 `showEmoji?` 参数位（忽略）。

### 5.5 `components/ProgressBar.tsx`

- 轨道 `#E7ECF2`，进度 `bg-brand-navy` 实色，圆角 999；右侧百分比 `tabular-nums`。删除 `progress-band`。

### 5.6 `components/QuestionCard.tsx`

- 删除硬编码 `#7C5CFF`、`violet-*`、emoji 装饰（`🧭`）。
- 选中态：`border-brand-navy + bg-navy.soft + 文本 navy`，勾选图标 `CheckCircle`；未选中白底 + `border-default`，hover `surface-hover`。
- Likert 五档保持原间距与触摸区（≥44px）。
- `SCENE_META.emoji` 在 UI 中改为文字场景标签（保留数据结构不动，避免改数据契约）。

### 5.7 `components/RadarChart.tsx`

- 移除 `glow` 滤镜与渐变填充；网格 `#E7ECF2`，轴 `#CBD5E1`，数据线 navy `#0F2747`、填充 `rgba(15,39,71,.12)`；可选单族群强调色只在结果页外圈色带使用，不进雷达。
- 保留 `pathLength=1` 描线动画 800ms。

### 5.8 `components/SharePoster.tsx` + `lib/poster.ts`

海报重绘（Canvas 1080×1440，2× 导出）：

- 背景 `#F8FAFC`，白色内容卡，顶部 6px 族群色条（单色，不用彩虹）。
- 左上：四象限 Logo（Canvas 绘制）+ `MBTI64` navy 字标。
- 主信息：代码 `INFJ-A-O`（navy，mono）、中文名（28–34px）、族群 chip（soft 底 + text 色）、稀有度中性标签。
- 一句话 tagline，六维 6 条横向 bar（navy 轨道 + 族群色填充；或统一 navy，取其一：**统一 navy**，族群色只用于顶部条与 chip）。
- 底部：`zhubao315.github.io/mbti64` + 二维码（现有 QR 逻辑保留）+ `64 PERSONALITIES · ONE UNIQUE YOU`。
- 删除：彩虹渐变背景、模糊圆斑、emoji、`#7C5CFF` 雷达。
- 保留：下载/分享调用、尺寸、二维码定位、文件名逻辑。

### 5.9 其余组件

| 文件 | 改动 |
|---|---|
| `MyRankBar.tsx` | violet → navy；卡面中性 |
| `PyramidExplorer.tsx` / `RarityPyramid.tsx` | 层级用 `tier.color` 中性梯度；当前档 navy 高亮 + 描边；文案纯文字 |
| `TeachingCarousel.tsx` | 维度卡统一白卡 + navy 图标；不引入族群色 |
| `StartButtons.tsx` / `HomeCtas.tsx` | 主 CTA navy 实心，次 CTA 白底 navy 边 |
| `PaywallModal.tsx` | 锁区 navy；去渐变 |
| `MatchList.tsx` | 相近/互补卡用族群 chip（文字+色点） |
| `Faq.tsx` | 中性分隔线，标题 navy |
| `InterestCards.tsx` | 中性卡 + navy 标题 |
| `DisclaimerBar.tsx` | 浅灰底 + secondary 文字 |
| `CharacterArt.tsx` | 结果页改用人格肖像 `/assets/portraits/{code}.png`；若组件仍被引用则仅保留为回退，不改其内部渐变 |
| `Confetti.tsx` | 色板改为 4 族群色 + navy，降低密度 |
| `TypeQuote.tsx` | 引用块改 navy 左边线 + 系统衬线 |
| `TypeShareButton` / `ShareLinkButton` | 按钮统一 secondary/primary 规范 |
| `EasterEgg.tsx` / `ResumeBanner.tsx` / `HomeHighlight.tsx` | 清理遗留色类，保持功能 |

---

## 6. 页面改造

### 6.1 首页 `app/page.tsx`

保留现有数据与交互组件，按以下顺序重排：

1. Hero：左 eyebrow `64 PERSONALITIES`、H1 原文「你的性格，在 64 型里有多稀有？」、介绍「六维倾向 × 自我姿态 × 变化偏好，探索独特的自己。」、双 CTA（120 题 / 60 题）、信任三条、免责声明。
2. Hero 右：品牌面板——浅底 `#F8FAFC` 圆角 16，中央 `BrandLogo variant="stacked"`，背景 8×8 的 64 点矩阵（navy 5% 透明度），下方四族群图例（色点 + 中英名）。不使用旋转卡片、不使用彩虹渐变。
3. 数据指标：64 / 120 / 6 / 7 四卡，navy 大数字 + secondary 说明；图标 navy 线性；仅图标底色可用族群 `light` 各一。
4. 结果预览：型别卡 + 雷达 + 金字塔三卡，统一白卡。
5. 六维：`id="how-it-works"`，标题「先花 1 分钟，看懂你被测什么」，`TeachingCarousel` 保持。
6. 稀有度金字塔：标题 + `PyramidExplorer`，档位中性。
7. 最稀有 6 型：`TypeCard` 网格。
8. 四大族群：2×2 大卡，`soft` 底 + 顶部 4px `color` 条 + 英文大写 + 中文 + 介绍 + `16 种基础人格` + 「查看全部」链接；hover 上浮 2px、边框变族群 `color` 30%。
9. FAQ、深色 CTA（navy 底 + 白字 + 白/透明按钮）、DisclaimerBar。

文案：删除「16Personalities」「对标」类表述；统一使用 `MBTI64`。

### 6.2 榜单 `app/rank/page.tsx`

- eyebrow `RARITY LEADERBOARD` 改 navy + 字距。
- 档位索引：白底 + `border-default` + 文字 navy；hover `surface-hover`；显示纯文字档位名（不再 emoji）。
- 档位标题：`tier.color` 只用于小色点/左侧细条，文字 navy。
- 族群索引四卡：`soft` 底 + Phosphor 图标 + 中英名 + 16 基础型链接，去掉 `glass` 与 emoji、去掉 `text-violet-deep`。

### 6.3 型别详情 `app/type/[code]/page.tsx`

- 顶部横条：`BrandLogo` 小号 + 返回链接。
- 型别头：`soft` 族群淡底区 + 族群 chip + 代码（mono navy）+ 中文名 + tagline + 稀有度中性标签 + 肖像图（保留现有图）。
- 正文卡：白卡、navy 小标题；引用块按 5.9。
- 保留全部 SEO metadata 与变体 tabs。

### 6.4 答题页 `app/test/page.tsx` + `TestClient.tsx`

- 顶部：小号 `BrandLogo variant="icon"` + 模式/题号。
- 进度：navy 实色，无闪光。
- 选项：选中 navy（`border-brand-navy` + `bg-navy.soft` + 白色勾选圆），不随族群变色。
- 保留：60/120 模式切换、localStorage 续答、键盘/触摸交互、`stamp` 反馈（降低旋转角度）。
- 重置按钮改 `text-secondary`，危险操作才用 `error`。

### 6.5 结果页 `app/result/page.tsx` + `ResultClient.tsx`

- 顶部品牌头：`BrandLogo` + 代码 + 中文名 + 族群 chip（`soft` 底 + `text` 色）；顶部 4px 族群色条。
- 主视觉：使用 `/assets/portraits/{code}.png`（替代 CharacterArt）。
- 三屏免费区：型别卡 → 六维雷达（navy）→ 稀有度金字塔（中性）。
- 付费区：优势 / 盲区 / 成长路径 / 五张主题卡；锁区改 navy 卡 + 白字，去渐变/模糊。
- 相近 & 互补：`MatchList` 用族群 chip。
- 底部：分享按钮（打开 `SharePoster`）、重测、回到首页。
- 保留所有计算、`result.complete` 判断、Paywall Demo 解锁逻辑。

### 6.6 分享海报

见 5.8；不改调用入口。

---

## 7. 响应式与无障碍

断点验证：1440 / 1280 / 1024 / 768 / 390 / 375 / 360。

- 所有 `grid` 保持 `grid-auto-columns: minmax(0,1fr)`，不得横向溢出。
- Header 在 `<768` 折叠；Logo 最小高度 28px。
- 卡片列数：首页指标 `2`（移动）→ `4`（sm）；族群 `1` → `2`（sm）；型别列表 `1` → `2`（sm）→ `3`（lg）。
- 按钮最小点击区 44×44；文字对比度 WCAG AA。
- 族群信息不得只靠颜色：必须同时有中文名 + 图标。
- `prefers-reduced-motion` 保留现有全局关闭规则。
- 焦点环改为 navy `2.5px`。

---

## 8. SEO / 站点资源

### 8.1 `lib/site.ts`

```ts
SITE_NAME = "MBTI64"
SITE_NAME_EN = "64 Personalities"
SITE_DESC = "MBTI64 用六维倾向 × 自我姿态 × 变化偏好，组合出 64 型人格。120 道本土化情景题，给出六维雷达、稀有度排名与分享海报。娱乐与自我探索为目的，不构成心理咨询或诊断。"
```

保留 `SITE_ORIGIN / BASE_PATH / withBasePath / absoluteUrl / METADATA_BASE` 不变。

### 8.2 Metadata

- `title.default = "MBTI64 · 64 Personalities"`，template `%s · MBTI64`
- `openGraph.title = "MBTI64 · 64 Personalities"`，`images = /og/home.png`（重制 1200×630）
- `icons`: favicon.svg + 16/32/48 + apple 180 + 192/512；`manifest = /site.webmanifest`
- `themeColor #0F2747`
- 所有 Logo `<Image>`/SVG 补 `aria-label`/`alt`
- `public/site.webmanifest`：`name "MBTI64"`、`short_name "MBTI64"`、`theme_color "#0F2747"`、`background_color "#F8FAFC"`、icons 192/512

### 8.3 OG 图重制

`public/og/home.png` 用 Pillow 重绘：`#F8FAFC` 底、四象限 Logo、`MBTI64` 字标、主标题「你的性格，在 64 型里有多稀有？」、四族群色点 + 中文名、`zhubao315.github.io/mbti64`。字体 `C:\Windows\Fonts\msyh.ttc`。型别 OG 图不动。

---

## 9. 文件清单（预期改动）

新建：

- `components/BrandLogo.tsx`
- `public/assets/brand/*`（约 14 个资源）
- `public/site.webmanifest`
- `docs/specs/mbti64-brand-ci/spec.md`、`tasks.md`
- `public/assets/brand/brand-guidelines.md`
- `tools/gen_brand_assets.py`（一次性生成脚本，产物入库；脚本保留便于重生成）

修改：

- `tailwind.config.ts`、`app/globals.css`
- `lib/site.ts`、`lib/poster.ts`
- `data/schema.ts`（`GROUP_META` 值）
- `lib/rarity.ts`（仅档位展示字段）
- `app/layout.tsx`、`app/page.tsx`、`app/rank/page.tsx`、`app/type/[code]/page.tsx`、`app/result/page.tsx`、`app/test/page.tsx`、`app/icon.svg`
- `components/TypeCard.tsx`、`RarityBadge.tsx`、`ProgressBar.tsx`、`QuestionCard.tsx`、`RadarChart.tsx`、`ResultClient.tsx`、`TestClient.tsx`、`SharePoster.tsx`、`MyRankBar.tsx`、`RarityPyramid.tsx`、`PyramidExplorer.tsx`、`StartButtons.tsx`、`HomeCtas.tsx`、`PaywallModal.tsx`、`MatchList.tsx`、`Faq.tsx`、`InterestCards.tsx`、`DisclaimerBar.tsx`、`Confetti.tsx`、`TypeQuote.tsx`、`TypeShareButton.tsx`、`ShareLinkButton.tsx`、`EasterEgg.tsx`、`ResumeBanner.tsx`、`HomeHighlight.tsx`
- `public/og/home.png`（重制）

---

## 10. 验证与验收

### 10.1 自动化

```
npm run typecheck
npm run test
npm run build
```

要求：全部通过；构建产物 `out/` 正常生成；`.next` 无字体外链告警（或已确认可离线）。

### 10.2 遗留检查

- `Grep` 确认 `violet|avocado|coral|cream|sand|glass|glow|text-gradient|progress-band|LXGW|💎|👑|🌿|🔆|🍊|🌊|🧠|🌱|🛡|🔥` 在 `app/ components/ lib/ data/` 中无残留（数据文件 emoji 字段如保留需确认不渲染）。
- 确认 `GROUP_META` 仅一个来源，无组件内硬编码 `#88619D` 等旧值。
- 确认 `public/assets/portraits` 未被修改（文件数与体积不变）。

### 10.3 功能回归清单

| 项 | 验证方式 |
|---|---|
| 首页 → 开始测评 | 点击可达 `/test` |
| 60 题模式 | 可进入、题量 60、可完成 |
| 120 题模式 | 可进入、题量 120、可完成 |
| 答题进度保存 | 刷新后 `ResumeBanner` 出现，可继续 |
| 结果计算 | 完成答题后 `/result` 显示正确代码 |
| 六维雷达 | 6 轴、数值与结果一致、动画正常 |
| 稀有度 | 档位/名次/每 1000 人与 `PRIOR_TABLE` 一致 |
| 族群映射 | 任意型别 chip 与 `types64` group 一致 |
| 分享海报 | 可打开、可下载 PNG、二维码指向正确 URL |
| localStorage 兼容 | 旧 key 数据可读取（`useQuizStore` 未改） |
| 导航 | 首页/64 型人格/稀有榜/测评说明 全部可达 |
| 子路径部署 | `NEXT_PUBLIC_BASE_PATH=/mbti64` 构建后资源路径无 `/mbti64/mbti64` |
| 横向溢出 | 360/375/390 无 `scrollWidth > clientWidth` |

### 10.4 视觉验收

- 任意页面均出现 `MBTI64` 品牌字标；Logo 24px 可辨。
- 四色只出现在族群识别场景；稀有度全中性。
- 结果页、答题页、分享海报三处视觉语言一致。
- 首页无大面积彩虹渐变、无玻璃拟态、无 3D、无 emoji 核心图标。

---

## 11. 品牌规范文档 `public/assets/brand/brand-guidelines.md`

必含：

1. 品牌定位与标语
2. Logo 结构与最小尺寸、安全边距、7 种变体使用场景、禁止项
3. 四族群色 + 中性色 + 语义色表格（含 `color/text/soft` 与对比度说明）
4. 字体栈与字号层级
5. 圆角/阴影/间距/动效
6. 组件规范（按钮三型、卡片、标签分类、图标）
7. 页面布局规则（Hero、Header、指标、族群、型别卡、结果页、答题页、海报）
8. 无障碍与响应式
9. 新增页面时的 CI 检查清单

---

## 12. 需用户确认的决策点

| # | 决策 | 方案 |
|---|---|---|
| D1 | 是否保留旧 token 名（`paper/wash/line/ink`）重估，而非全站重命名 | **保留**，降低回归风险；新增 `navy/brand/surface/*` |
| D2 | 是否移除 Google Fonts / LXGW 外链 | **移除**，用系统栈；`quote` 用系统衬线 |
| D3 | 结果页雷达颜色 | **统一 navy**，族群色仅作顶部条与 chip（避免四色入图） |
| D4 | 答题选中态 | **navy**，不随族群变色 |
| D5 | 首页 Hero 右侧 | **品牌面板（Logo + 64 点矩阵 + 四色图例）**，移除旋转角色卡 |
| D6 | 稀有度配色 | **中性 navy→slate**，完全脱离族群色 |
| D7 | 海报六维条 | **统一 navy**，族群色只用于顶部条/chip |
| D8 | 部署 | 仅本地构建验证；推送 GitHub Pages 由用户执行（无 git 仓库） |

如无异议，按 `tasks.md` 顺序执行。
