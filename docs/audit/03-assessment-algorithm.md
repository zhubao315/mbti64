# 03 · 测评算法审计

**基线 commit**：`a38bfc0` · **核心文件**：`lib/scoring.ts`（210 行）· **数据契约**：`data/schema.ts`

---

## 0. 算法总览

```
120 题（full）或 60 题（quick）
    ↓ getQuestions(mode) → SESSION_ORDER[mode]（interleave 洗牌保证维度均匀分布）
    ↓ 每题包含：{ id, dim, type, set, reverse?, choices? }
    ↓
六个维度独立计分（EI / SN / TF / JP / AC / OH）
    ↓ tallyDimension() 逐题累加
    ↓ scoreDimension() → 单 DimScore { percentA, percentB, pole, strength, swing }
    ↓
四字母基础型 pole 拼接 + AC pole + OH pole
    ↓ 代码 = `${base}-${ac}-${oh}`
    ↓ displayCode 摇摆维度用 ? 替换（如 INFJ-?-O）
    ↓
BASE_GROUPS[base] → 阵营归属
    ↓
TestResult { base, code, displayCode, group, dims[6], swing, mode, complete, scoredAt }
```

---

## 1. 题库

### 1.1 两种模式

| 模式 | 题量 | 来源 | 洗牌方式 |
|---|---|---|---|
| `quick` | 60 题 | `CORE_QUESTIONS`（每维 10 题 × 6 维） | `interleave()` — 把各维度题穿插，避免同维度连续出现 |
| `full` | 120 题 | `ALL_QUESTIONS` = CORE（每维 10）+ EXTRA（每维 +10） | 同 `interleave()` |

### 1.2 题型

| 类型 | 题数比例 | 字段 | 计分方式 |
|---|---|---|---|
| `likert` | 主力（~70%） | 无 choices | 五档 +2/+1/0/-1/-2，反向题取反 |
| `binary` | 后缀维度专用 | 2 个 choices，各带 pole | 直接按 poleA/poleB 二选一 |
| `image` | 补充 | 4 个 choices | 同 binary，按 pole 归属打分 |

### 1.3 反向计分

`Question.reverse?: true` 标记——likert 题的 5 档分值全部取反。binary / image 题**不用** reverse 标记，因为 choices[i].pole 已直接指定。

---

## 2. 维度计分函数（`lib/scoring.ts`）

### 2.1 Likert 维度（EI / SN / TF / JP）

```ts
// LIKERT_VALUES = [+2, +1, 0, -1, -2]  五档索引 → 分值

tally.sum += q.reverse ? -value : value     // 反向题取反
tally.max += 2                             // 每题最大贡献 +2

percentA = clamp(50 + 50 * tally.sum / tally.max, 0, 100)
percentB = 100 - percentA

pole = percentA >= 50 ? meta.poleA : meta.poleB
strength = strengthOf(max(percentA, percentB))  // <55 模糊 / 55-70 较强 / >70 显著
```

**关键**：`50 + 50 * sum/max` 的公式把原始 -2…+2 分值映射到 0…100 的百分比。`percentA >= 50` 即 pole 取 A，等于 50 也取 A（边界偏向 poleA）。

### 2.2 后缀维度（AC / OH）— 混合 Likert + 二选一投票

```ts
// 先跟 Likert 维度一样跑一遍（有所有题型）
likertPole = percentA >= 50 ? poleA : poleB

// 然后只看 binary 类型题的二选一投票
// voteThreshold = ceil(total * 2/3)
if (binA >= threshold) pole = poleA
else if (binB >= threshold) pole = poleB
else {
  swing = true                    // 票数不足 2/3 → 摇摆型
  pole = likertPole               // 编码仍用 Likert 给的 pole（保证 64 型集合闭合）
}
```

**红线**：后缀维度的最终 `code` 字段**始终**来自 Likert 倾向（保证 64 个编码合法），摇摆体现在 `displayCode`（把 AC 或 OH 换成 `?`）和 `swing` 标记上。榜单、稀有度、匹配算法全部用 `code`，不区分摇摆。

### 2.3 缺失答案处理

```ts
if (typeof idx !== "number" || Number.isNaN(idx)) continue;
// tally.answered 累加，total 不累加 → percent = answered/total 近似
```

未答的题跳过，不计入 `tally.max`。结果：**未答会抬高已答题权重**。任务书 2.2 节禁止修改缺失处理——Phase 1–6 不改。

---

## 3. 代码生成函数

```ts
// lib/scoring.ts L169-L199
export function scoreTest(answers, questions, mode="full", now=Date.now()): TestResult {
  for (const key of DIM_ORDER) dims[key] = scoreDimension(key, answers, questions)
  base = ["EI","SN","TF","JP"].map(k => dims[k].pole).join("")   // 4 字母
  code = `${base}-${dims.AC.pole}-${dims.OH.pole}`              // 6 字母
  displayCode = `${base}-${dims.AC.swing ? "?" : ac}-${dims.OH.swing ? "?" : oh}`
  group = BASE_GROUPS[base] ?? "analyst"
  ...
}
```

### 代码规范正则

```ts
CODE_RE = /^[EI][SN][TF][JP]-[AC]-[OH]$/
// 例如 INFJ-A-O, ESTP-C-H
// 摇摆型 code 仍合法（A/C/O/H 不是 ?），displayCode 单独处理
```

### 16 基础型 → 4 阵营

| 阵营 | 基础型 | group key |
|---|---|---|
| 分析师 | INTJ, INTP, ENTJ, ENTP | analyst |
| 冒险家 | ISTP, ISFP, ESTP, ESFP | adventurer |
| 外交家 | INFJ, INFP, ENFJ, ENFP | diplomat |
| 守护者 | ISTJ, ISFJ, ESTJ, ESFJ | guardian |

**注意**：16Personalities 原始阵营名叫 Explorers，本项目用 Adventurer。品牌 CI 必须统一。

---

## 4. 稀有度计算（`lib/rarity.ts`）

### 4.1 先验概率（六维独立相乘）

```ts
DIM_PRIOR = { EI: 0.55, SN: 0.65, TF: 0.5, JP: 0.55, AC: 0.6, OH: 0.45 }
// 每个维度：poleA 侧概率

priorProbability("INFJ-A-O") {
  // base INFJ: E>I, N>S, T<F, J>P
  p  = 0.55 * (1-0.65) * (1-0.5) * (1-0.55)
  // 后缀 A: 0.6；O: 0.45
  p *= 0.6 * 0.45
  return p   // ≈ 0.05 × 0.35 × 0.5 × 0.45 × 0.6 × 0.45 ≈ 0.00106
}
```

### 4.2 分档（`TIER_DEFS` / `TIER_BUCKETS`）

7 档，按 priorProbability 升序排列，先验最小的型别分到最稀有的档。分档总数 = 64。

**关键风险**：档位文字（「万里挑一」≈0.01%、「千分之一」≈0.1%、「百分之一」≈1%）必须与实际先验分布校准——任务书第九章明确要求先审计后改字，**Phase 1–6 不改概率模型**。

### 4.3 匹配策略（`lib/match.ts` 或 `lib/scoring.ts` 衍生）

- 相近人格：六维 signedPercent 加权距离最小者
- 互补人格：六维极点相对者
- 同阵营：`BASE_GROUPS[base]` 相同

---

## 5. 结果数据结构（`data/schema.ts`）

```ts
TestResult {
  base           : "INFJ"           // 4 字母
  code           : "INFJ-A-O"       // 6 字母规范编码
  displayCode    : "INFJ-A-O"       // 摇摆维度用 ?
  group          : "diplomat"       // 阵营 key
  dims           : Record<DimKey, DimScore>  // 6 维完整得分
  swing          : { AC: boolean, OH: boolean }
  mode           : "quick" | "full"
  answeredCount  : 已答题数
  totalCount     : 总题数（60 或 120）
  complete       : answered === total
  scoredAt       : 时间戳
}
```

**没有单独的"结果存储"机制**——页面刷新或重进后，用户的 `answers` 还在 localStorage，可以立即重新 `computeResult()`。旧版结果不持久化（因为 answers 即"历史"）。

---

## 6. 测试基线（`tests/`）

| 文件 | 覆盖 |
|---|---|
| `tests/scoring.test.ts` | 各维度典型输入 → 输出（pole、percent、strength） |
| `tests/rarity.test.ts` | priorProbability + 7 档分布 + 64 型完整性 |
| `tests/data.test.ts` | 题库完整、64 型文案字段完整 |
| `tests/match.test.ts` | 相近 / 互补人格匹配结果 |

**缺口**：没有「固定输入集 → 新旧版本输出一致性」的回归快照测试。Phase 0 必须补充——这是任务书明确的红线。

---

## 7. 算法保护清单（Phase 1–6 严禁改动）

| # | 文件 | 函数 / 常量 | 语义 |
|---|---|---|---|
| 1 | `lib/scoring.ts` | `scoreDimension` | Likert 百分比公式、边界 50 归属 A |
| 2 | `lib/scoring.ts` | `voteThreshold` | 2/3 向上取整 |
| 3 | `lib/scoring.ts` | 后缀维度 swing 判定分支 | 票数不足 → swing=true, code 仍用 Likert pole |
| 4 | `lib/scoring.ts` | `scoreTest` 返回结构 | TestResult 字段名 / 类型 / 含义 |
| 5 | `lib/scoring.ts` | `BASE_GROUPS` 16→4 映射表 | 阵营归属 |
| 6 | `data/schema.ts` | `DIMS` 元数据 | 各维度 poleA / poleB 定义 |
| 7 | `data/schema.ts` | `LIKERT_VALUES = [2,1,0,-1,-2]` | 分值映射 |
| 8 | `data/questions.zh-CN.ts` | 题目 id / dim / reverse / choices | 题目本身（含反向标记） |
| 9 | `lib/rarity.ts` | `DIM_PRIOR` 六个数值 | 各维 poleA 概率假设 |
| 10 | `lib/rarity.ts` | `priorProbability` 函数 | 六维独立相乘的实现 |
| 11 | `data/types64.ts` | `ALL_TYPES` / `SUFFIX_MODIFIERS` | 文案虽然可以换，但**字段契约**不能变 |
| 12 | `lib/store.ts` + `lib/store-key.ts` | `STORAGE_KEY = "p64:v1"`, persist version | localStorage 键名和序列化版本 |

---

## 8. 基线测试建议（Phase 0 必须补充）

**目标**：锁定一套固定答题记录 → 对应 TestResult，后续改版完重新跑对比，字段一致才算安全。

**执行**（建议写成 `tests/algorithm-regression.test.ts`）：

```ts
// 准备一份固定 answers（可以是真实用户答题记录或合成的边界输入）
const FIXED_ANSWERS = {
  // EI 各 10 题、SN 各 10 题、...
  "q_01": 0, "q_02": 4, ...
}

// 运行当前版本
const result = scoreTest(FIXED_ANSWERS, ALL_QUESTIONS, "full")

// 断言以下字段与快照一致
expect(result.base).toBe("INFJ")
expect(result.code).toBe("INFJ-A-O")
expect(result.swing).toEqual({ AC: false, OH: false })
expect(result.dims.EI.percentA).toBeCloseTo(65.3, 1)
expect(result.dims.AC.binary).toEqual({ a: 4, b: 2, total: 6, need: 4 })
// ...
```

**Phase 1–6 任何改动前必须先跑过现有 85 个测试用例 + 新增的基线快照**。
