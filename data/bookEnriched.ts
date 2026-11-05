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
  leapSignal: string;
  nextSuffix: string | null;
  nextLabel: string;
}

export interface BookNeuroBase {
  stack: {
    dominant: string;
    auxiliary: string;
    tertiary: string;
    inferior: string;
  };
  brainRegions: string[];
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
