/**
 * bookEnriched.json 的运行时 schema（Zod）— 单一事实源
 *
 * 为什么是 .mjs：
 *  - audit 脚本是纯 Node .mjs，无法 import .ts
 *  - data/schema.ts 会被客户端组件 import，把 zod 写进去会打进首屏包（约 88KB）
 *  - 因此 schema 独立成 .mjs，Node 侧脚本与 vitest 共享，客户端 bundle 不受影响
 *
 * 类型声明见 book-enriched-schema.d.mts
 */
import { z } from "zod";

/** 运行时 schema：bookEnriched.json 的结构契约 */
export const BookVariantSchema = z.object({
  label: z.string(),
  suffix: z.string(),
  stateLabel: z.string(),
  color: z.string(),
  rank: z.number(),
  rankLabel: z.string(),
  per1000: z.number(),
  hiddenStuck: z.string(),
  hiddenStuckSource: z.enum(["manuscript", "editorial"]),
  leapSignal: z.string(),
  leapSignalSource: z.enum(["manuscript", "editorial"]),
  nextSuffix: z.string().nullable(),
  nextLabel: z.string(),
  bodyPreview: z.string(),
  body: z.string(),
});

export const BookNeuroBaseSchema = z.object({
  stack: z.record(z.string(), z.string()),
  explanatoryNetworks: z.array(z.object({ label: z.string(), description: z.string(), evidenceLevel: z.string() })),
  disclaimer: z.string(),
  dominant: z.string(),
  auxiliary: z.string(),
  tertiary: z.string(),
  inferior: z.string(),
  flowState: z.string(),
  loopState: z.string(),
  gripState: z.string(),
});

export const BookChinaSlicesSchema = z.object({
  career: z.string(),
  dinner: z.string(),
  wechat: z.string(),
  defenseLines: z.array(z.string()),
});

export const BookIntimacyContractSchema = z.object({
  contract: z.string(),
  wearScripts: z.array(z.string()),
});

export const BookMirrorMentorSchema = z.object({
  base: z.string(),
  cn: z.string(),
  chapter: z.string().nullable(),
  reason: z.string(),
  l1Distance: z.number(),
  experimentSteps: z.array(z.object({ title: z.string(), body: z.string() })),
});

export const BookDeliberatePracticeSchema = z.object({
  c2a: z.array(z.string()),
  a2c: z.array(z.string()),
  o2h: z.array(z.string()),
  h2o: z.array(z.string()),
});

export const BookTypeDataSchema = z.object({
  base: z.string(),
  cn: z.string(),
  bookChapter: z.string(),
  bookChapterPath: z.string(),
  neuroBase: BookNeuroBaseSchema,
  spiralStage: z.record(z.string(), BookVariantSchema),
  chinaSlices: BookChinaSlicesSchema,
  intimacyContract: BookIntimacyContractSchema,
  mirrorMentor: BookMirrorMentorSchema,
  deliberatePractice: BookDeliberatePracticeSchema,
});

export const BookEnrichedSchema = z.object({
  generatedAt: z.string(),
  bookVersion: z.string(),
  totalChapters: z.number(),
  enrichedCount: z.number(),
  types: z.record(z.string(), BookTypeDataSchema),
});
