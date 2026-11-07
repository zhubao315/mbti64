# 设计系统（Design System）

**版本**：v2.0 · Phase 1  
**品牌**：MBTI64 · 64 PERSONALITIES · ONE UNIQUE YOU  
**定位**：64 型人格 · 自我认知探索平台  
**原则**：浅色为底、数据优先、克制装饰；不做大面积渐变/玻璃拟态/重阴影；Logo 沿用已确认方案一，不重画。

---

## 1. 品牌基础

| 项目 | 值 |
|---|---|
| 主色（交互/文字） | `#0F2747` navy |
| 深色（悬停） | `#0A1B33` navy-deep |
| 浅品牌底 | `#E8EEF5` navy-soft |
| 页面背景 | `#F8FAFC` wash |
| 卡片背景 | `#FFFFFF` paper |
| 描边 | `#E8E8E8` line / `#CBD5E1` border-strong |
| 主文字 | `#172B45` ink |
| 次文字 | `#5A6A7E` ink-soft |
| 弱文字 | `#5B6B80` ink-mute |

### 四大人格族群色（唯一分类语义色）

| 族群 | 图形/填充 | 文字（白底 ≥4.5:1） | 浅底 |
|---|---|---|---|
| 分析师 analyst | `#7B61FF` | `#5A3FD1` | `#E5DEFF` / `#F1EDFF` |
| 外交家 diplomat | `#4CAF6B` | `#1E6B34` | `#D5EFDE` / `#EAF7EE` |
| 守护者 guardian | `#4A90E2` | `#1A659F` | `#D6E8FB` / `#EAF3FD` |
| 冒险家 adventurer | `#F6C343` | `#7A5600` | `#FBE9B3` / `#FFF7DF` |

**规则**：族群色不得用于成功/警告/错误等状态语义；状态色固定 `success #24803F`、`warning #8A6200`、`error #B42318`。

---

## 2. 设计令牌

- 圆角：卡片 `12px`（`rounded-card`）、面板 `16px`（`rounded-panel`）、按钮/输入 `10px`。
- 阴影：`shadow-card` = `0 1px 2px rgba(15,39,71,.06)`；`shadow-lift` = `0 12px 28px -14px rgba(15,39,71,.18)`。
- 动效：`--ease-product` = `cubic-bezier(.22,.61,.36,1)`；位移 ≤ 2px；`prefers-reduced-motion` 全局关闭。
- 字体：系统中文栈（Inter / 思源黑体 / Noto Sans SC / PingFang SC / 微软雅黑）；引语可用 `font-quote`；不请求外部字体。
- 触控：所有可点元素最小高度 `44px`，答题选项 `48px`。
- 版心：`max-w-5xl` + `px-4 sm:px-6`；长文 `max-w-2xl` + `.prose-type`（34em / 1.85）。

---

## 3. 组件

### 3.1 Button (`components/ui/Button.tsx`)

| Prop | 值 |
|---|---|
| `variant` | `primary` / `ghost` / `tertiary` / `danger` |
| `size` | `sm`(40px) / `md`(44px) / `lg`(48px) |
| `href` | 传入则渲染 `next/link` |

用法：

```tsx
<Button href="/test" size="lg">开始测评</Button>
<Button variant="ghost">上一题</Button>
```

### 3.2 Card (`components/ui/Card.tsx`)

`tone`: `card` / `panel` / `flat` / `quiet`；`hover` 控制是否上浮；`as` 支持 `div/section/article/li`。

### 3.3 Badge (`components/ui/Badge.tsx`)

`tone`: 四族群 + `neutral` / `navy` / `success` / `warning`。

### 3.4 SectionHeader (`components/ui/SectionHeader.tsx`)

`eyebrow` + `title` + `sub` + `action`；标题固定 `h2`，章节锚点由 `id` 提供。

### 3.5 GroupGlyph (`components/ui/GroupGlyph.tsx`)

族群图形标签，内部是**全站唯一**的族群图标映射；禁止在页面里另写 `GROUP_ICONS`。

### 3.6 MobileNav (`components/MobileNav.tsx`)

移动导航按钮：`aria-expanded` / `aria-controls` / Esc 关闭 / 选后自动收起。

---

## 4. 使用规范

1. 优先复用 `components/ui`，页面内不再手写按钮/卡片/章节标题的边框、阴影、圆角。
2. 文字色只能用 `ink` / `ink-soft` / `ink-mute` / `navy` / 族群 `text`；禁止用族群 `DEFAULT` 写小字。
3. 稀有度、摇摆、档位等信息不得只靠颜色表达，必须同时给出文字（如「极稀有 · 第 3–8」）。
4. 图表必须带 `role="img"` + `aria-label`，并在图下列出关键读数。
5. 任何新交互必须有键盘路径与可见焦点；弹层必须 `role="dialog"` + `aria-modal` + Esc。
6. 禁止引入大面积渐变、玻璃拟态、装饰性光斑；插图与图标只用于分类识别。

---

## 5. 落地状态（Phase 1）

- [x] Token 复核（`tailwind.config.ts` / `app/globals.css`）
- [x] `Button` / `Card` / `Badge` / `SectionHeader` / `GroupGlyph` / `MobileNav`
- [x] 全局焦点环与 `prefers-reduced-motion`（已存在，复核通过）
- [x] 移动导航 ARIA 化
- [x] `/about` 的 AC/OH 释义修正为「坚定 / 内省」「探索 / 守成」
- [ ] 各页替换重复实现（随 Phase 2–5 逐步收敛）
