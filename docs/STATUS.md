# 项目状态（单一事实源）

> 最后更新：2026-11-09
> 本文件是「当前状态」的唯一权威来源。README 引用本文件；`docs/` 下其他报告
> （`audit-report.md`、`implementation-report.md`、`test-report.md` 等）是各自时间点
> 的历史快照，其中的数字**不追溯修改**。

---

## 1. 版本与部署

| 项 | 当前值 |
|---|---|
| 开发分支 | `redesign/mbti64-v2`（upstream 已设置，与 `main` 一致） |
| `main` | 与 v2 一致（2026-11-09 快进合并） |
| `gh-pages` | `664ecb7`，已部署修复 basePath 后的 v2：530 文件 / 73 PNG / 256 webp / 74 HTML |
| 线上地址 | <https://zhubao315.github.io/mbti64/> |
| 其他本地分支 | `recovery/stage4-wip`、`feat/rarity-core-split`（历史 WIP，未合并） |

上线方式：`git push origin redesign/mbti64-v2:main` 快进合并；
**`npm run build:pages`（必须带 `/mbti64` basePath）** 生成 `out/`，再用
`scripts/deploy-ghpages.sh` 把 `out/` 作为新快照追加到 `gh-pages`（父节点为
旧部署提交，**未重写历史**）。旧的 457 张 PNG 已从部署树移除，但仍在历史中。

> **2026-11-09 故障复盘**：首次部署用 `npm run build`（未注入 basePath），
> 产物资源写成 `/_next/...`、`/assets/...`，挂到 `/mbti64/` 子路径后全部 404，
> 整站只剩 HTML 空壳。随后把 gh-pages 回退到上线前快照 `12dae87`，但该次
> `pages build and deployment` 工作流失败，线上并未恢复；最终用正确 basePath
> 重新构建并部署 `664ecb7`，deploy 步骤 success，8 个关键 URL 实测全 200。
> 教训：**推送 gh-pages 成功 ≠ 上线成功**，必须确认 Pages 工作流 success；
> 部署只能用 `npm run build:pages`，它会在构建后校验资源前缀。

---

## 2. 验证基线

| 检查 | 命令 | 当前结果 |
|------|------|----------|
| 数据审计 | `npm run audit:personality` | 通过（0 错误，2026-11-10 重跑） |
| 类型检查 | `npm run typecheck` | 0 error（2026-11-10 重跑） |
| 单元测试 | `npm test` | 13 文件 / **227 条**（2026-11-11 重跑，全部通过） |
| 部署构建 | `npm run build:pages` | ✅ 78 个静态页、basePath 校验通过（2026-11-09） |
| 静态构建 | `npm run build` | 78 个静态页；**根路径产物，不可用于 Pages 部署** |
| 全量校验 | `npm run verify` | 审计 + 类型 + 单测 + 构建 |
| CI | `.github/workflows/ci.yml` | Node 20 + `npm ci`，push / PR 触发，已有 success 记录 |

`out/` 已由完整构建刷新：`robots.txt` 屏蔽 `/result/` 与 `/poster-preview/`，
预览页带 `noindex, nofollow`，产物 44 MB / 74 个 HTML。

> 本地沙箱提示（环境问题，非代码缺陷）：
> - Vitest 偶发 `EPERM: ... %TEMP% ... ssr`，会随机漏跑一个测试文件并返回退出码 1；
>   单独运行该文件（如 `npx vitest run tests/data.test.ts`）全部通过。
> - Next 14.2.15 会无条件以追加模式打开 `.next/trace`，本机运行环境对该写入
>   返回 `EPERM`，且该写入流没有 error 处理，会在编译成功后让构建崩溃。
>   普通终端与 CI 环境无此限制；CI 是发布前的权威验证通道。

首屏包体参考：共享 87.4 kB；结果页 229 kB 最重，首页 102 kB。

---

## 3. 测试数量口径演进

历史文档里的数字都是当时快照，差异来自测试文件的增删，不是口径错误：

| 数字 | 出处 | 时点 |
|------|------|------|
| 85 | README（v1）、`docs/2026-11-04-acceptance-report.md` | 4 个测试文件时期 |
| 146 | `docs/audit-report.md`、`functional-baseline.md` | v2 基线，6 个测试文件 |
| 156 | `docs/implementation-report.md`、`test-report.md` | 新增 answer-checks + type-profiles 后，8 文件 |
| **227** | **当前**（`npm test`） | 新增 `psychometrics.test.ts` 25 条 + `chemistry.test.ts` 10 条 + `practice-recommend.test.ts` 9 条 |

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
- **部署构建只用 `npm run build:pages`**：它注入 `/mbti64` basePath 并校验
  `out/index.html` 的资源前缀；`npm run build` 是根路径产物，禁止用于 Pages
- 推送 `gh-pages` 后必须确认 `pages build and deployment` 工作流 success 才算上线
- 部署只用站点实际引用的资源：`scripts/deploy-ghpages.sh` 会排除 `out/64-cards/`
  （外部同步工具写入、站点未引用）以及 `~syncthing~*` / `*.sync-conflict-*` /
  `*.tmp`，避免把同步中的瞬时状态发布到线上

---

## 6. 待办与已知风险

| 优先级 | 事项 |
|--------|------|
| 高 | `gh-pages` 历史中的 342 MB PNG（重写历史需协调；线上树已移除） |
| 中 | 补 ESLint 规则（代码中已有 5 处 `eslint-disable-next-line` 注释，但尚无 lint 配置） |
| 中 | Lighthouse 移动版实测（v2 任务清单 P6-9 未跑） |
| 低 | `ResultClient.tsx`（24 KB）、`lib/poster.ts`（900+ 行）组件拆分 |
| 低 | 结果页动态 import `lib/poster.ts`，压低 229 kB 首屏包 |
