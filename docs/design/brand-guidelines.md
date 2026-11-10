# Brand Guidelines · 品牌规范

**唯一来源**：`data/schema.ts` `GROUP_META` + `tailwind.config.ts` colors  
**审计日期**：2026-11-05

---

## 品牌身份

| 项 | 值 |
|---|---|
| 品牌名 | **MBTI64** |
| 英文全称 | 64 PERSONALITIES |
| 品牌口号 | ONE UNIQUE YOU |
| 中文名（副标题） | 64 型人格 · 自我认知探索平台 |
| 定位 | 六维倾向 × 自我姿态 × 变化偏好，探索独特的自己 |
| 主色 | 深海军蓝 `#0F2747` —— 专业、沉静、知识感 |
| 背景色 | 纸面浅灰 `#F8FAFC` —— 浅色主题，不做深色版 |

---

## Logo 使用

- **组件**：`<BrandLogo size={30} />`（唯一实例化点）
- **位置**：全局导航左侧 + Footer 品牌区 + OG 图中心
- **最小尺寸**：24px（导航），无其他尺寸下限
- **背景要求**：必须放在浅色 `#FFFFFF` 或 `#F8FAFC` 上，不得在阵营色实底上叠 Logo

---

## 四大人格族群色（唯一分类语义色）

```ts
// data/schema.ts GROUP_META —— Phase 1–6 严禁改动
analyst:    { color:"#7B61FF", text:"#5A3FD1", soft:"#E5DEFF", light:"#F1EDFF" } // 紫
diplomat:   { color:"#4CAF6B", text:"#1E6B34", soft:"#D5EFDE", light:"#EAF7EE" } // 绿
guardian:   { color:"#4A90E2", text:"#1A659F", soft:"#D6E8FB", light:"#EAF3FD" } // 蓝
adventurer: { color:"#F6C343", text:"#7A5600", soft:"#FBE9B3", light:"#FFF7DF" } // 黄
```

**使用规则**：
- `color`（实底）：仅用于 Logo 小色块、图表色点、饼图填充
- `text`（深版）：白底可读文本（必须 ≥ 4.5:1 AA 对比度）
- `soft`：标签 / 徽章底
- `light`：大区块淡底（如某阵营专题卡）
- **不得**用族群色做全局按钮 / 链接状态色（这些归 navy 体系）

---

## 禁忌

- **不**把 emoji 当品牌图标（所有 UI 必须用 `@phosphor-icons/react` 线性图标 + 中文名）
- **不**在 Footer 用 `© {year}` 动态年份 + "独立人格探索项目" 免责声明（已经在 `layout.tsx` 固定，不要改）
- **不**改 `SITE_NAME = "MBTI64"` / `SITE_DESC`（`lib/site.ts`）
- **不**改 `BASE_GROUPS` 16→4 映射（`lib/scoring.ts`）
