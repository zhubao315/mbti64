# 01 · 项目结构审计

**分支**：`redesign/mbti64-v2` · **基线 commit**：`a38bfc0` · **审计日期**：2026-11-05

---

## 1. 技术栈

| 类别 | 选型 | 版本 | 证据 |
|---|---|---|---|
| 构建框架 | Next.js (App Router) | 14.2.x | `package.json` next 依赖 |
| UI 框架 | React | 18.x | Next 内置 |
| 样式 | Tailwind CSS | 3.x | `tailwind.config.ts` |
| 客户端状态 | Zustand + persist 中间件 | - | `lib/store.ts` |
| 图标 | Phosphor Icons (`@phosphor-icons/react`) | - | `app/layout.tsx` L4 |
| 二维码 | `qrcode` | - | Result 页海报生成 |
| 动效 | `framer-motion` | - | Next config 特化优化路径 |
| 类型 | TypeScript 5.x | - | `tsconfig.json` strict |
| 测试 | Vitest + Playwright-core | - | `vitest.config.ts`, `package.json` devDeps |
| 部署 | GitHub Pages 静态导出 | - | `next.config.mjs` `output: "export"` |
| 运行时 | Node.js v25（本地构建） | - | `node --version` |

### 关键构建配置

- `next.config.mjs`: `output: "export"` + `trailingSlash: true` + `images.unoptimized: true`（原生 `<img>`）
- **basePath 通过环境变量注入**：`NEXT_PUBLIC_BASE_PATH=/mbti64`，`NEXT_PUBLIC_SITE_URL=https://zhubao315.github.io`
- Tailwind 扫描路径：`app/`, `components/`, `data/`, `lib/` 下 `.ts/.tsx`

---

## 2. 目录结构

```
64personalities-cn/
├── app/                       # Next App Router（路由入口）
│   ├── layout.tsx             # 根布局：导航 + 页脚 + Metadata
│   ├── page.tsx               # 首页
│   ├── test/page.tsx          # 测评入口
│   ├── result/page.tsx        # 结果页（客户端计算）
│   ├── rank/page.tsx          # 稀有度榜单 + 64 型目录
│   └── type/[code]/page.tsx   # 动态路由：型别详情
├── components/                # 41 个 React 组件
├── lib/                       # 12 个 TS 模块（算法、存储、站点配置等）
├── data/                      # 6 个数据文件（题库、型别、稀有度、Schema）
├── public/
│   ├── assets/portraits/            # 旧版人物插画（PNG + WEBP，含高保真 1200×1600）
│   ├── assets/portraits-light/      # 新版亮色插画（thumb-512 正方 + hero-1200x1600 竖版）
│   ├── assets/brand/                # Logo / Favicon / Guidelines
│   ├── og/                          # 64 张 OG 分享图（PNG）
│   ├── logo/                        # 品牌图（大文件）
│   └── site.webmanifest             # PWA 清单
├── docs/                      # 已有 5 份 markdown（审计前的迭代记录、acceptance-report）
├── scripts/ + tools/          # 辅助脚本（生成插画、批量处理、本地 serve）
├── tests/                     # 4 份 vitest 测试（算法基线）
├── next.config.mjs            # 构建配置
├── tailwind.config.ts         # Tailwind（无显式设计 token）
└── package.json               # 依赖 & scripts
```

---

## 3. 依赖体积 TOP 10（dev + prod）

| 包 | 角色 | 备注 |
|---|---|---|
| next | 构建框架 | 87 kB 共享 chunk |
| react + react-dom | UI | - |
| tailwindcss | 样式 | - |
| zustand | 状态 | 轻量（< 1 kB gzip） |
| qrcode | 海报二维码 | 客户端生成 |
| framer-motion | 动效 | Next config 已优化导入 |
| @phosphor-icons/react | 图标 | 树摇友好 |
| vitest + playwright-core | 测试 | - |
| typescript | 编译 | strict 模式 |
| react-dom 之外的... | - | - |

**无大型重型依赖**（如 lodash / moment / echarts），整体体积健康。

---

## 4. 设计 Token 现状

`globals.css` 的 `:root` 仅 **13 行**，**没有完整设计 token 体系**。当前做法：

- Tailwind 类名硬编码颜色值在组件里（如 `bg-navy`, `text-ink-soft`）
- 品牌阵营色定义在 `data/schema.ts` 的 `GROUP_META`（唯一可信来源）
- 大量颜色散落在 `globals.css` 和组件 className 里

**技术债务**：缺少统一的 `--brand-*`, `--bg-*`, `--text-*` 变量，导致跨页面一致性靠人工维持。Phase 1 设计系统建设必须补齐。

---

## 5. 部署流程

```
本地构建（设 BASE_PATH / SITE_ORIGIN 环境变量）
    ↓
npm run build → out/ 静态产物
    ↓
gh-pages worktree 复制 out/
    ↓
git push origin gh-pages
    ↓
GitHub Pages 自动部署（站点来源：gh-pages 分支 / 根目录）
    ↓
https://zhubao315.github.io/mbti64/
```

**没有 GitHub Actions**（404），全手工流程。**没有 404.html**（Pages 的 SPA 回退依赖 Next 生成的 404/ 目录）。构建产物在 `out/`，包含 `.nojekyll` 防止 Jekyll 处理。

---

## 6. 技术债务清单（按优先级）

| 级别 | 问题 | 位置 | 影响 |
|---|---|---|---|
| P1 | 缺少统一 CSS 变量设计 Token | `globals.css`, 全组件 | 视觉一致性、后续改版成本 |
| P1 | 客户端状态机复杂度集中在 `lib/store.ts` 一个文件 | `lib/store.ts` 148 行 | 维护成本、hydration 边界 |
| P2 | 64 型文案 + 后缀文案硬编码在 `types64.ts` | `data/types64.ts` 大文件 | 批量修改文案需要重新打包 |
| P2 | 旧 `assets/portraits/` 目录仍在（约 187 MB PNG） | `public/assets/portraits/` | 仓库体积膨胀 |
| P2 | `globals.css` 存在 `portrait-blob` / `num-hero` / `stamp` 等少量自定义工具类，无统一命名规范 | `globals.css` L192+ | 组件间样式复用 |
| P3 | 无 GitHub Actions 自动化部署 | - | 部署手动、容易漏步骤 |
| P3 | 无浏览器 E2E 自动化测试覆盖交互链路 | `tests/` 仅 4 份 vitest | 改版回归风险 |
