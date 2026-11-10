# 功能基线（Functional Baseline）

**基线 commit**：`9c7c6bbd890d96c38e4608b2345382b19254baa0`（`origin/main`，2026-11-07）  
**基线日期**：2026-11-07  
**用途**：Phase 1–7 任何改动前后，以本文件为对照，确认「相同输入 → 相同输出」。  
**结论**：当前基线全部测试通过（146/146），人格数据审计 9/9 通过。

---

## 1. 冻结范围

以下文件在基线 commit 上的 Git blob 哈希已记录，若被修改必须显式说明原因并重跑全量回归：

| 文件 | Blob SHA | 保护级别 |
|---|---|---|
| `lib/scoring.ts` | `a1d9961061a9aa471fc29f6894d76cae8770c9d9` | **算法核心 · 不可改语义** |
| `lib/rarity-core.js` | `7c1b6fd876b8ccd2c6d3966d8ac86a6ad88ee5f1` | **稀有度唯一事实源 · 不可改算法** |
| `lib/rarity.ts` | `605d281b0830f391cb0f2c050674d4032f3ff5e6` | 稀有度装配 · 可加展示字段，不改数值 |
| `lib/store.ts` | `88c6da11f6837e483ae1cc878a8b508b34ecd334` | **存储结构 · 只允许向后兼容扩展** |
| `lib/match.ts` | `593b0404c5430a48876d45ec694bb3431a4b87e2` | 相似/互补算法 · 不可改 |
| `data/questions.zh-CN.ts` | `4a67de932e8bec9f70bb556fa26b7103431e1db0` | **题库/题目文本 · 不可改** |
| `data/schema.ts` | `127312b558c15bb0de0d8272853a2f33934513cc` | **数据契约 · 只允许新增可选字段** |
| `data/types64.ts` | `7762e4f5d1914d0d593b07b13154fb525c882e99` | 64 型名称/文案 · 可补字段，不改编码与既有语义 |

> 基线快照即上述 commit；**不打 tag**（遵守「不动 tag」约束），以 commit SHA 作为唯一基准。

---

## 2. 受保护的功能契约

| # | 契约 | 实现位置 | 锁定测试 |
|---|---|---|---|
| 1 | 六维模型与 poleA/poleB 映射 | `data/schema.ts` `DIMS` | `algorithm-regression.test.ts` · DIMS 元数据 |
| 2 | Likert 五档分值 `[2,1,0,-1,-2]` | `data/schema.ts` `LIKERT_VALUES` | `algorithm-regression.test.ts` |
| 3 | 正向/反向计分 | `lib/scoring.ts` `tallyDimension` | `scoring.test.ts` |
| 4 | 维度百分比公式 | `lib/scoring.ts` `scoreDimension` | `scoring.test.ts`、回归快照 |
| 5 | 强度分档 `<55 / 55–70 / ≥70` | `lib/scoring.ts` `strengthOf` | `algorithm-regression.test.ts` |
| 6 | 后缀投票门槛 `ceil(2/3 × 票数)` | `lib/scoring.ts` `voteThreshold` | `algorithm-regression.test.ts` |
| 7 | 摇摆型 `swing` 与 `displayCode` 的 `?` | `lib/scoring.ts` L120-L138 / L182 | `scoring.test.ts`、回归快照 |
| 8 | 64 型编码 = base + AC + OH | `lib/scoring.ts` `scoreTest` | `algorithm-regression.test.ts` |
| 9 | 16 基础型 → 4 族群映射 | `lib/scoring.ts` `BASE_GROUPS` | `algorithm-regression.test.ts` |
| 10 | 60/120 题库与题目文本 | `data/questions.zh-CN.ts` | `data.test.ts` |
| 11 | 每维反向题 2–3 道 | 同上 | `data.test.ts` |
| 12 | 题型配比（14L+4B+2IMG / 14L+6B） | 同上 | `data.test.ts` |
| 13 | 64 型完整性、编码唯一 | `data/types64.ts` | `data.test.ts`、`audit:personality` |
| 14 | 稀有度先验与七档分组 | `lib/rarity-core.js` | `rarity.test.ts` |
| 15 | 相似/互补 L1 距离与 3+3 | `lib/match.ts` | `match.test.ts` |
| 16 | 进度口径 = 已答数 / 总题数 | `lib/progress.ts` | `progress.test.ts` |
| 17 | localStorage 键与结构 | `lib/store.ts` + `lib/store-key.ts` | 无自动化测试（**需补**，见 §6） |
| 18 | 断点恢复与游标归一化 | `lib/store.ts` `normalize()` | 代码审计；**需补测试** |

---

## 3. 页面功能清单（升级中必须保留）

| 页面 | 必须保留的功能 |
|---|---|
| `/` | 品牌 Header/Footer；60/120 双入口；64 型探索筛选；稀有度金字塔；FAQ；结果示例；最终 CTA；所有内链 |
| `/test` | 60/120 模式切换；单题作答；自动保存；刷新续答；退出与返回；重新开始（二次确认）；漏答检查；完成态生成结果；彩蛋不重复 |
| `/result` | 本地现算结果；`?` 摇摆展示；六维雷达与逐维读数；后缀投票明细；稀有度名次；相近 3 / 互补 3；分享海报；再测一次；返回首页；`noindex` |
| `/rank` | 七档分组与顺序；64 型全部可跳转；族群索引；`MyRankBar` 本地名次；剩余说明 |
| `/type/[code]` | 64 条静态页；canonical/OG；族群徽标；稀有度；5 节长文；相近/互补；后缀变体切换；同档型别；免责声明 |
| `/about` | 品牌视角、六维说明、族群说明、准确度边界 |
| `/privacy` | 本地优先、数据不上传、清除方式 |
| `/disclaimer`（待建） | 非临床诊断、非人口统计结论、非职业唯一依据 |

---

## 4. localStorage 基线结构

**键**：`p64:v1`（`lib/store-key.ts`）  
**持久化版本**：`version: 2`（`lib/store.ts`）  
**实际存储形态**（示意）：

```json
{
  "state": {
    "mode": "full",
    "answers": { "quick": { "EI-01": 0 }, "full": { "EI-01": 0, "SN-01": 2 } },
    "index": { "quick": 0, "full": 1 },
    "startedAt": { "quick": null, "full": 1762500000000 },
    "finishedAt": { "quick": null, "full": null },
    "seenEggs": [1],
    "unlocked": false
  },
  "version": 2
}
```

**兼容规则**：
- v1（扁平 `answers` / `index` / 单一 `mode`）→ 归入旧 mode 槽位，**不清空**。
- 新增字段只能通过 `migrate` 提供默认值；不得改变 `answers` 的 `Record<questionId, choiceIndex>` 语义。
- 结果不持久化，每次 `computeResult()` 现算。

---

## 5. 基线数值快照

| 指标 | 值 |
|---|---|
| 总题量 / 精简题量 | 120 / 60 |
| 每维题量 | 20（10 core + 10 extra） |
| 每维反向题 | 2–3 |
| 基础维题型 | 14 Likert + 4 binary + 2 image |
| 后缀维题型 | 14 Likert + 6 binary |
| 64 型 | 64 条，编码唯一 |
| 稀有度概率范围 | 0.006379 – 0.032443（总和 1.000000） |
| 每 1000 人 | 6.4 – 32.4 |
| 稀有度并列组 | 16 组，rank 1–64 |
| 七档实际型数 | 2 / 6 / 8 / 10 / 12 / 12 / 14 |
| 最稀有 | INFP-C-O、INTP-C-O（rank 1–2） |
| 最常见 | ESFJ-A-H、ESTJ-A-H（rank 63–64） |

**算法固定输入基线**：全部题目选索引 `2`（「说不清」）时，`mode=full`、`totalCount=120`、`answeredCount=120`、`complete=true`、`code` 为合法 6 字母编码、`displayCode` 允许 `?`。该行为由 `tests/algorithm-regression.test.ts` 固化。

---

## 6. 基线测试结果（2026-11-07）

### 6.1 单元/契约测试

```
npm run test
✓ tests/scoring.test.ts             21 tests
✓ tests/algorithm-regression.test.ts 50 tests
✓ tests/rarity.test.ts              26 tests
✓ tests/match.test.ts               16 tests
✓ tests/progress.test.ts            10 tests
✓ tests/data.test.ts                23 tests
Test Files 6 passed | Tests 146 passed
```

### 6.2 人格数据审计

```
npm run audit:personality
✅ 基础型数量 16
✅ 稀有度 64 型名次 1–64 完整且不重复，per1000 全正
✅ 稀有度脚本读取 lib/rarity-core.js
✅ lib/rarity.ts 引用唯一事实源
✅ 书稿覆盖 16 基础型
✅ 镜像导师 16 型双向映射一致
✅ 亚型数量 64（A-O / A-H / C-O / C-H 齐备）
✅ 无旧域名残留
✅ 64 条镜像导师链接有效
结果：9 项通过，0 警告，0 错误
```

### 6.3 构建基线（升级后复跑）

```
npm run typecheck
npm run build
```

产物应为 74 个静态页面（首页 + 榜单 + 关于 + 隐私 + 测评 + 结果 + 64 型别页 + 404 等，以构建输出为准），全部落在 `out/`，兼容 `/mbti64/` 子路径。

---

## 7. 回归协议（每个 Phase 结束必跑）

1. `npm run test` → 必须 ≥ 146 条全绿；新增测试只能追加，不得删改既有断言。
2. `npm run audit:personality` → 必须 9/9。
3. `npm run typecheck` → 0 error。
4. `npm run build` → 成功，页面数不减少。
5. 静态验收：`python -m http.server -d out`，按 `/mbti64/` 前缀逐页检查（或本地根路径等价检查）。
6. 页面验收：首页、`/test`（60/120）、退出恢复、改答案、`/result`、`/rank`、`/type/INFJ-A-O`、海报、移动导航。
7. 算法一致性：用同一份固定答题样本（全 `2`、全 `0`、全 `4`、随机固定种子四组）对比升级前后的 `code` / `displayCode` / `dims` / `swing` / `complete`，必须完全一致。

---

## 8. 变更纪律

- 不修改题目文本、选项文本、选项极向、`reverse` 标记。
- 不修改 `DIM_PRIOR`、`TIER_DEFS`、`TIER_BUCKETS`、`voteThreshold`、`strengthOf`、`BASE_GROUPS`。
- 不修改 `p64:v1` 键与 `answers` / `index` 语义；新增字段必须写 `migrate`。
- 不删除邮箱/付费/彩蛋等既有功能；需要下线时先记录并等待确认。
- 工作区中与本任务无关的未提交文件（`lib/poster.ts` 之外的海报脚本、`docs/book-visual/`、`scripts/*`、`tools/*`、`bun.lock`、`app/poster-preview/`）**不得回滚、不得提交、不得纳入构建验收**。
- 任何「看起来像 bug」的算法/题目问题，先写入 `docs/audit-report.md` 与 `docs/algorithm-spec.md` 的证据表，等待确认后再动。

---

## 9. 待补基线（Phase 0 后续）

| 项 | 原因 |
|---|---|
| localStorage 迁移测试 | 当前无自动化覆盖，只有代码审计 |
| 页面级回归脚本 | 现有 `tools/_tmp/regress-10x.mjs` 未纳入仓库正式测试 |
| 海报生成快照 | Canvas 输出像素级快照未固化 |
| 64 型 OG 图齐全性校验 | `/og/{code}.png` 需逐一确认存在 |
