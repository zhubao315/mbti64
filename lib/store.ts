"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Mode } from "@/data/schema";
import { SESSION_ORDER } from "@/data/questions";
import { scoreTest } from "@/lib/scoring";
import type { TestResult } from "@/data/schema";
import { STORAGE_KEY } from "@/lib/store-key";

export { STORAGE_KEY };

/**
 * 答题状态机（localStorage 持久化，可断点续答）
 *
 * key: p64:v1
 * 只存 answers / mode / index / startedAt / finishedAt —— 结果由 answers 现算，
 * 避免「存了结果但题目改了」导致数据不一致。
 */

export interface QuizState {
  mode: Mode;
  answers: Record<string, number>;
  /** 当前题序号（0-based），指向 SESSION_ORDER[mode][index] */
  index: number;
  startedAt: number | null;
  finishedAt: number | null;
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
  reset: () => void;
  unlock: () => void;
}

const initial = {
  mode: "full" as Mode,
  answers: {} as Record<string, number>,
  index: 0,
  startedAt: null as number | null,
  finishedAt: null as number | null,
  seenEggs: [] as number[],
  unlocked: false,
};

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      ...initial,

      setMode: (mode) =>
        set((s) => {
          // 切换模式：保留已答题目，重置游标到第一道未答的题
          const order = SESSION_ORDER[mode];
          const firstUnanswered = order.findIndex((q) => typeof s.answers[q.id] !== "number");
          return {
            mode,
            index: firstUnanswered === -1 ? Math.max(0, order.length - 1) : firstUnanswered,
            startedAt: s.startedAt ?? Date.now(),
          };
        }),

      answer: (questionId, choiceIndex) =>
        set((s) => ({
          answers: { ...s.answers, [questionId]: choiceIndex },
          startedAt: s.startedAt ?? Date.now(),
        })),

      goTo: (index) => set({ index: Math.max(0, index) }),

      next: () =>
        set((s) => {
          const order = SESSION_ORDER[s.mode];
          return { index: Math.min(order.length - 1, s.index + 1) };
        }),

      prev: () => set((s) => ({ index: Math.max(0, s.index - 1) })),

      markEgg: (eggIndex) => set((s) => (s.seenEggs.includes(eggIndex) ? s : { seenEggs: [...s.seenEggs, eggIndex] })),

      finish: () => set({ finishedAt: Date.now() }),

      reset: () => set({ ...initial }),

      unlock: () => set({ unlocked: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
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
  return scoreTest(state.answers, SESSION_ORDER[state.mode], state.mode);
}

export function answeredTotal(state: Pick<QuizState, "answers" | "mode">): number {
  const order = SESSION_ORDER[state.mode];
  return order.reduce((n, q) => (typeof state.answers[q.id] === "number" ? n + 1 : n), 0);
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

/** 是否已完成：全部题目已答 */
export function isDone(state: Pick<QuizState, "answers" | "mode">): boolean {
  const order = SESSION_ORDER[state.mode];
  return order.length > 0 && order.every((q) => typeof state.answers[q.id] === "number");
}
