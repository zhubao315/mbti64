# 04 · 数据存储审计

**基线 commit**：`a38bfc0` · **核心文件**：`lib/store.ts`, `lib/store-key.ts`

---

## 1. 存储架构

### 唯一存储：localStorage + zustand/persist

```
key: "p64:v1"
JSON 结构：{
  version: 1,
  state: {
    mode:           "full" | "quick",
    answers:        Record<string, number>,  // { [questionId]: choiceIndex }
    index:          number,                   // 当前题序号
    startedAt:      number | null,            // 开始时间戳
    finishedAt:     number | null,            // 完成时间戳
    seenEggs:       number[],                 // 已展示过的彩蛋 index
    unlocked:       boolean                   // Demo 付费报告是否解锁
  }
}
```

### 版本管理

```ts
// lib/store.ts L99
persist({ version: 1, ... })
```

当前 **version = 1**。任务书 2.2 节禁止擅自改 key 或清空数据，后续加字段**必须用向后兼容方式**：

- 加字段 → zustand persist 自动用 initial 值填充未读旧数据
- 改字段 → 必须加 `migrate` 函数（当前没写）
- 删字段 → 不能删，只能标记废弃

---

## 2. 答题进度恢复流程

```
用户进入 /test
    ↓
persist.hasHydrated() → 等待 hydration
    ↓
从 localStorage 读回 { mode, answers, index }
    ↓
index 指向 SESSION_ORDER[mode][index]
    ↓
如果 index 已答过但没答完 → 停在第一道未答的题
如果 answers 全部完整 → 自动跳到 next 并显示完成入口
```

**保护点**（已实现）：
- `lib/store.ts` L63-L68：切换 mode 时保留已答题目，index 重置到第一道未答题
- `lib/store.ts` L62: `startedAt ?? Date.now()`：首次答题时才写入时间戳
- `useHydrated()` L131-L141：首帧 SSR 和客户端状态一致才渲染，避免 hydration mismatch

---

## 3. 没有独立"历史结果"存储

这是有意设计（`lib/store.ts` L17-L19 注释）：

> 只存 answers / mode / index —— 结果由 answers 现算，避免「存了结果但题目改了」导致数据不一致。

**含义**：
- 刷新页面 → answers 从 localStorage 读 → 立即可以重跑 `computeResult()` → 结果和当时答题时一致
- 真正的"历史结果列表"**没有**持久化能力。用户只能保存当前一次答题的答案；开始新的答题会覆盖 answers
- 任务书 2.1 节第 14 条「原有历史结果兼容能力」：**目前不存在历史结果存储**，兼容性指的是"旧版本的 answers 数据可以被新版本正确读取并重算"

### 旧数据兼容性风险

**假设用户手里还有 v1 的 localStorage，我们加了 v2 版本字段**：

```ts
persist({
  version: 2,
  migrate: (persisted, version) => {
    // version === 1 → 新版本没有字段 → 默认值填充 → 安全
    return { ...persisted.state }
  }
})
```

当前代码**没有写 migrate 函数**，但 zustand persist 的默认行为会用 initial 值填充缺失字段，所以实际是安全的——只是我们没有显式声明迁移策略。

---

## 4. 数据结构字段说明

| 字段 | 类型 | 写入时机 | 读时机 | 保护级别 |
|---|---|---|---|---|
| `mode` | `"quick"` / `"full"` | 用户选择模式时 | 全流程 | 高 |
| `answers` | `{ qid: 0..4 }` | 用户选选项时 | 渲染题目、算结果 | 最高 |
| `index` | 0..119 | next/prev/finish 时 | 当前题号 | 中 |
| `startedAt` | 时间戳 | 首次答题时 | 完成后显示用时 | 低 |
| `finishedAt` | 时间戳 | 完成时 | 完成后展示 | 低 |
| `seenEggs` | number[] | 彩蛋触发时 | 显示已触发过的彩蛋 | 低 |
| `unlocked` | boolean | 用户点击付费解锁 Demo | 结果页显示解锁按钮 | 低 |

---

## 5. 跨页面数据流向

```
/test 页面（答题）
    ↓ answers 实时写 localStorage
    ↓
用户点击"查看结果" → 跳转 /result
    ↓
/result 页面读取 useQuizStore.getState().answers
    ↓
computeResult({ answers, mode }) → scoreTest() → TestResult
    ↓
渲染雷达图、型别详情、海报生成
```

**同一套 answers 每次算结果都一样**（因为算法是纯函数），不存在"答题时算的结果"和"结果页重新算的结果"不一致的可能。

---

## 6. 未提交改动中已出现的数据迁移需求

git stash 里有 `lib/rarity.ts` 正在拆分 `rarity-core.js`，**这可能影响先验概率计算函数的引用路径**。

**保护动作**：
- stash 内容暂不合并到 `redesign/mbti64-v2`，审计期间主线不引入并发改动
- Phase 1 开始前先处理 stash：要么重新 apply 并解决冲突，要么合并到 `main` 后从 main 重新建分支

---

## 7. localStorage 实际样例（建议采集）

Phase 0 必须采集以下真实数据样本，用于回归测试：

| 场景 | 描述 | version |
|---|---|---|
| 未开始 | `answers:{}, index:0` | 1 |
| quick 模式答到第 20 题刷新 | `answers:{20}, index:20, mode:"quick"` | 1 |
| full 模式全部答完 | `answers:120 项, finishedAt` | 1 |
| 中途退出 + 7 天后回来 | 旧 answers 仍在，index 指向未答题 | 1 |
| 旧 v1 数据被新版本读取 | 缺少新增字段 → initial 填充 | 需验证 |

**采集方式**（建议在 DevTools Console 手动导出）：

```js
JSON.parse(localStorage.getItem("p64:v1") || "null")
```

---

## 8. 安全改造机制 Phase 0 已执行

| 步骤 | 状态 |
|---|---|
| 检查 Git 工作区未提交修改 | ✅ 13 个文件 stash 保存 |
| 建立独立改版分支 | ✅ `redesign/mbti64-v2` 从 `a38bfc0` |
| 保存原始版本基线 | ✅ `a38bfc0` commit 可随时 checkout |
| 记录关键存储文件 | ✅ `lib/store.ts` + `lib/store-key.ts` 已完整审计 |
| 建立现有功能清单 | ✅ 见 02-page-inventory.md |
| 准备补充基线测试 | ⏳ Phase 1 前执行 |

---

## 9. 存储相关改造红线

1. **`STORAGE_KEY` 不变**：`"p64:v1"` 保持，后续加字段用版本号 + migrate
2. **不直接删除 answers**：用户只能"重置"（store.reset()），改清空逻辑必须有二次确认
3. **结果仍用 answers 现算**：不引入独立的 result 持久化表，避免数据漂移
4. **version 字段语义**：persist version 只增不减，每次迁移写显式 migrate 函数
