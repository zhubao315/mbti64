# 64 型人格稀有度测评 · 64 Personalities CN

> 120 道本土化情景题 → 六维计分 → 64 型人格 + 7 档稀有度 + 可分享海报。
> **在线体验：<https://zhubao315.github.io/mbti64/>**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-000?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-087ea4?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-162%20passed-brightgreen)]()

> 当前分支状态、体量基线、文档口径见 [`docs/STATUS.md`](docs/STATUS.md)（单一事实源）。

---

## 1. 这是什么

一个**纯静态**的中文人格测评站：答完 60（精简）或 120（完整）道情景题，得到一个
`16 基础型 × 2（坚定/内省）× 2（探索/守成） = 64 型` 的编码（如 `INFJ-A-O`），
并给出六维雷达、稀有度名次、相似/互补型别、主题指南与 9:16 分享海报。

- 结果**完全在浏览器本地计算**，不上传答案、不需要注册
- 进度存在 `localStorage`，关掉浏览器可以接着答
- 64 个型别各有独立静态页 + OG 分享图（SEO / 社交传播）
- 付费完整报告是**转化链路 Demo**，不接支付、不扣费

> ⚠️ 所有结果仅用于**娱乐与自我探索**，不构成心理咨询、诊断或医疗建议。

---

## 2. 快速开始（3 步）

```bash
# 1) 安装依赖（本项目统一使用 npm，锁文件为 package-lock.json）
npm ci

# 2) 本地开发（http://localhost:3000）
npm run dev

# 3) 生产构建 + 静态预览
npm run build && npx serve out
```

需要 Node.js ≥ 18.17（CI 固定 Node 20，本地在 Node 24 上验证过，见 `.nvmrc`）。

`npm run build` 会先执行 `scripts/assets-hifi.mjs stash`，把仅供离线生成脚本使用的
高保真 PNG 原图移出 `public/`，避免它们被静态导出整目录复制进 `out/`。
需要重新生成插画时执行 `npm run assets:restore` 放回，详见 [§5](#5-目录结构)。

### 常用脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 移出原图 → 生产构建（**根路径**，本地检查用） |
| `npm run build:pages` | 注入 `/mbti64` basePath 并校验产物，**部署 Pages 必用** |
| `npm run typecheck` | `tsc --noEmit` 全量类型检查 |
| `npm test` | Vitest 单元测试（8 文件 / 162 条） |
| `npm run test:coverage` | 覆盖率报告（`lib/scoring.ts` 门槛 90%） |
| `npm run verify` | 数据审计 + 类型检查 + 单测 + 构建的发布前全量校验 |
| `npm run assets:status` | 查看高保真原图在 `public/` 与 `assets-hifi/` 的分布 |
| `npm run assets:restore` | 把原图放回 `public/`，供 `tools/` 离线生成脚本使用 |
| `bash scripts/deploy-ghpages.sh` | 把 `out/` 作为新快照推送到 `gh-pages`（不切分支、不重写历史） |

---

## 3. 部署（GitHub Pages 子路径）

本站采用 `output: "export"` 静态导出。部署到 Pages **必须**用专用命令：

```bash
npm run build:pages          # 注入 basePath=/mbti64 并校验产物资源前缀
bash scripts/deploy-ghpages.sh
```

> ⚠️ **不要用 `npm run build` 的产物部署到 Pages**。它按根路径生成资源
> （`/_next/...`、`/assets/...`），挂到 `/mbti64/` 子路径后会全部 404，
> 页面只剩 HTML 空壳（2026-11-09 曾因此整站不可用）。`npm run build` 只适用于
> 根域名部署或本地检查。
>
> 在 Windows Git Bash 里手写环境变量时须加 `MSYS_NO_PATHCONV=1`，否则 `/mbti64`
> 会被转换成 `D:/.../mbti64`；`npm run build:pages` 由 Node 传值，无此问题。

- `next.config.mjs` 读 `NEXT_PUBLIC_BASE_PATH` 设置 `basePath`；`lib/site.ts` 用
  `NEXT_PUBLIC_SITE_URL`（只写 origin，不带 path）拼接 sitemap / robots 绝对地址
- 已内置 `public/.nojekyll`，避免 `_next/` 被 Jekyll 忽略
- 推送 `gh-pages` 后，需等 `pages build and deployment` 工作流变为 success
  才算真正上线（推送成功 ≠ 部署成功）
- 站点只引用 256 张 webp 人像与 73 张 brand / og PNG；高保真原图不会进入 `out/`，
  因此资产清理后的部署目录约 44 MB，而不是过去的 381 MB（−88%）

---

## 4. 64 型是怎么算出来的

```
四维基础字母：E/I × S/N × T/F × J/P  →  16 个基础型
两个后缀维度：A/C（自我姿态）× O/H（变化偏好）  →  ×4
16 × 4 = 64 型，编码形如 INFJ-A-O
```

### 计分规则（`lib/scoring.ts`）

| 题型 | 分值 | 说明 |
|------|------|------|
| Likert 五级 | `+2 … -2` | 索引 0 = 非常同意 = `+2` |
| 二选一 | `±1` | 选项 0 恒为 poleA 侧 |
| 四选一图片 | `±1` | 两侧各 2 张，避免位置偏差 |
| 反向题 | 取相反数 | 每维 2–3 道，抵消默认同意倾向 |

- 维度百分比：`percentA = 50 + 50 × Σ得分 / 该维满分`（0–100）
- 强度分档：`< 55 模糊` · `55–70 较强` · `> 70 显著`
- **后缀摇摆型**：A/C 与 O/H 以二选一题投票定字母，门槛为总票数的 `⌈2/3⌉`
  （完整模式 6 题 → 4 票；精简 3 题 → 2 票）。票数不足或平票 → 标为「摇摆型」，
  展示编码用 `?` 占位（`INFJ-?-O`），但底层 `code` 仍落在 64 型内，保证榜单可用。

### 稀有度（`lib/rarity.ts`）

现实约束：六维先验的联合概率只能落在 **0.64%–3.24%**，绝对意义上不存在「万里挑一」。
因此采用两层机制：

1. **概率**：`prior = ∏ 各维极向概率`（E/I 55:45、S/N 65:35、T/F 50:50、J/P 55:45、A/C 60:40、O/H 45:55）
2. **档位**：按概率升序排名 → 分 7 档（万里挑一 → 无处不在）

关键实现细节：

- `rank 1 = 概率最低 = 最稀有`（早期版本把降序结果当名次，已修复）
- 概率完全相同的型别**共享同一档位**，分档边界会对齐到并列组边界
- 每档人数目标为 `[3,6,7,10,12,14,12]`，实际因并列会微调（当前 `[2,6,8,10,12,12,14]`）
- 统计融合：`p = (prior × W + observed × n) / (W + n)`，`W = 200`（`blendStats`）
- 展示的「每 1000 人约 X 人」始终来自概率换算，档位名只是体感标签

### 匹配（`lib/match.ts`）

- 每维映射到 `-100…+100`，相似 = L1 距离最小，互补 = 距离最大
- 相似度按用户自身极向向量归一化（与自己完全一致 = 100，六维全反 = 0），
  避免答题强弱不同导致「最像自己的型」只有 40–60%
- 恋爱兼容度在距离 ≈ 300 时最高（太像缺张力，太不像难沟通），输出 35–96

---

## 5. 目录结构

```
app/
  page.tsx                首页（结果预览 / FAQ / 续答提示 / 深链高亮）
  test/page.tsx           答题页（客户端状态机）
  result/page.tsx         结果页（本地计算，noindex）
  rank/page.tsx           64 型稀有度榜单
  poster-preview/         模式海报预览（内部工具，noindex + robots 屏蔽）
  type/[code]/page.tsx    64 个静态型别页（generateStaticParams）
  type/[code]/opengraph-image.tsx  每型一张 OG 图（构建期生成）
  sitemap.ts / robots.ts / icon.svg
components/               视觉与交互组件（雷达、金字塔、海报、付费墙…）
data/
  schema.ts               唯一数据契约（维度 / 场景 / 结果类型）
  questions.zh-CN.ts      120 道题（60 道 core）+ 彩蛋文案
  types64.ts              16 基础型 × 4 后缀文案（原创中文）
  typeProfiles.ts         16 基础型的相处与成长档案
  bookEnriched.json       由书稿抽取的结构化内容（脚本生成，勿手改）
lib/
  scoring.ts              计分引擎
  rarity.ts               稀有度 / 金字塔 / 统计融合
  match.ts                相似与互补匹配
  store.ts                zustand + localStorage 断点续答
  poster.ts               多尺寸 Canvas 海报（结果 + 模式）
  share.ts                分享文案
scripts/
  assets-hifi.mjs         高保真原图 stash / restore / status
  extract-book-data.mjs   书稿 → bookEnriched.json
  render-*.mjs            卡片与海报批量渲染（playwright-core）
  audit-personality-data.mjs  题库 / 数据契约审计
tools/                    离线资产生成与验收脚本（含 archive/ 一次性脚本）
tests/                    8 个文件 / 162 条单元测试
docs/                     审计、规格、设计系统、实施报告与 STATUS.md
书-千分之一的你/          书稿源文件（33 个 md）
```

`assets-hifi/`（本地，已忽略）存放高保真 PNG 原图；`docs/book-visual/refs/` 与
`docs/试做图/` 的图片同样只本地保留，不进仓库。

---

## 6. 测试与质量

```bash
npm run verify   # 数据审计 + 类型检查 + 162 条单测 + 构建
```

覆盖重点：反向计分符号、后缀 2/3 投票门槛与摇摆型、强度分档边界（55 / 70）、
并列名次、档位分桶合计 64、同概率同档、融合后排序方向、相似度归一化、
相似/互补距离、文案占位符白名单、64 型档案字段覆盖。

`.github/workflows/ci.yml` 在 push / PR 上执行同一套校验（Node 20 + `npm ci`）。

发布后另外做了 10 轮真实浏览器回归（Playwright + axe-core），详见
[`docs/迭代与问题记录.md`](docs/迭代与问题记录.md)。当时状态：

- 0 横向溢出（375 / 390 / 1440 三档视口）
- 0 控制台错误 / 失败请求
- axe-core：首页、榜单、型别页、答题页、结果页、分享面板、付费墙 **0 严重/致命违规**
- 64 个型别页：0 断链、67 条唯一标题、64 张 OG 图预生成

---

## 7. 数据与隐私

| 数据 | 位置 | 是否上传 |
|------|------|----------|
| 答题记录 | `localStorage["p64:v1"]` | 否 |
| 结果 | 由答案现算，不落库 | 否 |
| 解锁状态 | `localStorage` | 否（Demo） |

清空方式：答题页「重新开始」，或浏览器清除站点数据。

---

## 8. 已知限制 / Roadmap

- **统计接口**：静态导出不支持 API Route，`POST /results` 聚合统计暂未启用；
  迁到 Node 托管（Vercel / 自建）后可加 `app/api/results`，`blendStats` 已就绪
- **真实支付**：付费墙目前只做本地解锁，接支付时需服务端校验订单
- **管理后台**：题目管理 / 数据看板未实现
- **字体**：海报与页面用系统字体栈，未内嵌 CJK 字体（避免 5MB+ 体积）
- **emoji**：少数无彩色字体环境（精简 Linux）会显示为方框，属于装饰性元素，不影响功能
- **ESLint / Lighthouse**：尚无 lint 规则与 Lighthouse 实测分数，属于后续增强项

---

## 9. 免责声明

本项目为**娱乐与自我探索**工具，不构成心理咨询、诊断或医疗建议。
人格是流动的，任何测评都不能定义一个人。64 型命名、题目与文案均为原创，
与任何商标测评无隶属关系。名人组合仅为公开访谈印象的娱乐性猜测。
