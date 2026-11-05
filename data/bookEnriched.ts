/**
 * 书稿数据类型定义
 * 与 data/bookEnriched.json 结构对齐
 */

export interface BookVariant {
  label: string;
  suffix: string;
  season: string;
  seasonLabel: string;
  color: string;
  rank: number;
  per1000: number;
  body: string;
  bodyPreview: string;
  hiddenStuck: string;
  /** 字段来源：manuscript=原稿明确提取，editorial=编辑补写（页面不展示，仅供审校） */
  hiddenStuckSource: "manuscript" | "editorial";
  leapSignal: string;
  /** 字段来源：manuscript=原稿明确提取，editorial=编辑补写（页面不展示，仅供审校） */
  leapSignalSource: "manuscript" | "editorial";
  nextSuffix: string | null;
  nextLabel: string;
}

/** 证据强度：用于标明「这是类比，不是结论」 */
export type NeuroEvidenceLevel = "理论类比" | "相关研究启发" | "尚无直接验证";

/** 解释性映射：认知功能 ↔ 可能涉及的认知过程，不是个人脑区测量 */
export interface BookExplanatoryNetwork {
  /** 认知功能，如 "Ni 内倾直觉" */
  label: string;
  description: string;
  evidenceLevel: NeuroEvidenceLevel;
}

export interface BookNeuroBase {
  stack: {
    dominant: string;
    auxiliary: string;
    tertiary: string;
    inferior: string;
  };
  explanatoryNetworks: BookExplanatoryNetwork[];
  /** 统一免责声明（页面底部必须展示） */
  disclaimer: string;
  dominant: string;
  auxiliary: string;
  tertiary: string;
  inferior: string;
  flowState: string;
  loopState: string;
  gripState: string;
}

export interface BookChinaSlices {
  career: string;
  dinner: string;
  wechat: string;
  defenseLines: string[];
}

export interface BookIntimacyContract {
  contract: string;
  wearScripts: string[];
}

export interface BookMirrorMentor {
  base: string;
  cn: string;
  chapter: string | null;
  reason: string;
  l1Distance: number;
  experimentSteps: Array<{ title: string; body: string }>;
}

export interface BookDeliberatePractice {
  c2a: string[];
  a2c: string[];
  o2h: string[];
  h2o: string[];
}

export interface BookTypeData {
  base: string;
  cn: string;
  bookChapter: string;
  bookChapterPath: string;
  neuroBase: BookNeuroBase;
  spiralStage: Record<string, BookVariant>;
  chinaSlices: BookChinaSlices;
  intimacyContract: BookIntimacyContract;
  mirrorMentor: BookMirrorMentor;
  deliberatePractice: BookDeliberatePractice;
}

export interface BookEnriched {
  generatedAt: string;
  bookVersion: string;
  totalChapters: number;
  enrichedCount: number;
  types: Record<string, BookTypeData>;
}
