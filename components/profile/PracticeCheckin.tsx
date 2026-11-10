"use client";

import { useEffect, useState } from "react";
import {
  PRACTICE_DAYS,
  PRACTICE_KEY,
  type PracticeDirection,
  type PracticeState,
  EMPTY_PRACTICE,
  progressDots,
  readPracticeState,
  setReview,
  todayISO,
  toggleCheckin,
  writePracticeState,
} from "@/lib/practice-store";
import { cn } from "@/lib/utils";

const DIRECTIONS: { key: PracticeDirection; label: string; desc: string }[] = [
  { key: "c2a", label: "C → A", desc: "从审慎校准到清晰主张" },
  { key: "a2c", label: "A → C", desc: "从果断主张回到审慎校准" },
  { key: "o2h", label: "O → H", desc: "从求新探索到守成沉淀" },
  { key: "h2o", label: "H → O", desc: "从守成维护到重新求新" },
];

export interface PracticeCheckinProps {
  /** 该型别下的四组微动作，key 与方向一致 */
  actions: Record<PracticeDirection, string[]>;
  /** 允许用户自填动作（结果页没有书稿微动作时使用） */
  allowCustom?: boolean;
}

/**
 * 今日微动作打卡器：勾选一个方向作为「我的 7 天微动作实验」，
 * 状态写入 localStorage["p64:practice:v1"]，与测评主状态机隔离。
 */
export default function PracticeCheckin({ actions, allowCustom = false }: PracticeCheckinProps) {
  const [state, setState] = useState<PracticeState>(EMPTY_PRACTICE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readPracticeState());
    setReady(true);
  }, []);

  function update(next: PracticeState) {
    setState(next);
    writePracticeState(next);
  }

  const today = todayISO();
  const dots = progressDots(state);
  const doneCount = state.checkins.length;

  if (!ready) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
        <p className="text-sm text-[var(--text-tertiary)]">正在读取你的练习进度…</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">我的 7 天微动作实验</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {state.direction ? `已选 ${DIRECTIONS.find((d) => d.key === state.direction)?.label}` : "尚未选择"}
          {doneCount > 0 ? ` · 已打卡 ${doneCount}/${PRACTICE_DAYS}` : ""}
        </p>
      </div>

      {/* 方向选择 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {DIRECTIONS.map((d) => {
          const items = actions[d.key] ?? [];
          if (items.length === 0) return null;
          const active = state.direction === d.key;
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={active}
              onClick={() =>
                update({
                  ...state,
                  direction: active ? null : d.key,
                  action: active ? null : items[0],
                  startDate: active ? null : today,
                })
              }
              className={cn(
                "min-h-[36px] rounded-full border px-3 text-[12px] font-semibold transition",
                active
                  ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                  : "border-[var(--line)] bg-[var(--bg-elev)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]",
              )}
            >
              {d.label}
            </button>
          );
        })}
        {allowCustom ? (
          <button
            type="button"
            aria-pressed={state.direction === "c2a" && !state.action}
            onClick={() =>
              update({
                ...state,
                direction: state.direction === "c2a" && !state.action ? null : "c2a",
                action: state.direction === "c2a" && !state.action ? null : "",
                startDate: state.direction === "c2a" && !state.action ? null : today,
              })
            }
            className={cn(
              "min-h-[36px] rounded-full border px-3 text-[12px] font-semibold transition",
              state.direction === "c2a" && !state.action
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                : "border-[var(--line)] bg-[var(--bg-elev)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]",
            )}
          >
            自定义
          </button>
        ) : null}
      </div>

      {state.direction ? (
        <>
          {/* 选定动作 */}
          <div className="mt-3">
            <label htmlFor="practice-action" className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
              今天要做的微动作
            </label>
            {(actions[state.direction] ?? []).length > 0 ? (
              <select
                id="practice-action"
                value={state.action ?? ""}
                onChange={(e) => update({ ...state, action: e.target.value })}
                className="mt-1 min-h-[40px] w-full rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-elev)] px-2 text-[13px] text-[var(--text-primary)]"
              >
                {(actions[state.direction] ?? []).map((a, i) => (
                  <option key={i} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="practice-action"
                type="text"
                maxLength={60}
                value={state.action ?? ""}
                onChange={(e) => update({ ...state, action: e.target.value })}
                placeholder="写下你这 7 天要练的一个小动作"
                className="mt-1 min-h-[40px] w-full rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-elev)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            )}
          </div>

          {/* 7 天进度点阵 */}
          <div className="mt-4">
            <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">7 天进度</p>
            <div className="mt-2 flex gap-1.5" role="group" aria-label="7 天打卡">
              {dots.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.future}
                  aria-label={`${d.date}${d.done ? " 已打卡" : ""}`}
                  aria-pressed={d.done}
                  onClick={() => update(toggleCheckin(state, d.date))}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 text-[10px] font-bold transition",
                    d.done
                      ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                      : d.isToday
                        ? "border-dashed border-[var(--text-secondary)] bg-transparent text-[var(--text-secondary)]"
                        : "border-[var(--line)] bg-transparent text-[var(--text-tertiary)]",
                    d.future && "opacity-40",
                  )}
                >
                  {d.done ? "✓" : d.date.slice(-2)}
                </button>
              ))}
            </div>
          </div>

          {/* 晚间回顾 */}
          <div className="mt-4">
            <label htmlFor="practice-review" className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
              晚间回顾 · 一句话
            </label>
            <input
              id="practice-review"
              type="text"
              maxLength={60}
              value={state.reviews[today] ?? ""}
              onChange={(e) => update(setReview(state, today, e.target.value))}
              placeholder="今天我做了什么？哪一步比昨天容易？"
              className="mt-1 min-h-[40px] w-full rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-elev)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[var(--text-tertiary)]">
            进度只存在你的浏览器里（{PRACTICE_KEY}），不会上传。重新开始可取消上方方向。
          </p>
        </>
      ) : (
        <p className="mt-3 text-[12.5px] leading-6 text-[var(--text-tertiary)]">
          选一个方向，把它变成接下来 7 天的小实验。书稿第六卷说的不是「改变人格」，只是把一个旋钮轻轻拧过去一点。
        </p>
      )}
    </div>
  );
}
