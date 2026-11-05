# Phase 0 · 审计报告汇总

**阶段**：Phase 0 — 只读审计（不改代码）  
**分支**：`redesign/mbti64-v2`  
**基线 commit**：`a38bfc0` — 亮色人物插画上线 + 图片等比适配  
**审计日期**：2026-11-05  
**用户执行建议**：只做审计，不进入大规模代码改造  

---

## 审计文档清单

| 文件 | 核心内容 |
|---|---|
| [01 · 项目结构](01-project-structure.md) | 技术栈、目录、依赖体积、设计 Token 现状、部署流程 |
| [02 · 页面功能](02-page-inventory.md) | 6 个路由逐页审计、导航 IA 差距、关键功能保护清单 |
| [03 · 测评算法](03-assessment-algorithm.md) | 题库结构、六维计分、后缀 swing 机制、代码生成、稀有度计算、12 项算法保护清单 |
| [04 · 数据存储](04-data-storage.md) | localStorage 架构、答题恢复流程、版本管理、旧数据兼容、迁移策略建议 |
| [05 · UI/UX 审计](05-ui-ux-review.md) | Lighthouse 基线、品牌一致性、首页 IA 差距、测评交互、结果页密度、A11y、移动端 |

---

## 一、项目架构一句话总结

**Next.js 14 App Router 静态导出 + Tailwind + Zustand persist localStorage + Vitest 算法基线测试**。部署到 GitHub Pages `/mbti64` 子路径，basePath 通过环境变量注入。整体健康——Lighthouse 四项全 ≥ 80，A11y 满分，无重依赖，64 型全部 SSG。

---

## 二、页面与功能清单

| URL | 类型 | 核心算法 | 受保护级别 |
|---|---|---|---|
| `/` | SSG | 无 | 导航 / 首页入口不能删 |
| `/test` | 客户端 | `SESSION_ORDER`, `scoreTest` | 2.1 第 1-2 条：60/120 题入口保留 |
| `/result` | 客户端 | `computeResult` 现算 | 2.1 第 12-13 条：答题进度 + 结果展示 |
| `/rank` | SSG | `priorProbability` | 2.1 第 10 条：稀有度计算规则 |
| `/type/[code]` | SSG × 64 | `ALL_TYPES`, `SUFFIX_MODIFIERS` | 2.1 第 7 条：64 种人格编码 |
| root layout | 全局 | 无 | 导航 / 页脚共享不能拆 |

---

## 三、核心算法一句话总结

```
六维独立计分：Likert 百分比 poleA（边界 50 属 A）
后缀维度混合 Likert + 二选一投票：≥2/3 票数定 pole，否则 swing=true
摇摆展示为 ?，code 仍取 Likert pole（保证 64 型闭合）
最终 code = 4字母基础 + -AC + -OH → 64 型之一
```

**保护清单（Phase 1–6 严禁改动）**：12 项具体函数 / 常量见 03-assessment-algorithm.md §7。

---

## 四、数据结构与兼容性

- 存储键：`p64:v1`，zustand persist version=1
- 存什么：`{ mode, answers, index, startedAt, finishedAt, seenEggs, unlocked }`
- 结果**不持久化**：每次由 answers 现算，避免数据漂移（有意设计）
- **向后兼容**：persist 默认行为自动用 initial 值填充旧版本缺失字段，实际安全但缺显式 migrate 函数
- 旧数据恢复：刷新页面 → answers 从 localStorage 读回 → `computeResult()` 立即重算

**保护**：`STORAGE_KEY` 不变；persist version 只增不减；加字段必须写 migrate。

---

## 五、UI/UX 问题 TOP 10（按优先级）

| 级别 | 问题 | 位置 | 建议阶段 |
|---|---|---|---|
| **P0** | 答题"退出并保留进度"显式按钮缺失 | `/test` | Phase 4 |
| **P1** | 全局无设计 Token（`globals.css` 仅 13 行） | Phase 1 | 全局 |
| **P1** | 首页缺 6/10 Section：16×4=64 几何解释、六维模型、阵营展示、人格示例、最终 CTA | `/` | Phase 2 |
| **P1** | 导航缺"人格测评"独立项 + 缺独立 `/about` 页 | `layout.tsx` | Phase 1 |
| **P1** | 结果页 LCP 重 + 信息过载（>2500px 滚动） | `/result` | Phase 5 |
| **P1** | 型别详情主视觉容器 aspect-square 装 3:4 图留白多 | `/type/[code]` | Phase 3 |
| **P1** | 缺 4 阵营页面 / 按阵营筛选 | `/rank` | Phase 3 |
| **P1** | 题库二选一/四选项按钮点击区 < 44px | `/test` | Phase 4 |
| **P2** | 测评入口缺"还剩 X 题 / 预计 X 分钟"提示 | `/test` | Phase 4 |
| **P2** | 动效未响应 `prefers-reduced-motion` | 全局 | Phase 1 |

---

## 六、风险清单

| 风险 | 级别 | 说明 | 缓解 |
|---|---|---|---|
| **并发改动污染** | 高 | `lib/rarity.ts` 正在拆分 rarity-core + `data/bookEnriched` 重构 + `书-千分之一的你` 章节编辑 | 已 stash 在 main，Phase 0 审计期间主线纯净；Phase 1 开始前重新 apply 并解决冲突 |
| **stash 丢失** | 中 | 如果误删 stash，重构中的 rarity-core 拆分就没了 | 建议 Phase 1 开始前把 stash 单独建分支 `feat/rarity-core-split` 合并进 v2 |
| **稀有度先验 × 档位文字不对齐** | 高 | `DIM_PRIOR` 先验相乘结果范围（≈0.00000016 – 0.0007）可能和「万分之一/千分之一/百分之一」文字严重脱节 | Phase 9 先审计数值再改字，**Phase 1–6 不改概率模型** |
| **64 型文案修改 vs 算法冻结** | 中 | Phase 3 说"批量生成人格内容"，但算法/字段契约不能变 | 只改文案字段值，不改数据结构 |
| **Phase 5 结果页改组件导致算法回归** | 中 | 改视觉组件 = 改 UI，不改 `computeResult` 输入输出 | Phase 5 结束必须跑算法基线快照测试 |
| **GitHub Pages basePath 双前缀风险** | 低 | 已有 `withBasePath()` / `absoluteUrl()` 防护，但新组件可能漏调用 | Phase 6 部署验收时专门扫 `/mbti64/mbti64/` 类路径 |
| **部署自动化缺口** | 中 | 无 GitHub Actions，手动 push gh-pages | 建议 Phase 6 补 `.github/workflows/deploy.yml` |

---

## 七、建议的分阶段实施计划

### Phase 0 · 审计（当前完成）✅

**交付**：本文件 + 5 份审计  
**验收**：项目结构清楚、算法逻辑清楚、数据结构清楚、风险清单完整  
**已完成动作**：
- [x] 只读扫描 6 个路由 + 41 组件 + 12 lib 文件
- [x] Git stash 保护并发改动
- [x] 建立 `redesign/mbti64-v2` 基线分支
- [x] 识别 12 项算法红线、12 项功能保护项

**必须补的（Phase 1 前）**：
- [ ] 算法回归快照测试（`tests/algorithm-regression.test.ts`）
- [ ] 真实 localStorage 数据样本采集（7 种场景）

---

### Phase 1 · 品牌 CI 和设计系统

**目标**：建立统一 Token、导航组件、阵营组件  
**不改算法 / 不改数据结构**  
**关键交付**：
- `docs/design/brand-guidelines.md` — 品牌名、口号、四阵营色、Logo 使用
- `docs/design/design-tokens.md` — CSS 变量体系（brand/color/spacing/radius/typography）
- `docs/design/component-system.md` — Button/Card/Badge/人格组件规范
- 全站 `globals.css` 补完设计 Token
- 导航组件重构（加"人格测评"独立项 + 加独立 `/about` 页）
- 动效审计 + `prefers-reduced-motion` 降级

**验收**：
- [ ] 所有页面视觉一致
- [ ] 四大阵营颜色正确
- [ ] 移动端正常
- [ ] 不影响现有功能

---

### Phase 2 · 首页重构

**目标**：按任务书 10 Section 重构首页信息架构  
**不改算法 / 不改数据结构**  
**关键交付**：
- Hero 精简文案 + 明确 CTA 层级
- 新增「16×4=64」几何解释 Section
- 新增「六维人格模型」展示 Section
- 新增「最终 CTA」收尾 Section
- 测评场景化入口文案

**验收**：
- [ ] 所有原有入口仍然有效
- [ ] 首页加载正常
- [ ] 手机端显示正常
- [ ] 无断链

---

### Phase 3 · 64 型人格内容体系

**目标**：4 阵营页面 + 16 基础型 + 64 完整型 + 筛选搜索  
**必须保持**：64 型编码、字段契约、相关人格匹配算法  
**关键交付**：
- 4 阵营聚合页（`/types/analysts` 等）
- 16 基础型页（`/types/intj` 等）
- 64 完整型详情页升级
- 按阵营 / 基础型 / 编码 / 名称 筛选搜索
- 型别页主视觉容器改为 3:4 匹配竖版 hero 图

**验收**：
- [ ] 64 型全部可访问
- [ ] 内容字段完整
- [ ] 页面链接正确
- [ ] 内容不存在明显重复

---

### Phase 4 · 测评系统体验

**目标**：交互升级，**算法和题库零改动**  
**红线**：60/120 题保留、题目顺序保留、计分逻辑保留、存储键保留  
**关键交付**：
- 答题"退出并保留进度"显式按钮（P0）
- "剩余 X 题 / 预计 X 分钟"进度提示
- 选项点击区扩到 ≥ 48px
- 键盘操作验证（左右 / 数字 1-5）
- 完成前答题完整性检查

**验收（算法一致性红线）**：
- [ ] 算法基线快照测试通过（**同一份答题数据，新旧版本输出完全一致**）
- [ ] 60 题正常
- [ ] 120 题正常
- [ ] 旧数据兼容

---

### Phase 5 · 结果报告全面升级

**目标**：四层信息架构 + 海报生成 + 懒加载  
**必须保持**：`computeResult` 输入输出不变  
**关键交付**：
- 结果页四层折叠（人格认知 → 深入理解 → 成长行动 → 探索分享）
- 非首屏组件懒加载（`next/dynamic`）
- 海报生成稳定性提升（服务端 PNG 或 Canvas）
- 下载 + 分享

**验收**：
- [ ] 原有结果正常展示
- [ ] 64 种人格对应正确
- [ ] 海报生成正常
- [ ] 算法基线快照测试通过

---

### Phase 6 · SEO / 性能 / 质量 / 部署验收

**目标**：全链路健康 + GitHub Pages 真实路径验收  
**关键交付**：
- 独立 `/test/`, `/about/`, `/privacy/` 页
- 每页独立 Title + Description + Canonical
- Sitemap + Robots + OG + Twitter 全
- Lighthouse 目标：四项 ≥ 90
- 375px 无横向溢出
- `.github/workflows/deploy.yml` 自动化

**验收（真实路径，不是本地 dev）**：
- [ ] https://zhubao315.github.io/mbti64/ 首页 200
- [ ] https://zhubao315.github.io/mbti64/test/ 测评入口 200
- [ ] https://zhubao315.github.io/mbti64/type/INTJ-A-O/ 型别详情 200
- [ ] 无 404 资源路径
- [ ] 核心测评流程端到端通过
- [ ] basePath 双前缀检查（无 `/mbti64/mbti64/...`）

---

## 八、Phase 0 → Phase 1 的决策清单

以下问题需要在 Phase 1 启动前确认，不在 Phase 0 范围：

| 问题 | 选项 | 影响 |
|---|---|---|
| `redesign/mbti64-v2` 是否直接基于 `a38bfc0` 还是先 merge main | A: 直接用 / B: 先 merge 后重开 | B 更稳但需要解决 stash |
| stash 里的 rarity-core 拆分怎么处理 | A: 单独建分支 `feat/rarity-core-split` 先完成 / B: 等 Phase 5 再说 | A 避免并行改动污染 v2 |
| 旧 `public/assets/portraits/` 目录（187 MB PNG）是否清理 | A: Phase 1 开始前从仓库移除（只留 webp）/ B: 等 Phase 6 | A 减仓库体积 |
| Phase 0 建议补的"算法基线快照测试"放在哪 | A: `tests/algorithm-regression.test.ts`（独立文件） / B: 追加到现有 `tests/scoring.test.ts` | A 更清晰 |
| 独立 `/about` 和 `/privacy` 页的内容由谁提供 | A: 任务书已给框架，Phase 1 实现 / B: 先占位 | A |

---

## 九、Phase 0 交付验证

| 验证项 | 结果 |
|---|---|
| Git 工作区已安全（ stash 保护 WIP） | ✅ |
| 改版分支已建立（`redesign/mbti64-v2` from `a38bfc0`） | ✅ |
| 5 份审计文档完整 | ✅ |
| 算法保护清单 12 项已列出 | ✅ |
| 功能保护清单 15 项已列出 | ✅ |
| 风险清单 7 项已列出 | ✅ |
| 分阶段实施计划 Phase 0–6 已给出 | ✅ |
| 用户最高优先级的 3 份文件已交付（03/04/05） | ✅ |
| 改动零（Phase 0 只读） | ✅ |

---

**下一步**：等待你审阅 Phase 0 审计报告，确认后启动 Phase 1（品牌 CI 和设计系统）。Phase 0 到 Phase 1 之间不会自动过渡，必须有明确确认。
