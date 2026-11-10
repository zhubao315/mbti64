# 算法与数据契约规格（Algorithm Spec）

**基线 commit**：`9c7c6bb`（origin/main）  
**审计日期**：2026-11-07  
**适用范围**：Phase 0 冻结；Phase 1–7 实现必须逐条满足本文件  
**原则**：本文件只描述现状与保护约束，不改变任何评分规则。

---

## 1. 数据契约

### 1.1 维度（`data/schema.ts`）

| 维度 | poleA | poleB | 含义 | 类型 |
|---|---|---|---|---|
| EI | E | I | 能量方向 | 基础维 |
| SN | S | N | 信息方式 | 基础维 |
| TF | T | F | 决策依据 | 基础维 |
| JP | J | P | 生活节奏 | 基础维 |
| AC | A（坚定 Assertive） | C（内省 Cautious） | 自我姿态 | 后缀维 |
| OH | O（探索 Original） | H（守成 Habitual） | 变化偏好 | 后缀维 |

- `DIM_ORDER = ["EI","SN","TF","JP","AC","OH"]`，顺序参与基础型拼接与雷达图。
- `LIKERT_VALUES = [2, 1, 0, -1, -2]`，索引 0 = 非常同意，索引 4 = 完全不同意。
- 题型：`likert | binary | image`；`set: core | extra`；`reverse?: true`。

### 1.2 题库（`data/questions.zh-CN.ts`）

实测规模（由 `tests/data.test.ts` 锁定）：

| 指标 | 数值 | 说明 |
|---|---|---|
| 总题量 `TOTAL_QUESTIONS` | 120 | 完整模式 |
| 精简题量 `QUICK_QUESTIONS` | 60 | core 子集 |
| 每维题量 | 20 | 10 core + 10 extra |
| 基础维题型 | 14 Likert + 4 binary + 2 image | EI/SN/TF/JP |
| 后缀维题型 | 14 Likert + 6 binary | AC/OH 无图片题 |
| 每维反向题 | 2–3 道 | `reverse: true` |
| 题目 id | 120 个唯一 | `QUESTION_BY_ID` 可反查 |
| 排题顺序 | 六维轮转交错 | `SESSION_ORDER` = `interleave()` |

`binary` 题选项顺序固定：选项 0 恒为 poleA 侧；`image` 题四选二，两侧均衡。

### 1.3 64 型数据结构（`data/types64.ts`）

**基础型 `BaseType`（16 条）字段**：`code`、`cn`、`group`、`tagline`、`description`、`keywords`、`strengths`、`blindspots`、`celebrities`、`loveStyle`、`workStyle`、`sideHustles`、`socialGuide`、`growth`、`emoji`、`quote`、`analysis`（5 节长文）。

**后缀 `SUFFIX_MODIFIERS`（4 条）**：`letter`、`name`、`tagline`、`description`、`addStrength`、`addBlindspot`。

**64 型组装**：`ALL_TYPES = BASE_TYPES.flatMap(base => [A-O, A-H, C-O, C-H])`，`TYPE_CODES` 为 64 个唯一编码，`TYPE_BY_CODE` 为反查表。

> 与任务书「64 型档案 20 字段」的差距（审计发现，不改数据结构，仅记录）：
> 现有结构没有独立的 `englishName`、`traits`、`communication`、`relationship`、`stressResponse`、`growthAdvice`、`similarTypes`、`complementaryTypes`、`rarity`、`probability` 字段。
> 其中 `similarTypes` / `complementaryTypes` 由 `lib/match.ts` 运行时计算；`rarity` / `probability` 由 `lib/rarity.ts` 运行时读取；其余字段在 Phase 2 可通过**新增可选字段 + 构建期派生**补齐，不得改动已有字段语义与 64 编码。

---

## 2. 计分算法（`lib/scoring.ts`）

### 2.1 单维统计（`tallyDimension`）

对属于该维度的每道题：

- Likert：`value = LIKERT_VALUES[idx]`；`sum += reverse ? -value : value`；`max += 2`。
- Binary / Image：`choice = choices[idx]`；`signed = choice.pole === poleA ? +1 : -1`；`sum += signed`；`max += 1`。
- Binary 额外统计票数：`binA += (signed > 0)`，`binB += (signed < 0)`。

未作答或非法索引直接跳过，不进入 `sum` / `max`。

### 2.2 维度百分比

```
percentA = max === 0 ? 50 : round1(clamp(50 + 50 * sum / max, 0, 100))
percentB = round1(100 - percentA)
preferred = round1(max(percentA, percentB))
```

- `round1` = 保留 1 位小数。
- 平票（`percentA === 50`）判定为 poleA 侧（`percentA >= 50`）。

### 2.3 强度分档（`strengthOf`）

| 主导侧百分比 | strength | 中文 |
|---|---|---|
| `< 55` | `fuzzy` | 模糊 |
| `55 – <70` | `moderate` | 较强 |
| `>= 70` | `strong` | 显著 |

### 2.4 后缀维投票（A/C、O/H）

```
voteTotal = binA + binB
need = totalVotes <= 0 ? 1 : ceil(totalVotes * 2 / 3)
```

- 完整模式 6 题 → `need = 4`；精简模式 3 题 → `need = 2`（若该维全部作答）。
- `binA >= need` → poleA；`binB >= need` → poleB。
- 两者都不满足（平票或弱多数）→ `swing = true`，`pole` 暂取 Likert 倾向。
- `voteTotal === 0`（没有二选一证据）→ `swing = (strength === "fuzzy")`。

### 2.5 结果编码（`scoreTest`）

```
base = dims.EI.pole + dims.SN.pole + dims.TF.pole + dims.JP.pole
code = base + "-" + dims.AC.pole + "-" + dims.OH.pole     // 永远落在 64 型内
displayCode = base + "-" + (swing.AC ? "?" : AC.pole) + "-" + (swing.OH ? "?" : OH.pole)
group = BASE_GROUPS[base] ?? "analyst"
complete = answeredCount >= totalCount && totalCount > 0
```

`TestResult` 顶层字段固定 11 个：`base`、`code`、`displayCode`、`group`、`dims`、`swing`、`mode`、`answeredCount`、`totalCount`、`complete`、`scoredAt`。
`scoredAt` 为运行时时间戳，不参与任何判定；基线测试传入固定 `now`。

### 2.6 阵营映射（`BASE_GROUPS`，不可变）

- analyst：INTJ / INTP / ENTJ / ENTP
- diplomat：INFJ / INFP / ENFJ / ENFP
- guardian：ISTJ / ISFJ / ESTJ / ESFJ
- adventurer：ISTP / ISFP / ESTP / ESFP

---

## 3. 稀有度算法（`lib/rarity-core.js` → `lib/rarity.ts`）

### 3.1 先验概率

```
DIM_PRIOR = { EI: 0.55(E), SN: 0.65(S), TF: 0.50(T), JP: 0.55(J), AC: 0.60(A), OH: 0.45(O) }
priorProbability(code) = ∏ 每一维取对应极的概率
```

实测（2026-11-07，64 型全量）：

| 指标 | 结果 |
|---|---|
| 概率最小值 | 0.006379（INFP-C-O、INTP-C-O） |
| 概率最大值 | 0.032443（ESFJ-A-H、ESTJ-A-H） |
| 概率总和 | 1.000000（归一） |
| 每 1000 人换算 | 6.4 – 32.4 人 |

> 结论：「万里挑一」等七档名称**只能作为相对等级名称**，不是绝对人口统计。站内 `/rank`、结果页、`lib/rarity.ts` 注释均已声明；Phase 2 需延续该声明。

### 3.2 排名

- 按 `probability` 升序排序（同概率按 `code.localeCompare`），rank 1 = 最稀有。
- 同概率型别共享排名与 `rankLabel`（如 `1–2`）。
- 全站 64 型共有 16 个并列组，rank 覆盖 1–64。

### 3.3 分档（七档）

目标桶 `TIER_BUCKETS = [3, 6, 7, 10, 12, 14, 12]`（合计 64），实际按「并列组边界」对齐，**同概率不会跨档**。

实测档位分布：

| tierIndex | key | 名称 | 实际型数 | 首个名次段 | 该档 per1000 代表值 |
|---|---|---|---|---|---|
| 0 | oneInTenThousand | 万里挑一 | 2 | 1–2 | 6.4 |
| 1 | extremelyRare | 极稀有 | 6 | 3–8 | 7.8 |
| 2 | rare | 稀有 | 8 | 9–14 | 9.5 |
| 3 | oneInThousand | 千分之一 | 10 | 17–18 | 11.6 |
| 4 | oneInHundred | 百分之一 | 12 | 27–32 | 14.3 |
| 5 | common | 常见型 | 12 | 39–40 | 17.5 |
| 6 | everywhere | 无处不在 | 14 | 51–56 | 21.7 |

> 实际数量与目标桶的差异（2/6/8/10/12/12/14）来自并列组对齐，属于算法既定行为，**不得为了让桶数「好看」而拆并列组**。

### 3.4 派生字段

```
per1000   = max(0.1, round(probability * 10000) / 10)
beatPercent = round((1 - cumulativeRarer - groupShare) * 1000) / 10
percent   = round(probability * 1000) / 10        // 0–100 百分比
```

- `blendStats(stats, priorWeight=200)` 为贝叶斯线性融合入口；当前站点无后端样本，`PRIOR_TABLE` 的 `source = "prior"`、`sampleSize = 0`。
- `rarityPyramid()` 按档聚合 `count` / `share` / `codes`，是首页与结果页金字塔的唯一数据源。

### 3.5 唯一事实源约束

`PRIOR_TABLE` / `RARITY_TABLE` / `TYPE_CODES` 是稀有度的唯一来源。页面、脚本、海报不得自行重算 rank / per1000。

---

## 4. 相似 / 互补算法（`lib/match.ts`）

```
vectorFromDims(dims) = [round((percentA - 50) * 2) ...]   // 六维，-100…+100
vectorFromCode(code) = 每维 poleA 取 +100，poleB 取 -100
L1 = Σ |a_i - b_i|；MAX_L1 = 600
similarity = round((1 - L1 / 600) * 100)
相似 = L1 最小（并列按 code 升序）取 3
互补 = L1 最大（并列按 code 升序）取 3
```

`loveCompatibility` 为内容向娱乐分数：`100 - |L1 - 300| / 3`，夹在 35–96，不作为关系预测。

---

## 5. 本地存储与恢复（`lib/store.ts`）

- **存储键**：`p64:v1`（`lib/store-key.ts`，不得更改）。
- **persist version**：`2`，`migrate: migrateV1`。
- **持久化字段**：`mode`、`answers`、`index`、`startedAt`、`finishedAt`、`seenEggs`、`unlocked`。
- **按模式隔离**：`answers[mode]`、`index[mode]`、`startedAt[mode]`、`finishedAt[mode]`，`mode ∈ {"quick","full"}`。
- **写入校验**：`answer()` 只接受属于当前 `SESSION_ORDER` 的题目 id 与合法整数索引。
- **游标约束**：`clampIndex(index, answered, total)` 保证 `index <= answered`；`next()` 不能越过已答数。
- **恢复清洗**：`normalize()` 删除不属于当前模式的答案、过滤非数字值、把游标拉回第一道未答题。
- **结果不持久化**：`computeResult()` 每次由 `answers` 现算，避免题库变更后结果陈旧。
- **v1 → v2 迁移**：旧扁平 `answers` / `index` 归入旧 `mode` 对应槽位，不清空历史进度。

---

## 6. 题目与算法的审计观测（只记录，不改动）

| # | 观测 | 证据 | 影响 | 建议（需用户批准后才执行） |
|---|---|---|---|---|
| 1 | 二选一题在 `percentA` 中权重为 1，Likert 为 2 | `tallyDimension` 中 `max += 2` vs `max += 1` | 同一维度内题型权重不等；对后缀维影响有限 | 保持现状；若未来引入「加权」需单独版本化并做回归快照 |
| 2 | 后缀维 `percentA` 混合 Likert 与 binary，而字母由票数决定 | `scoreDimension` L114-L138 | 可能出现「百分比偏向 A、字母却是 B」 | 已有 `binary` 明细在结果页展示，建议补一句「字母以投票为准」的说明；不改算法 |
| 3 | 七档名称与绝对概率不对齐 | 见 §3.1 | 用户可能误解为真实人口比例 | 保留相对等级命名 + 显著标注「理论先验」；Phase 2 强化 |
| 4 | `TF` 先验为 0.50，两极化概率相等 | `DIM_PRIOR.TF` | 排名由 code 字典序打破并列 | 属既定模型，不改 |
| 5 | `voteThreshold(0) = 1` 分支在当前题库不可达 | 每题均有 binary，完整答题时 `voteTotal > 0` | 无实际影响 | 保留为防御式代码 |
| 6 | `scoredAt` 使用 `Date.now()` | `scoreTest` 默认参数 | 结果对象非纯函数 | 基线测试固定 `now`；UI 不展示该字段 |

> 未发现题目文本、选项极向、反向题数量、id 唯一性方面的错误。题目文本**不在本次改造中修改**。

---

## 7. 不可变清单（红线）

以下内容在任何 Phase 中都不得改变语义、输入或输出：

1. 16 个基础型编码与名称。
2. 4 个后缀字母 A/C/O/H 及其判定规则。
3. 64 型编码生成方式与 `TYPE_CODES` 集合。
4. 六维模型与 `DIMS` 的 poleA/poleB 映射。
5. 60/120 题库、题目文本、选项文本与极向。
6. 正反向计分（`reverse` 取负）与 `LIKERT_VALUES`。
7. 后缀维 `ceil(2/3)` 投票门槛与 `swing` 机制。
8. 七档稀有度分组名称、顺序与「并列不拆档」规则。
9. 相似 / 互补推荐算法（L1 距离）与 3 + 3 数量。
10. localStorage 键 `p64:v1`、字段结构与 v1→v2 迁移。
11. 中断恢复与游标归一化行为。
12. 结果由 `answers` 现算、不入库的设计。

---

## 8. 验证命令

```powershell
npm run test                 # 6 files / 146 tests
npm run audit:personality    # 9 项数据审计
npm run typecheck
npm run build
```
