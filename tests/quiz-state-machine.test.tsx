/**
 * 答题页状态机 · 组件级测试
 *
 * 覆盖场景（按 docs/algorithm-spec.md 的状态机契约）：
 *   ① 选择选项后自动前进到下一题
 *   ② 点击「上一题」后返回且保留已选答案
 *   ③ 在最后一题提交后正确跳转到结果页
 *   ④ localStorage 预置进度时，恢复提示卡片出现且「继续」跳转到正确的题目索引
 *   ⑤ 完成后清除 localStorage（进度清空 + 结果快照落盘）
 *
 * 不依赖真实浏览器：mock next/navigation 的 useRouter。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/test",
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...rest }: Record<string, unknown>) => {
          void rest;
          return React.createElement("div", null, children as React.ReactNode);
        },
    },
  ),
  AnimatePresence: ({ children }: { children: unknown }) => <>{children as React.ReactNode}</>,
}));

import TestClient from "@/components/TestClient";
import ResumeBanner from "@/components/ResumeBanner";
import { RESULT_KEY, STORAGE_KEY, useQuizStore } from "@/lib/store";
import { SESSION_ORDER } from "@/data/questions";

const order = SESSION_ORDER.full;

/** 读出当前题卡的题号文本，如「第 3 / 120 题」 */
function currentQuestionNumber(): number {
  const text = screen.getByTestId("question-card").textContent ?? "";
  const m = text.match(/第\s*(\d+)\s*\/\s*\d+\s*题/);
  return m ? Number(m[1]) : -1;
}

/** 把答题进度写入 localStorage（模拟另一会话留下的缓存），并让 store 重新水合 */
function seedProgress(answeredCount: number, cursor: number) {
  const answers: Record<string, number> = {};
  for (const q of order.slice(0, answeredCount)) answers[q.id] = 2;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: {
        mode: "full",
        answers: { quick: {}, full: answers },
        index: { quick: 0, full: cursor },
        startedAt: { quick: null, full: Date.now() },
        finishedAt: { quick: null, full: null },
        seenEggs: [],
        unlocked: false,
      },
      version: 2,
    }),
  );
  useQuizStore.persist.rehydrate();
}


/**
 * 在当前题卡里选一个「与当前答案不同」的选项（模拟改答）。
 *
 * 题型有 Likert / 二选一 / 图片四种选项渲染，统一用 data-choice 定位，
 * 并跳过当前已选中的那个（aria-pressed="true"）。
 */
async function pickDifferentOption(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const card = screen.getByTestId("question-card");
  const options = Array.from(card.querySelectorAll<HTMLButtonElement>("button[data-choice]"));
  expect(options.length).toBeGreaterThan(0);
  const target = options.find((b) => b.getAttribute("aria-pressed") !== "true") ?? options[0];
  await user.click(target);
}

describe("答题页状态机", () => {
  beforeEach(() => {
    pushMock.mockClear();
    window.localStorage.clear();
    // store 是模块级单例：每个用例前重置到初始态，避免用例之间互相污染
    useQuizStore.setState({
      mode: "full",
      answers: { quick: {}, full: {} },
      index: { quick: 0, full: 0 },
      startedAt: { quick: null, full: null },
      finishedAt: { quick: null, full: null },
      seenEggs: [],
      unlocked: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("① 选择选项后自动前进到下一题", async () => {
    const user = userEvent.setup();
    render(<TestClient />);

    await waitFor(() => expect(screen.getByTestId("question-card")).toBeTruthy());
    expect(currentQuestionNumber()).toBe(1);

    await user.click(screen.getByRole("button", { name: /非常同意/ }));

    await waitFor(() => expect(currentQuestionNumber()).toBe(2), { timeout: 3000 });
  });

  it("② 点击「上一题」后返回且保留已选答案", async () => {
    const user = userEvent.setup();
    render(<TestClient />);

    await waitFor(() => expect(screen.getByTestId("question-card")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /完全不同意/ }));
    await waitFor(() => expect(currentQuestionNumber()).toBe(2), { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: /上一题/ }));
    await waitFor(() => expect(currentQuestionNumber()).toBe(1));

    const restored = screen.getByRole("button", { name: /完全不同意/ });
    expect(restored.getAttribute("aria-pressed")).toBe("true");
  });

  it("③ 在最后一题提交后正确跳转到结果页", async () => {
    const user = userEvent.setup();

    // 预置全部题目已答，游标停在最后一题
    const answers: Record<string, number> = {};
    for (const q of order) answers[q.id] = 2;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          mode: "full",
          answers: { quick: {}, full: answers },
          index: { quick: 0, full: order.length - 1 },
          startedAt: { quick: null, full: Date.now() },
          finishedAt: { quick: null, full: null },
          seenEggs: [],
          unlocked: false,
        },
        version: 2,
      }),
    );
    useQuizStore.persist.rehydrate();

    render(<TestClient />);
    await waitFor(() => expect(screen.getByTestId("question-card")).toBeTruthy());
    await waitFor(() => expect(currentQuestionNumber()).toBe(order.length));

    const buttons = within(screen.getByTestId("question-card")).getAllByRole("button");
    const resultBtn = buttons.find((b) => /看结果/.test(b.textContent ?? ""));
    expect(resultBtn).toBeTruthy();
    await user.click(resultBtn!);

    // 提交前确认对话框 → 确认生成 → router.push("/result")
    await waitFor(() => expect(screen.getByText(/确认生成结果/)).toBeTruthy(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /确认生成/ }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/result"), { timeout: 3000 });
  }, 20000);

  it("④ localStorage 预置进度时，恢复提示卡片出现且「继续」跳转到正确的题目索引", async () => {
    // 4a：首页出现恢复提示卡片（ResumeBanner）
    seedProgress(5, 5);
    render(<ResumeBanner />);
    await waitFor(() => expect(screen.getByText(/上次已答 5 \/ 120 题/)).toBeTruthy());
    const link = screen.getByRole("link", { name: /继续答题/ });
    expect(link.getAttribute("href")).toBe("/test");
    cleanup();

    // 4b：答题页恢复到正确的题目索引（第 6 题）
    render(<TestClient />);
    await waitFor(() => expect(screen.getByTestId("question-card")).toBeTruthy());
    await waitFor(() => expect(currentQuestionNumber()).toBe(6));
  }, 20000);

  it("⑥ 快答数与改答数随作答实时更新（提交前检查弹窗里的两条提示）", async () => {
    const user = userEvent.setup();

    // 预置：全部题目已答，游标停在最后一题
    const answers: Record<string, number> = {};
    for (const q of order) answers[q.id] = 2;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          mode: "full",
          answers: { quick: {}, full: answers },
          index: { quick: 0, full: order.length - 1 },
          startedAt: { quick: null, full: Date.now() },
          finishedAt: { quick: null, full: null },
          seenEggs: [],
          unlocked: false,
        },
        version: 2,
      }),
    );
    useQuizStore.persist.rehydrate();

    render(<TestClient />);
    await waitFor(() => expect(screen.getByTestId("question-card")).toBeTruthy());

    // 回到上一题并改选另一个选项 → 应记为「改答 1 题」
    await user.click(screen.getByRole("button", { name: /上一题/ }));
    await waitFor(() => expect(currentQuestionNumber()).toBe(order.length - 1));
    await pickDifferentOption(user);
    await waitFor(() => expect(currentQuestionNumber()).toBe(order.length));

    // 打开提交前检查弹窗
    const buttons = within(screen.getByTestId("question-card")).getAllByRole("button");
    const resultBtn = buttons.find((b) => /看结果/.test(b.textContent ?? ""));
    expect(resultBtn).toBeTruthy();
    await user.click(resultBtn!);
    await waitFor(() => expect(screen.getByText(/确认生成结果/)).toBeTruthy(), { timeout: 3000 });

    // 改答统计：旧实现依赖数组为空 → 永远是 0，两条提示从来不显示
    expect(screen.getByText(/你修改过 1 道题的答案/)).toBeTruthy();

    // 快答统计：改答动作是紧接着发生的，停留不足 1.5 秒
    expect(screen.getByText(/有 1 道题作答时间偏短/)).toBeTruthy();
  }, 20000);

  it("⑤ 完成后清除 localStorage（进度清空 + 结果快照落盘）", async () => {
    const user = userEvent.setup();

    const answers: Record<string, number> = {};
    for (const q of order) answers[q.id] = 2;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          mode: "full",
          answers: { quick: {}, full: answers },
          index: { quick: 0, full: order.length - 1 },
          startedAt: { quick: null, full: Date.now() },
          finishedAt: { quick: null, full: null },
          seenEggs: [],
          unlocked: false,
        },
        version: 2,
      }),
    );
    useQuizStore.persist.rehydrate();

    render(<TestClient />);
    await waitFor(() => expect(screen.getByTestId("question-card")).toBeTruthy());

    const buttons = within(screen.getByTestId("question-card")).getAllByRole("button");
    const resultBtn = buttons.find((b) => /看结果/.test(b.textContent ?? ""));
    await user.click(resultBtn!);

    await waitFor(() => expect(screen.getByText(/确认生成结果/)).toBeTruthy(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /确认生成/ }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/result"), { timeout: 3000 });

    // 答题进度已清空（answers 不再留在 p64:v1 里）
    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { state?: { answers?: Record<string, Record<string, number>> } }) : null;
      expect(parsed?.state?.answers?.full ?? {}).toEqual({});
    });

    // 但结果快照单独落盘，刷新结果页仍能读到
    const snap = window.localStorage.getItem(RESULT_KEY);
    expect(snap).toBeTruthy();
    const parsedSnap = JSON.parse(snap!) as { complete?: boolean; code?: string };
    expect(parsedSnap.complete).toBe(true);
    expect(parsedSnap.code).toMatch(/^[A-Z]{4}-[AC]-[OH]$/);
  }, 20000);
});
