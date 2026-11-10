export interface BookVariant {
  label: string;
  suffix: string;
  stateLabel: string;
  color: string;
  rank: number;
  rankLabel: string;
  per1000: number;
  hiddenStuck: string;
  hiddenStuckSource: string;
  leapSignal: string;
  leapSignalSource: string;
  nextSuffix: string | null;
  nextLabel: string;
  bodyPreview: string;
  body: string;
}

export interface BookNeuroBase {
  stack: Record<string, string>;
  explanatoryNetworks: { label: string; description: string; evidenceLevel: string }[];
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
  experimentSteps: { title: string; body: string }[];
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

declare const bookEnriched: {
  generatedAt: string;
  bookVersion: string;
  totalChapters: number;
  enrichedCount: number;
  types: Record<string, BookTypeData>;
};

export default bookEnriched;