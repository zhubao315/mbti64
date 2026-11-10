# Component System · 组件规范

**唯一来源**：`app/globals.css` `@layer components` + `components/` 目录  
**审计日期**：2026-11-05

---

## 按钮家族（globals.css 已定义）

| 类 | 主色 | 用途 | 尺寸 |
|---|---|---|---|
| `.btn.btn-primary` | `bg-navy` 深海军蓝 | CTA、"开始测评"、"查看结果" | min-h 44px |
| `.btn.btn-ghost` | `border-navy + bg-white` | 次入口："认识 64 型人格" | min-h 44px |
| `.btn.btn-tertiary` | `bg-transparent + text-navy` | 三级："了解更多"、"查看完整报告" | min-h 40px |

**规则**：所有按钮最小点击区 ≥ 44×44（A11y），不得写 inline style 设颜色。

## 卡片

| 类 | 结构 | 用途 |
|---|---|---|
| `.card` | 白底 + 1px border + 12px + 卡片阴影 + hover 上浮 2px | 全站统一卡片 |
| `.card-hover` | 同上但只 hover 上浮，无默认阴影差异 | 交互型卡片（人格卡） |
| `.glass` / `.glass-strong` | `.card` 兼容别名 | 旧组件复用 |

## 导航项

| 规范 | 值 |
|---|---|
| 字体 | `text-[13.5px] font-medium` |
| 默认色 | `text-ink-soft` |
| hover | `bg-surface-hover text-navy` |
| min-h | 40px（桌面）/ 44px（移动端） |

## 章节组件

| 类 | 用途 |
|---|---|
| `.section-title` | H2 标题（22–26px 粗体 navy） |
| `.section-sub` | 章节副标题（14px ink-mute） |
| `.eyebrow` | 小标题（11.5px 全大写追踪 0.16em） |
| `.prose-type` | 人格长文正文（34em 段宽 + 1.85 行高） |

## 人格家族组件（components/ 目录）

| 组件 | 用途 | 算法关联 |
|---|---|---|
| `TypeCard` | 首页 64 型目录缩略图 | 无（展示型） |
| `TypeRarityBar` | 榜单行 + 稀有度条 | 调用 `priorProbability`, `TIER_DEFS` |
| `TypeAnalysis` | 型别详情 5 节长文 | 纯展示 |
| `TypeVariantTabs` | A/C × O/H 四变体切换 | 调用 `SUFFIX_MODIFIERS` |
| `TypeLetterRow` | 6 字母编码展示 | 纯展示 |
| `RarityPyramid` | 稀有度金字塔图 | 调用 `TIER_DEFS` 桶分布 |
| `RadarChart` | 六维雷达图 | 调用 `DIMS` 维度元 |

**规则**：人格组件不得引入算法外计算（只调用 `lib/scoring.ts` / `lib/rarity.ts` / `data/schema.ts`）。

## 测评组件

| 组件 | 用途 |
|---|---|
| `TestClient` | 测评主容器（答题状态机） |
| `QuestionCard` | 一屏一题（Likert / binary / image 三种） |
| `ProgressBar` | 答题进度条 |
| `Confetti` | 彩蛋触发反馈 |
| `PaywallModal` | Demo 付费解锁入口 |

## 结果页组件

| 组件 | 用途 | 懒加载建议 |
|---|---|---|
| `ResultClient` | 结果页主容器 | - |
| `SharePoster` | 分享海报生成 | 可懒（首屏后） |
| `TypeShareButton` | 分享按钮 | 可懒 |
| `MirrorMentorCard` | 人格镜像建议 | 可懒 |
| `NeuroStackCard` | 神经堆叠卡 | 可懒 |
| `DeliberatePracticeCard` | 刻意练习卡 | 可懒 |
| `ChinaSliceCard` | 六维切片漫画 | 可懒 |
| `BookChapterCard` | 书章节引用 | 可懒 |

**规则**：Phase 5 结果页升级必须把上述"可懒"组件改成 `next/dynamic` + `suspense: false`，减少 LCP 体积。

## 插画组件

| 类 | 用途 |
|---|---|
| `.portrait-blob` | 人物插画容器（inset:0 + object-fit:contain + object-position:center） |

**规则**：Phase 1–6 不得改 `.portrait-blob` 定义（已验证跨浏览器正确适配所有比例）。

## A11y 组件规范

| 要求 | 实现 |
|---|---|
| 键盘焦点环 | `:focus-visible { outline: 2.5px solid navy; outline-offset: 3px; }`（globals.css 已定义） |
| Skip link | `layout.tsx` 已有（跳到 `#main`） |
| prefers-reduced-motion | globals.css L203-L212 全局降级声明 |
| 最小点击区 | 按钮 min-h ≥ 44px |
| 图标 aria-hidden | 所有 `@phosphor-icons/react` `<Icon size={N} aria-hidden />` |
