# 05 · UI/UX 审计

**基线 commit**：`a38bfc0` · **审计日期**：2026-11-05 · **浏览器实测**：Playwright + Lighthouse

---

## 1. 当前视觉基准

### Lighthouse 实测数据（最新一版）

| 页面 | Performance | Accessibility | Best Practices | SEO | 横向溢出 375px |
|---|---|---|---|---|---|
| 首页 `/` | 85 | 100 | 100 | 100 | ✅ 无 |
| 型别页 `/type/INTJ-A-O` | 91 | 100 | 100 | 100 | ✅ 无 |
| 结果页 `/result` | 80 | 100 | 100 | - | ✅ 无 |

**基础扎实**，四项分数全部 ≥ 80、A11y 满分。Phase 1–6 改版不能把这些指标改坏。

### 色彩体系现状（`data/schema.ts` L186-L194）

```ts
GROUP_META = {
  analyst:    { cn:"分析师", en:"Analyst",    color:"#7B61FF", text:"#5A3FD1", soft:"#E5DEFF", light:"#F1EDFF" },
  diplomat:   { cn:"外交家", en:"Diplomat",   color:"#4CAF6B", text:"#1E6B34", soft:"#D5EFDE", light:"#EAF7EE" },
  guardian:   { cn:"守护者", en:"Guardian",   color:"#4A90E2", text:"#1A659F", soft:"#D6E8FB", light:"#EAF3FD" },
  adventurer: { cn:"冒险家", en:"Adventurer", color:"#F6C343", text:"#7A5600", soft:"#FBE9B3", light:"#FFF7DF" },
}
```

**这套四阵营色是唯一可信来源**——Phase 1 设计系统必须以 `GROUP_META` 为准，不另起炉灶。

### 缺失：全局设计 Token

`globals.css` 的 `:root` 只有 13 行，没有统一变量。当前颜色散落在 className 里：

| Token | 用途 | 位置 |
|---|---|---|
| `--navy: #0F2747` | 品牌深色 | `:root`（有） |
| `--ink-*` 一组三档文本色 | 正文层级 | `:root`（有） |
| 阵营色四组 | 图表/标签 | 仅在 `GROUP_META` |
| `bg-navy / text-ink-soft / border-brand-border` | 组件硬编码 | Tailwind config 或直接写在 className |

**结论**：Color System 半成型，Spacing/Radius/Font Family 没有 Token 化。

---

## 2. 品牌一致性审计

| 维度 | 状态 | 问题 |
|---|---|---|
| Logo 使用 | ✅ 稳定 | `BrandLogo` 组件全局复用，无多处手写 SVG |
| 品牌口号 | ✅ 两处一致 | Hero 和 footer 都是 `64 PERSONALITIES · ONE UNIQUE YOU` |
| 四阵营色 | ✅ `GROUP_META` 唯一来源 | 图表/标签/卡片颜色从同一张表取 |
| 导航品牌 CTA | ✅ 固定按钮 | 所有页面导航都有"开始测评"主按钮 |
| **品牌主色体系** | ⚠️ 不完整 | 缺 secondary / accent / 成功 / 警告语义色 |
| **深色模式** | ❌ 不支持 | `layout.tsx` L54 硬编码 `colorScheme: "light"` |
| **图标风格** | ✅ Phosphor + 线性 | 全项目统一 |
| 插画风格 | ✅ 刚统一为新浅色系列 | `.portrait-blob` object-fit contain + inset:0 |
| 按钮状态 | ✅ hover / active / disabled | 但视觉反馈偏弱 |

---

## 3. 首页信息架构审计

### 现状结构（从上到下）

```
┌─────────────────────────────┐
│ Sticky Nav + CTA 按钮         │ ✅
├─────────────────────────────┤
│ Hero：Logo + 品牌 + CTA        │ ⚠️ 文案较长移动端截断
│ + 两个 hero 插画卡              │ P1 可视占比偏低
├─────────────────────────────┤
│ 测评说明 / 快速 / 完整对比卡   │ ✅ 核心信息
├─────────────────────────────┤
│ 稀有度概览入口                  │ ✅
├─────────────────────────────┤
│ 64 型人格缩略图 + 跳转          │ ⚠️ 仅缩略图，缺筛选项
├─────────────────────────────┤
│ FAQ 折叠（约 6-8 条）           │ ✅
├─────────────────────────────┤
│ Footer                         │ ✅
└─────────────────────────────┘
```

### 任务书建议结构（10 Sections）

| Section | 现状 | 差距 |
|---|---|---|
| 01 Hero 首屏 | ✅ 有 | Hero 文案需精简、CTA 层级需优化 |
| 02 认识 MBTI64（16×4=64 几何解释） | ❌ 缺失 | 信息架构层 |
| 03 开始测评（60/120 双入口） | ✅ 有 | 文案需场景化 |
| 04 六维人格模型（六个维度说明） | ❌ 缺失 | 信息架构层 |
| 05 四大人格阵营 | ✅ 稀有度页有但首页没有 | Phase 2 新增 |
| 06 探索 64 型人格 | ⚠️ 有缩略图目录 | 按阵营/基础型筛选缺失 |
| 07 人格结果示例 | ⚠️ 结果页有首页没有 | Phase 2 新增 |
| 08 稀有度探索 | ✅ 有入口 | - |
| 09 FAQ | ✅ 有 | 问题清单需对齐任务书建议 |
| 10 最终 CTA | ❌ 缺失 | Hero 已有但底部缺收尾 |

---

## 4. 测评交互审计

### 答题页面（375px 移动端）

| 项目 | 现状 | 评级 | 建议 |
|---|---|---|---|
| 一屏一题 | ✅ | 好 | - |
| 进度条 + 百分比 | ✅ | 好 | - |
| 五级 Likert 纵向排列 | ✅ | 好 | - |
| 二选一选项 44px 点击区 | ⚠️ 略小 | P1 | 扩到 48px+ |
| 四选 image 选项 44px | ⚠️ 略小 | P1 | 扩到 48px+ |
| 键盘操作（左右/数字） | ❌ 未测试 | P2 | 需验证 |
| 上一题 | ✅ | 好 | - |
| 修改答案（回到已答题） | ✅ | 好 | - |
| 自动保存（答即写 localStorage） | ✅ | 好 | - |
| 刷新恢复 | ✅ | 好 | - |
| **退出并保留进度显式按钮** | ❌ 缺失 | P0 | 必须加 |
| 剩余 X 题 / 预计 X 分钟 | ❌ 缺失 | P1 | 加在进度条右侧 |
| 完成前答题完整性检查 | ❌ 缺失 | P2 | 全部答完再出"查看结果" |

---

## 5. 结果页信息密度审计

### 现状

结果页 `ResultClient.tsx` 渲染组件清单：

```
人格卡片（编码 + 名称 + 阵营 + 主视觉）
  ↓
六维雷达图（Dims）
  ↓
人格镜像（MirrorMentorCard）
  ↓
神经堆叠（NeuroStackCard）
  ↓
人格分析（TypeAnalysis，5 节长文）
  ↓
相近人格（MatchList，相近策略）
  ↓
互补人格（MatchList，互补策略）
  ↓
稀有度（TypeRarityBar）
  ↓
变体 Tab（TypeVariantTabs：A/C × O/H 四变体）
  ↓
引用（TypeQuote）
  ↓
章节卡（BookChapterCard + DeliberatePracticeCard + ChinaSliceCard）
  ↓
海报 + 分享（SharePoster + TypeShareButton）
```

### 问题

- **P1 首屏 LCP 重**：首屏至少有编码 + 名称 + 主视觉 + 雷达图——LCP 依赖 hero 图加载
- **P1 滚动深度大**：375px 下至少 2500px，用户信息过载
- **P2 组件加载串行**：当前 `import` 是静态，可 `next/dynamic` 懒加载"人格镜像"之后的所有非首屏组件
- **P2 海报 DOM 复杂**：`SharePoster` 用 html-to-image 生成，手机端中文字体渲染偶发问题（已 try/catch 兜底但提示不明显）

### 建议

Phase 5 结果页升级：
1. 分层折叠：首屏只放核心人格信息 + 雷达图，"深入理解"默认折叠
2. 懒加载非首屏组件
3. 海报生成改为服务端生成 PNG 或 Canvas 矢量

---

## 6. 可访问性（A11y）审计

| 项目 | 测试结果 | 证据 |
|---|---|---|
| Lighthouse A11y | **100**（满分） | 最新一轮测试 |
| 导航焦点 | ✅ `sr-only` skip-link（`app/layout.tsx` L69-L74） | 跳过导航直达 main |
| 主题色 | ✅ WCAG AA 对比度 | 14:1（#0F2747 on white） |
| 人格颜色不做唯一区分 | ✅ | 同时显示编码 + 阵营标签 |
| 语义化 HTML | ✅ `<main>`, `<header>`, `<nav>`, `<footer>` | 根 layout |
| 键盘操作 | ⚠️ 答题键盘支持需要验证 | Likert 选项有 `<button>` 可 tab |
| 图片替代文本 | ✅ `alt` 覆盖 | 所有 `<img>` |
| 标题层级 | ⚠️ 需手动验证 h1→h2→h3 连续性 | TypeAnalysis 长文可能有问题 |
| 动效减少偏好 | ❌ 未检查 `prefers-reduced-motion` | 所有 framer-motion 动画应在 reduce-motion 下降级 |

---

## 7. 移动端体验审计

| 指标 | 结果 |
|---|---|
| 375px 横向溢出 | ✅ 无 |
| 按钮可点击区（最小 44×44） | ⚠️ 部分 binary/image 选项略小 |
| 答题选项纵向排列 | ✅ |
| Hero 首屏 375px 可视区 | ⚠️ 文案长需滚动 |
| 型别详情主视觉容器 | ⚠️ 130px 视觉占比偏低 |
| 结果页滚动深度 | P1 超过 2500px |
| 移动端导航抽屉 | ✅ `<details>` 实现（无 JS 依赖） |
| Hero 插画容器 aspect-square 装 3:4 图 | ⚠️ 视觉留白多，主图被压缩 |

---

## 8. 组件复用与命名规范

当前 41 个组件按功能大致分组（实际在 `components/` 平铺，无子目录）：

| 类别 | 组件 |
|---|---|
| 品牌 | BrandLogo |
| 导航 | 无独立组件（写在 layout 里） |
| 测评 | TestClient, QuestionCard, QuizProgress（隐） |
| 结果 | ResultClient, SharePoster, TypeShareButton |
| 可视化 | RadarChart, RarityPyramid, TypeRarityBar |
| 人格 | TypeAnalysis, TypeCard, TypeVariantTabs, TypeQuote, TypeLetterRow, MatchList |
| 首页 | HomeHighlight, HomeHighlightLazy, FAQ, StartButtons, HomeCtas |
| 深度内容 | MirrorMentorCard, NeuroStackCard, DeliberatePracticeCard, ChinaSliceCard, BookChapterCard |
| 通用 | DisclaimerBar, EasterEgg, Confetti, PaywallModal, ProgressBar, ResumeBanner, TeachingCarousel, TeachingLazy |

**建议**：Phase 1 设计系统建设时，按任务书 L550-L594 的目录建议**选择性**重组组件，**不做大规模搬移**。

---

## 9. UI/UX 问题优先级汇总

| 级别 | 问题 | 阶段 |
|---|---|---|
| **P0** | 答题退出按钮缺失 | Phase 4 测评体验 |
| **P1** | 全局设计 Token 未建立 | Phase 1 设计系统 |
| **P1** | 首页信息架构缺 6 个 Section | Phase 2 首页重构 |
| **P1** | 测评入口文案缺场景化 | Phase 4 |
| **P1** | 结果页 LCP 重 + 信息过载 | Phase 5 |
| **P1** | 主视觉容器 aspect-square 装 3:4 图留白多 | Phase 2（首页）+ Phase 3（型别页） |
| **P1** | 4 阵营页面 / 筛选 缺 | Phase 3 人格体系 |
| **P1** | 导航信息架构与任务书有差距（缺"人格测评"独立项、缺"关于"） | Phase 1 导航重构 |
| P2 | 题库选项按钮点击区略小（< 44px） | Phase 4 |
| P2 | 结果页组件串行加载 | Phase 5 懒加载 |
| P2 | 海报生成手机端稳定性 | Phase 5 |
| P2 | 键盘无障碍 | Phase 4 |
| P2 | 深色模式不支持 | 后续 |
| P2 | prefers-reduced-motion 未降级 | Phase 1 动效审计 |
| P3 | SVG Favicon 有、PNG Favicon 也有但没确认尺寸 | Phase 1 品牌审计 |

---

## 10. Phase 1 设计系统建设必须先补的文件

```
docs/design/
├── brand-guidelines.md         # 品牌名、口号、阵营色、Logo 使用规范
├── design-tokens.md            # CSS 变量：brand/color/spacing/radius/typography
└── component-system.md         # Button/Card/Badge/人格组件规范
```

这些文件不是 Phase 0 交付，是 Phase 1 产出。Phase 0 只负责**审计出"缺什么"**。
