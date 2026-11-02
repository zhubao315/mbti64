/**
 * 64 型人格稀有度测评 — 数据契约（唯一来源）
 * 任何题目 / 型别 / 计分代码都必须从这里取类型，避免散落定义。
 */

export type DimKey = "EI" | "SN" | "TF" | "JP" | "AC" | "OH";

export type Pole = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P" | "A" | "C" | "O" | "H";

export type ItemType = "likert" | "binary" | "image";

/** core = 精简模式题目（每维 10 题）；extra = 完整模式追加题（每维 +10 题） */
export type ItemSet = "core" | "extra";

export type Mode = "quick" | "full";

export type Scene = "职场" | "社交" | "消费" | "生活方式" | "数字生活";

/** 倾向强度：模糊 / 较强 / 显著（对应主导侧百分比 <55 / 55–70 / >70） */
export type Strength = "fuzzy" | "moderate" | "strong";

export type GroupKey = "analyst" | "adventurer" | "diplomat" | "guardian";

export interface DimMeta {
  key: DimKey;
  /** 计分基准极：分数为正即偏向 poleA */
  poleA: Pole;
  poleB: Pole;
  /** 维度名（面向用户） */
  name: string;
  poleAName: string;
  poleBName: string;
  question: string;
  /** 一句话解释，用于教学卡 */
  summary: string;
}

export const DIMS: Record<DimKey, DimMeta> = {
  EI: {
    key: "EI",
    poleA: "E",
    poleB: "I",
    name: "能量方向",
    poleAName: "外向 E",
    poleBName: "内向 I",
    question: "你的电量，是人群里冲上来的，还是独处时充回来的？",
    summary: "E 从他人与场域取能，I 从独处与深度专注取能。没有好坏，只看补电方式。",
  },
  SN: {
    key: "SN",
    poleA: "S",
    poleB: "N",
    name: "信息方式",
    poleAName: "实感 S",
    poleBName: "直觉 N",
    question: "你先看细节、先看眼前，还是先看趋势、先看可能？",
    summary: "S 相信可验证的具体经验，N 相信模式与联想。S 更稳，N 更敢想。",
  },
  TF: {
    key: "TF",
    poleA: "T",
    poleB: "F",
    name: "决策依据",
    poleAName: "理性 T",
    poleBName: "情感 F",
    question: "做决定时，你先算账，还是先看人？",
    summary: "T 先看逻辑与成本收益，F 先看关系与感受。冲突时最容易互相误读的一维。",
  },
  JP: {
    key: "JP",
    poleA: "J",
    poleB: "P",
    name: "生活节奏",
    poleAName: "计划 J",
    poleBName: "灵活 P",
    question: "你的周末，是按表执行，还是当天再说？",
    summary: "J 靠确定感安心，P 靠选择权安心。不是自律与否，是收尾方式不同。",
  },
  AC: {
    key: "AC",
    poleA: "A",
    poleB: "C",
    name: "自我姿态（后缀一）",
    poleAName: "坚定 A · Assertive",
    poleBName: "内省 C · Cautious",
    question: "被质疑的时候，你更相信自己的判断，还是先回头检查自己？",
    summary: "A 对外稳定、敢拍板；C 先自省、边界感强。这一维决定你在压力下的姿态。",
  },
  OH: {
    key: "OH",
    poleA: "O",
    poleB: "H",
    name: "变化偏好（后缀二）",
    poleAName: "探索 O · Original",
    poleBName: "守成 H · Habitual",
    question: "面对没试过的东西，你是先上手，还是先按老办法来？",
    summary: "O 追新、愿意试错；H 求稳、靠复利。这一维决定你怎么对待变化。",
  },
};

export const DIM_ORDER: DimKey[] = ["EI", "SN", "TF", "JP", "AC", "OH"];

/** 后缀维度：必须靠二选一题型投票定字母（≥ 2/3 票数） */
export const SUFFIX_DIMS: DimKey[] = ["AC", "OH"];

/** 五位 Likert：索引 0 → 分值 +2，索引 4 → 分值 -2 */
export const LIKERT_VALUES = [2, 1, 0, -1, -2] as const;
export const LIKERT_LABELS = ["非常同意", "比较同意", "说不清", "不太同意", "完全不同意"] as const;

export const SCENE_META: Record<Scene, { emoji: string; tone: string }> = {
  职场: { emoji: "💼", tone: "汇报、加班、团建" },
  社交: { emoji: "🧧", tone: "亲戚、饭局、朋友圈" },
  消费: { emoji: "🛒", tone: "凑满减、砍一刀、直播" },
  生活方式: { emoji: "🌿", tone: "健身、体检、养宠" },
  数字生活: { emoji: "📱", tone: "已读不回、短视频、开黑" },
};

export interface Choice {
  label: string;
  /** 该选项归属的极 */
  pole: Pole;
  emoji?: string;
  /** 图片题的补充说明 */
  note?: string;
}

export interface Question {
  id: string;
  dim: DimKey;
  type: ItemType;
  scene: Scene;
  set: ItemSet;
  /** 反向计分：同意表示偏向 poleB */
  reverse?: true;
  text: string;
  /** 本题可选的「社交坐标系」小字提示，缺省用全局文案 */
  hint?: string;
  /** binary 固定 2 个选项；image 固定 4 个选项。选项 0 恒为 poleA 侧（binary） */
  choices?: Choice[];
}

export interface DimScore {
  key: DimKey;
  poleA: Pole;
  poleB: Pole;
  /** 倾向 poleA 的百分比 0–100（50 = 中立） */
  percentA: number;
  percentB: number;
  /** 主导字母 */
  pole: Pole;
  /** 主导侧百分比（50–100） */
  preferred: number;
  strength: Strength;
  answered: number;
  total: number;
  /** 仅后缀维度有值：二选一题型投票情况 */
  binary?: { a: number; b: number; total: number; need: number };
  /** 仅后缀维度可能为 true：票数不足 2/3，标注「摇摆型」 */
  swing: boolean;
}

export interface TestResult {
  base: string;
  /** 规范 64 型编码，如 INFJ-C-O */
  code: string;
  /** 展示编码：摇摆维度以 ? 代替，如 INFJ-?-O */
  displayCode: string;
  group: GroupKey;
  dims: Record<DimKey, DimScore>;
  swing: { AC: boolean; OH: boolean };
  mode: Mode;
  answeredCount: number;
  totalCount: number;
  complete: boolean;
  scoredAt: number;
}

export const GROUP_META: Record<GroupKey, { cn: string; en: string; color: string; soft: string; emoji: string }> = {
  analyst: { cn: "分析师", en: "Analyst", color: "#7C5CFF", soft: "#EDE8FF", emoji: "🧠" },
  adventurer: { cn: "冒险家", en: "Adventurer", color: "#FF8A8A", soft: "#FFEDED", emoji: "🔥" },
  diplomat: { cn: "外交家", en: "Diplomat", color: "#7FD1AE", soft: "#E8F9F1", emoji: "🌱" },
  guardian: { cn: "守护者", en: "Guardian", color: "#5FA8E8", soft: "#E8F2FD", emoji: "🛡️" },
};

export function dimMeta(key: DimKey): DimMeta {
  return DIMS[key];
}

/** 某选项是否属于 poleA 侧 */
export function isPoleA(key: DimKey, pole: Pole): boolean {
  return DIMS[key].poleA === pole;
}
