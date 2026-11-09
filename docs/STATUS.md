# 项目状态（单一事实源）

> 最后更新：2026-11-09
> 本文件是「当前状态」的唯一权威来源。README 引用本文件；`docs/` 下其他报告
> （`audit-report.md`、`implementation-report.md`、`test-report.md` 等）是各自时间点
> 的历史快照，其中的数字**不追溯修改**。

---

## 1. 版本与部署

| 项 | 当前值 |
|---|---|
| 开发分支 | `redesign/mbti64-v2`（已设置 upstream，提交均已推送 origin） |
| `main` | `9c7c6bb`，落后 v2 分支若干提交 |
| `gh-pages` | `763039a`，部署内容为 `main@9c7c6bb`，即 **v2 成果尚未上线** |
| 线上地址 | <https://zhubao315.github.io/mbti64/> |
| 其他本地分支 | `recovery/stage4-wip`、`feat/rarity-core-split`（历史 WIP，未合并） |

上线方式：把 v2 合并进 `main`，用裁剪后的 `out/` 更新 `gh-pages`。

---

## 2. 验证基线

| 检查 | 命令 | 当前结果 |
|------|------|----------|
| 数据审计 | `npm run audit:personality` | 通过 |
| 类型检查 | `npm run typecheck` | 0 error |
| 单元测试 | `npm test` | 8 文件 / **162 条** |
| 静态构建 | `npm run build` | 78 个静态页（上一轮验证通过）；本轮因环境批量删除保护未重跑完成 |
| 全量校验 | `npm run verify` | 审计 + 类型 + 单测 + 构建 |
| CI | `.github/workflows/ci.yml` | Node 20 + `npm ci`，push / PR 触发 |

> **待完成**：当前 `out/` 是资产清理前的旧构建产物（`robots.txt` 未包含
> `/poster-preview/`，预览页也没有 `noindex`）。在普通终端或 CI 中重跑一次
> `npm run build` 即可刷新，之后才能部署。本轮会话中 `next build` 清理 `.next`
> 缓存时被运行环境的批量删除保护拦截（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`，
> 编译阶段本身已正常启动），与项目代码无关。

> 本地沙箱提示：Vitest 偶发 `EPERM: ... %TEMP% ... ssr` 导致随机漏跑一个测试文件
> 并返回退出码 1，属于当前运行环境的临时目录权限限制，不是代码缺陷；
> 单独运行该文件（如 `npx vitest run tests/data.test.ts`）全部通过，CI 环境不受影响。

首屏包体参考：共享 87.4 kB；结果页 229 kB 最重，首页 102 kB。

---

## 3. 测试数量口径演进

历史文档里的数字都是当时快照，差异来自测试文件的增删，不是口径错误：

| 数字 | 出处 | 时点 |
|------|------|------|
| 85 | README（v1）、`docs/2026-11-04-acceptance-report.md` | 4 个测试文件时期 |
| 146 | `docs/audit-report.md`、`functional-baseline.md` | v2 基线，6 个测试文件 |
| 156 | `docs/implementation-report.md`、`test-report.md` | 新增 answer-checks + type-profiles 后，8 文件 |
| **162** | **当前**（`npm test`） | `match.test.ts` 新增 6 条相似度用例后 |

当前分布：scoring 21、algorithm-regression 50、rarity 26、data 23、match 22、
progress 10、answer-checks 6、type-profiles 4。

---

## 4. 资产与体量

### 高保真原图机制

`public/` 会被 Next 静态导出整目录复制进 `out/`，但站点**只引用 webp**。
此前 385 张高保真 PNG（约 338 MB）躺在 `public/assets/` 下，白白让部署产物
膨胀到 381 MB。现在由 `scripts/assets-hifi.mjs` 管理：

| 命令 | 行为 |
|------|------|
| `npm run build` | 自动 `stash`：把原图移到项目内 `assets-hifi/`，并清除 `out/` 里的旧 PNG 副本 |
| `npm run assets:restore` | 放回 `public/`，供 `tools/gen_derived.py`、`gen_type_og.py` 等离线脚本使用 |
| `npm run assets:status` | 查看两边数量与体积 |

`assets-hifi/` 已加入 `.gitignore`：文件不丢失、不进仓库、不进部署产物。
`public/assets/brand/*.png`、`public/og/*.png` 是站点实际引用资源，**不移出**。

### 体量基线（2026-11-09）

| 目录 | 说明 |
|------|------|
| `public/` | 仅 webp 人像 + brand / og PNG，实测 24 MB（此前 361 MB） |
| `out/` | 裁剪后部署产物，实测 44 MB（此前 381 MB，−88%） |
| `assets-hifi/` | 本地原图 338 MB / 385 张，已忽略 |
| `docs/book-visual/refs/`、`docs/试做图/` | 本地参考图约 185 MB，已忽略，不入库 |
| `.git/` | 约 433 MB 松散对象，主要来自 `gh-pages` 历史上推送过的 457 张 PNG / 342 MB |

> 注意：`git gc` 只能打包，PNG 已压缩过，体积不会明显下降。要真正给仓库瘦身，
> 需要用 `git-filter-repo` / BFG 重写 `gh-pages` 历史；这会改写远端提交，
> 必须先备份并与协作者协调，属于独立任务，尚未执行。

---

## 5. 工程约定

- 包管理器统一 **npm**（`package-lock.json`）。`bun.lock` 只本地保留、已忽略
- Node 版本见 `.nvmrc`（20）；编辑器规范见 `.editorconfig`
- `package.json` 的 `dependencies` 只放站点运行时依赖；
  一次性渲染工具已在 `tools/archive/`，其额外依赖见该目录 README
- `/poster-preview` 是内部预览工具：`noindex` + `robots.txt` 屏蔽，不在 sitemap
- `data/bookEnriched.json` 由 `scripts/extract-book-data.mjs` 从书稿生成，请勿手改

---

## 6. 待办与已知风险

| 优先级 | 事项 |
|--------|------|
| 高 | 重跑 `npm run build` 刷新 `out/`，再执行部署（当前产物含旧 robots 规则） |
| 高 | v2 合并进 `main` 并更新 `gh-pages`，让线上跟上开发分支 |
| 高 | `gh-pages` 历史中的 342 MB PNG（重写历史需协调） |
| 中 | 补 ESLint 规则（代码中已有 5 处 `eslint-disable-next-line` 注释，但尚无 lint 配置） |
| 中 | Lighthouse 移动版实测（v2 任务清单 P6-9 未跑） |
| 低 | `ResultClient.tsx`（24 KB）、`lib/poster.ts`（900+ 行）组件拆分 |
| 低 | 结果页动态 import `lib/poster.ts`，压低 229 kB 首屏包 |
