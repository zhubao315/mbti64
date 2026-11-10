"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Mode } from "@/data/schema";
import { SESSION_ORDER } from "@/data/questions";
import { scoreTest } from "@/lib/scoring";
import type { TestResult } from "@/data/schema";
import { STORAGE_KEY } from "@/lib/store-key";
import { countAnswered, clampIndex } from "@/lib/progress";

export { STORAGE_KEY };

/**
 * 答题状态机（localStorage 持久化，可断点续答）
 *
 * key: p64:v1 → v2
 *
 * v2 关键改动：两个模式（精简 60 / 完整 120）各自独立保存 answers / index / startedAt / finishedAt。
 * 之前两个模式共用一份 answers，切换后会出现「精简题的答案算进完整进度、跨模式乱跳」，
 * 现在互不干扰，任一模式答完都能直接出结果。
 *
 * 结果由 answers 现算，避免「存了结果但题目改了」导致数据不一致。
 */

type ModeAnswers = Record<string, number>;

export interface QuizState {
  mode: Mode;
  /** 按模式分别保存，互不干扰 */
  answers: Record<Mode, ModeAnswers>;
  /** 当前题序号（0-based），指向 SESSION_ORDER[mode][index] */
  index: Record<Mode, number>;
  startedAt: Record<Mode, number | null>;
  finishedAt: Record<Mode, number | null>;
  /** 已展示过的彩蛋序号，避免重复弹窗 */
  seenEggs: number[];
  /** 是否已解锁完整报告（Demo：本地标记） */
  unlocked: boolean;

  setMode: (mode: Mode) => void;
  answer: (questionId: string, choiceIndex: number) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  markEgg: (eggIndex: number) => void;
  finish: () => void;
  /** 读缓存/回跳后把 answers 与 index 归一化，保证进度条与题号同源 */
  normalize: () => void;
  reset: () => void;
  unlock: () => void;
}

const EMPTY_ANSWERS: Record<Mode, ModeAnswers> = { quick: {}, full: {} };
const EMPTY_INDEX: Record<Mode, number> = { quick: 0, full: 0 };

const initial = {
  mode: "full" as Mode,
  answers: { ...EMPTY_ANSWERS } as Record<Mode, ModeAnswers>,
  index: { ...EMPTY_INDEX } as Record<Mode, number>,
  startedAt: { quick: null, full: null } as Record<Mode, number | null>,
  finishedAt: { quick: null, full: null } as Record<Mode, number | null>,
  seenEggs: [] as number[],
  unlocked: false,
};

/**
 * 迁移 v1（扁平 answers/index）到 v2（按模式拆分）。
 * 旧数据里 answers 是扁平对象、index 是数字：把它们归入旧 mode 对应的槽位，
 * 这样用户之前答到一半的进度能无缝续上，不会因为升级被清空。
 */
function migrateV1(persisted: unknown, version: number): QuizState {
  if (version >= 2) return persisted as QuizState;

  const v1 = (persisted ?? {}) as {
    mode?: Mode;
    answers?: Record<string, number>;
    index?: number;
    startedAt?: number | null;
    finishedAt?: number | null;
    seenEggs?: number[];
    unlocked?: boolean;
  };

  const mode: Mode = v1.mode === "quick" ? "quick" : "full";
  const answers = v1.answers ?? {};

  return {
    ...initial,
    mode,
    answers: { quick: mode === "quick" ? answers : {}, full: mode === "full" ? answers : {} },
    index: { quick: mode === "quick" ? v1.index ?? 0 : 0, full: mode === "full" ? v1.index ?? 0 : 0 },
    startedAt: { quick: mode === "quick" ? v1.startedAt ?? null : null, full: mode === "full" ? v1.startedAt ?? null : null },
    finishedAt: { quick: mode === "quick" ? v1.finishedAt ?? null : null, full: mode === "full" ? v1.finishedAt ?? null : null },
    seenEggs: v1.seenEggs ?? [],
    unlocked: v1.unlocked ?? false,
  } as unknown as QuizState;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...initial,

      setMode: (mode) =>
        set((s) => {
          const order = SESSION_ORDER[mode];
          // 切到目标模式后，若当前游标越界，拉回合法范围；不主动跳到第一道未答，
          // 让用户回到自己上次停下来的位置。
          const clamped = Math.max(0, Math.min(order.length - 1, s.index[mode]));
          return {
            mode,
            index: { ...s.index, [mode]: clamped },
          };
        }),

      answer: (questionId, choiceIndex) =>
        set((s) => {
          const order = SESSION_ORDER[s.mode];
          // 只接受属于当前问卷、且为合法数字的作答；反向题也照常计入
          if (!order.some((q) => q.id === questionId)) return s;
          if (!Number.isInteger(choiceIndex) || choiceIndex < 0) return s;
          const modeAnswers = { ...s.answers[s.mode], [questionId]: choiceIndex };
          return {
            answers: { ...s.answers, [s.mode]: modeAnswers },
            startedAt: { ...s.startedAt, [s.mode]: s.startedAt[s.mode] ?? Date.now() },
          };
        }),

      goTo: (index) =>
        set((s) => ({
          index: {
            ...s.index,
            [s.mode]: clampIndex(index, countAnswered(s.answers[s.mode], SESSION_ORDER[s.mode]), SESSION_ORDER[s.mode].length),
          },
        })),

      next: () =>
        set((s) => {
          const order = SESSION_ORDER[s.mode];
          const answered = countAnswered(s.answers[s.mode], order);
          // 只有「这道题的答案已经在册」才允许前进，且游标不得超过已答数
          const nextIdx = clampIndex(s.index[s.mode] + 1, answered, order.length);
          return { index: { ...s.index, [s.mode]: nextIdx } };
        }),

      prev: () =>
        set((s) => {
          const order = SESSION_ORDER[s.mode];
          const answered = countAnswered(s.answers[s.mode], order);
          return {
            index: { ...s.index, [s.mode]: clampIndex(s.index[s.mode] - 1, answered, order.length) },
          };
        }),

      markEgg: (eggIndex) => set((s) => (s.seenEggs.includes(eggIndex) ? s : { seenEggs: [...s.seenEggs, eggIndex] })),

      finish: () =>
        set((s) => ({
          finishedAt: { ...s.finishedAt, [s.mode]: Date.now() },
        })),

      normalize: () =>
        set((s) => {
          const answers = { ...s.answers } as Record<Mode, ModeAnswers>;
          const index = { ...s.index } as Record<Mode, number>;
          (["quick", "full"] as const).forEach((m) => {
            const order = SESSION_ORDER[m];
            const ids = new Set(order.map((q) => q.id));
            const clean: ModeAnswers = {};
            for (const [id, v] of Object.entries(s.answers[m] ?? {})) {
              if (!ids.has(id)) continue;
              const num = typeof v === "number" ? v : Number(v);
              if (Number.isFinite(num)) clean[id] = num;
            }
            answers[m] = clean;
            // 游标上限：不超过已答数，且不越过当前模式的第一道未答题。
            // 若历史缓存里游标已跑到未答题之前，恢复后直接拉回到缺口，避免「题号到末尾、进度条没走完」。
            const firstGap = order.findIndex((q) => typeof clean[q.id] !== "number");
            const frontier = firstGap === -1 ? order.length - 1 : firstGap;
            index[m] = Math.max(
              0,
              Math.min(frontier, clampIndex(index[m] ?? 0, countAnswered(clean, order), order.length)),
            );
          });
          return { answers, index };
        }),

      reset: () => set({ ...initial }),

      unlock: () => set({ unlocked: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: migrateV1,
      partialize: (s) => ({
        mode: s.mode,
        answers: s.answers,
        index: s.index,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        seenEggs: s.seenEggs,
        unlocked: s.unlocked,
      }),
    },
  ),
);

/** 由当前 answers 现算结果（不入库，避免陈旧数据） */
export function computeResult(state: Pick<QuizState, "answers" | "mode">): TestResult {
  return scoreTest(state.answers[state.mode], SESSION_ORDER[state.mode], state.mode);
}

export function answeredTotal(state: Pick<QuizState, "answers" | "mode">): number {
  return countAnswered(state.answers[state.mode], SESSION_ORDER[state.mode]);
}

export function totalOf(mode: Mode): number {
  return SESSION_ORDER[mode].length;
}

/**
 * SSR 水合守卫：persist 在客户端才读取 localStorage，
 * 首帧必须等服务端/客户端一致后再渲染依赖存储的 UI，否则会出现 hydration mismatch。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useQuizStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useQuizStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

/** 是否已完成：当前模式的全部题目已答 */
export function isDone(state: Pick<QuizState, "answers" | "mode">): boolean {
  const order = SESSION_ORDER[state.mode];
  const answers = state.answers[state.mode];
  return order.length > 0 && order.every((q) => typeof answers[q.id] === "number");
}
