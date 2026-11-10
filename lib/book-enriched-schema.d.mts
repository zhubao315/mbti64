import type { z } from "zod";

export declare const BookVariantSchema: z.ZodType<{
  label: string;
  suffix: string;
  stateLabel: string;
  color: string;
  rank: number;
  rankLabel: string;
  per1000: number;
  hiddenStuck: string;
  hiddenStuckSource: "manuscript" | "editorial";
  leapSignal: string;
  leapSignalSource: "manuscript" | "editorial";
  nextSuffix: string | null;
  nextLabel: string;
  bodyPreview: string;
  body: string;
}>;

export declare const BookNeuroBaseSchema: z.ZodType<{
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
}>;

export declare const BookChinaSlicesSchema: z.ZodType<{
  career: string;
  dinner: string;
  wechat: string;
  defenseLines: string[];
}>;

export declare const BookIntimacyContractSchema: z.ZodType<{
  contract: string;
  wearScripts: string[];
}>;

export declare const BookMirrorMentorSchema: z.ZodType<{
  base: string;
  cn: string;
  chapter: string | null;
  reason: string;
  l1Distance: number;
  experimentSteps: { title: string; body: string }[];
}>;

export declare const BookDeliberatePracticeSchema: z.ZodType<{
  c2a: string[];
  a2c: string[];
  o2h: string[];
  h2o: string[];
}>;

export declare const BookTypeDataSchema: z.ZodType<{
  base: string;
  cn: string;
  bookChapter: string;
  bookChapterPath: string;
  neuroBase: {
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
  };
  spiralStage: Record<
    string,
    {
      label: string;
      suffix: string;
      stateLabel: string;
      color: string;
      rank: number;
      rankLabel: string;
      per1000: number;
      hiddenStuck: string;
      hiddenStuckSource: "manuscript" | "editorial";
      leapSignal: string;
      leapSignalSource: "manuscript" | "editorial";
      nextSuffix: string | null;
      nextLabel: string;
      bodyPreview: string;
      body: string;
    }
  >;
  chinaSlices: {
    career: string;
    dinner: string;
    wechat: string;
    defenseLines: string[];
  };
  intimacyContract: { contract: string; wearScripts: string[] };
  mirrorMentor: {
    base: string;
    cn: string;
    chapter: string | null;
    reason: string;
    l1Distance: number;
    experimentSteps: { title: string; body: string }[];
  };
  deliberatePractice: { c2a: string[]; a2c: string[]; o2h: string[]; h2o: string[] };
}>;

export declare const BookEnrichedSchema: z.ZodType<{
  generatedAt: string;
  bookVersion: string;
  totalChapters: number;
  enrichedCount: number;
  types: Record<string, unknown>;
}>;
