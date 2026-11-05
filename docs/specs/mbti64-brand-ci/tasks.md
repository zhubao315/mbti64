# MBTI64 品牌 CI 升级 — 任务清单（Tasks）

> 依据 `docs/specs/mbti64-brand-ci/spec.md` 执行。顺序即依赖顺序。
> 每阶段完成后勾选，并在阶段末做一次 `typecheck`（构建/回归放在最后统一做）。

---

## Phase 0 — 基线确认

- [x] 0.1 记录 `public/assets/portraits` 文件数/总体积（用于最后确认未被改动）
- [x] 0.2 记录当前 `npm run typecheck` 基线是否通过
- [x] 0.3 备份将被覆盖的 `public/og/home.png`（重制前）

## Phase 1 — Design Tokens

- [x] 1.1 重写 `tailwind.config.ts`
  - 重估值 `paper/wash/line/ink`
  - 新增 `navy`（DEFAULT/deep/soft）、`brand`（background/surface/border）、`surface`（page/card/hover）、`text`（primary/secondary/muted）
  - 族群色改为新四色 + `text/soft/light`
  - 稀有度中性色板（`rarity` 1–7 或直接用 `tier.color` 内联）
  - 字体栈改为 `Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif`
  - 删除 `violet/avocado/coral/cream/sand`、`glass/glow`、`breathe/float/shimmer`
  - 保留 `card/lift/product/fade-in/radar-draw`
- [x] 1.2 重写 `app/globals.css`
  - 删除两个 `@import` 字体外链
  - `:root` 更新品牌变量（navy、四族群、中性）
  - `.btn-primary` → navy；`.btn-ghost` → 白底 navy 边
  - `.card/.glass` 统一新卡片规范（`.glass` 保留兼容壳）
  - 删除 `.text-gradient/.text-gradient-cool/.progress-band`
  - `.quote` 改系统衬线
  - 焦点环 navy
- [x] 1.3 `data/schema.ts` 更新 `GROUP_META`（四色/文字色/soft/light，删除 emoji 字段）
- [x] 1.4 `lib/rarity.ts` 仅更新 7 档 `color/text/soft/badge`（纯文字、中性梯度），不动算法

## Phase 2 — 品牌资源

- [x] 2.1 编写 `tools/gen_brand_assets.py`（Pillow 绘制四象限图标与全部 PNG 尺寸）
- [x] 2.2 生成 SVG：`logo-icon / logo-primary / logo-stacked / logo-light / logo-dark / logo-mono-black / logo-mono-white / favicon`
- [x] 2.3 生成 PNG：`favicon-16/32/48`、`apple-touch-icon`、`icon-192/512`（含 `icon-512-maskable`）
- [x] 2.4 替换 `app/icon.svg`
- [x] 2.5 新建 `public/site.webmanifest`
- [x] 2.6 重制 `public/og/home.png`（1200×630，品牌版）
- [x] 2.7 校验 SVG 为真实路径（无 base64 PNG 嵌入）、24px 可辨

## Phase 3 — 品牌组件

- [x] 3.1 新建 `components/BrandLogo.tsx`（primary/icon/stacked + color/light/dark/mono + 尺寸）
- [x] 3.2 `app/layout.tsx` 重写 Header（Logo + 4 导航 + CTA + 移动端 `<details>` 菜单）
- [x] 3.3 `app/layout.tsx` 重写 Footer（品牌区 + 导航 + 免责声明）
- [x] 3.4 `app/layout.tsx` 更新 metadata / viewport / icons / manifest / themeColor
- [x] 3.5 `lib/site.ts` 更新 `SITE_NAME / SITE_NAME_EN / SITE_DESC`

## Phase 4 — 通用组件

- [x] 4.1 `TypeCard.tsx`：族群 chip + navy 代码 + 中性稀有度
- [x] 4.2 `RarityBadge.tsx`：中性色点 + `tier.text`
- [x] 4.3 `ProgressBar.tsx`：navy 实色
- [x] 4.4 `QuestionCard.tsx`：navy 选中态，去硬编码色/emoji
- [x] 4.5 `RadarChart.tsx`：去 glow/渐变，navy 单色
- [x] 4.6 `StartButtons.tsx` / `HomeCtas.tsx`：navy 主/次按钮
- [x] 4.7 `PyramidExplorer.tsx` / `RarityPyramid.tsx`：中性档位 + navy 当前档
- [x] 4.8 `MyRankBar.tsx` / `MatchList.tsx` / `PaywallModal.tsx` / `Faq.tsx` / `InterestCards.tsx` / `DisclaimerBar.tsx`：换肤
- [x] 4.9 `TeachingCarousel.tsx` / `TypeQuote.tsx` / `TypeShareButton.tsx` / `ShareLinkButton.tsx` / `Confetti.tsx` / `EasterEgg.tsx` / `ResumeBanner.tsx` / `HomeHighlight.tsx`：清理遗留 token
- [x] 4.10 `typecheck`

## Phase 5 — 页面

- [x] 5.1 首页 Hero（左文案 + 右品牌面板：Logo/64 点矩阵/四色图例）
- [x] 5.2 首页数据指标 4 卡
- [x] 5.3 首页结果预览 3 卡
- [x] 5.4 首页六维区 `id="how-it-works"`
- [x] 5.5 首页稀有度 + 最稀有 6 型
- [x] 5.6 首页四大族群 2×2 卡（soft 底 + 4px 色条 + 英文/中文 + 16 型 + 入口）
- [x] 5.7 首页 FAQ + navy CTA + 免责
- [x] 5.8 榜单 `app/rank/page.tsx`：档位索引/档位区/族群索引全部换肤
- [x] 5.9 型别详情 `app/type/[code]/page.tsx`：品牌头 + 族群色带 + 肖像
- [x] 5.10 答题页 `app/test/page.tsx` + `TestClient.tsx`：品牌头 + navy 进度/选中态
- [x] 5.11 结果页 `app/result/page.tsx` + `ResultClient.tsx`：品牌头 + 肖像 + 三屏 + 锁区 + 相近/互补
- [x] 5.12 分享海报：`SharePoster.tsx` + `lib/poster.ts` 按规范重绘
- [x] 5.13 `typecheck`

## Phase 6 — 验证

- [x] 6.1 `npm run typecheck`
- [x] 6.2 `npm run test`（4 文件 / 85 条通过）
- [x] 6.3 `npm run build`（`NEXT_PUBLIC_BASE_PATH=/mbti64`，74 页静态导出）
- [x] 6.4 遗留 token/emoji grep 检查（spec 10.2）
- [x] 6.5 响应式检查：1440/1280/1024/768/390/375/360，无横向溢出
- [x] 6.6 功能回归清单逐项（spec 10.3）
- [x] 6.7 确认 portraits 未被修改（384 个文件）
- [x] 6.8 视觉验收（spec 10.4）

## Phase 7 — 文档与交付

- [x] 7.1 编写 `public/assets/brand/brand-guidelines.md`（spec 第 11 节 9 项）
- [x] 7.2 输出交付报告：改动文件清单 / 设计系统 / 页面改造 / 回归结果 / 部署地址 / 未完成事项
- [x] 7.3 说明部署方式（本地无 git 仓库，推送由用户执行）
