# Design Tokens · 设计 Token 体系

**唯一来源**：`tailwind.config.ts` theme.extend + `app/globals.css` `:root`  
**审计日期**：2026-11-05

---

## 品牌色（navy 体系）

| Token | 值 | 用途 |
|---|---|---|
| `navy` / `--brand-navy` | `#0F2747` | 品牌主色、按钮主色、H1、表单标签 |
| `navy-deep` / `--brand-navy-deep` | `#0A1B33` | 主按钮 hover、悬停态 |
| `navy-soft` / `--brand-navy-soft` | `#E8EEF5` | 三级按钮 hover 底、弱化 navy 区域 |

## 背景与表面

| Token | 值 | 用途 |
|---|---|---|
| `brand-background` / `wash` | `#F8FAFC` | body 页面背景 |
| `brand-surface` / `paper` | `#FFFFFF` | 卡片、导航、Footer 表面 |
| `surface-hover` | `#F1F5F9` | 按钮 / 链接 hover 底 |
| `brand-border` / `line` | `#E8E8E8` | 卡片边框、分隔线 |
| `border-strong` | `#CBD5E1` | 次按钮边框（更显著） |

## 文本（三档层次）

| Token | 值 | 对比度 | 用途 |
|---|---|---|---|
| `ink` / `text-primary` | `#172B45` | 14:1 | 正文、标题、重要标签 |
| `ink-soft` / `text-secondary` | `#5A6A7E` | 7:1 | 次要段落、长文、说明 |
| `ink-mute` / `text-muted` | `#5B6B80` | 7:1 | 元数据、时间戳、页脚小字 |

**规则**：所有文本必须是三档之一，不得直接写十六进制。

## 状态色

| Token | 值 | 用途 |
|---|---|---|
| `success` | `#24803F` | 完成、答对、已解锁 |
| `warning` | `#8A6200` | 提示、注意事项 |
| `error` | `#B42318` | 错误、失败、必填项 |
| `info` | `#1E6FB8` | 信息提示 |
| `disabled` | `#94A3B8` | 禁用态 |

**规则**：状态色不得与四阵营色混用——analyst 紫不是"警告色"。

## 尺寸与圆角

| Token | 值 | 用途 |
|---|---|---|
| `rounded-card` / `--radius-card` | 12px | 卡片、徽章、标签容器 |
| `rounded-panel` / `--radius-panel` | 16px | 模态、浮层、大区块 |
| 按钮 / 导航项 | 10px | `.btn` / `.nav-item` |

## 阴影

| Token | 值 | 用途 |
|---|---|---|
| `shadow-card` | `0 1px 2px rgba(15,39,71,0.06)` | 卡片默认轻微投影 |
| `shadow-lift` | `0 12px 28px -14px rgba(15,39,71,0.18)` | 卡片 hover 上浮、浮层、主按钮 hover |

## 字体

| Token | 栈 | 用途 |
|---|---|---|
| `font-sans` | Inter → 思源黑体 → Noto SC → PingFang → YaHei → system-ui | 正文、界面、表单 |
| `font-quote` | LXGW WenKai（自托管）→ 霞鹜文楷 → 楷体 → Georgia | 引语、人格金句、章节标题 |
| `font-mono` | SFMono → Consolas → monospace | 代码、人格编码（INTJ-A-O）、数字 |

**规则**：人格编码和稀有度排名数字必须用 `font-mono` 或 `.num-hero`（tabular-nums + 紧字距）。

## 动效与缓动

| Token | 值 | 用途 |
|---|---|---|
| `ease-product` / `--ease-product` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | 全站统一交互缓动 |
| `animation-fade-in` | 220ms ease-product | 内容出现 |
| `animation-radar-draw` | 800ms ease-product + 120ms 延迟 | 雷达图描边动画 |
| `.stamp` | 380ms ease-product | 答题印章反馈 |

## 无障碍 · prefers-reduced-motion

已在 `globals.css` L78-L82（卡片 hover）和 L203-L212（全局降级）声明。所有新动画组件必须：

```css
@media (prefers-reduced-motion: reduce) {
  .my-animated-element {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

---

## 唯一性声明

以上值**只在 `tailwind.config.ts`** 定义一次，`globals.css` 的 `:root` 变量是镜像（不独立来源）。任何修改颜色必须改 `tailwind.config.ts` 再同步 CSS 变量，不能只改一处。
