"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Notebook } from "@phosphor-icons/react";
import {
  dateOfPlanDay,
  PRACTICE_KEY,
  PRACTICE_PLAN_DAYS,
  downloadText,
  exportPracticeMarkdown,
  planProgress,
  readPracticeState,
  setReview,
  todayISO,
  toggleCheckin,
  writePracticeState,
  type PracticePlanDay,
  type PracticeState,
} from "@/lib/practice-store";
import { cn } from "@/lib/utils";

/**
 * 30 天行为实验实验室
 *
 * 内容全部来自书稿第六卷：
 *   第 24 章 · 30 天人格探索与行为练习计划（每天的微动作 + 晚间回顾提问）
 *   第 23 章 · 亲密关系潜台词翻译器（20 组吵架翻译）
 *   第 23 章 · 职场四象限（开荒 / 建制 / 拍板 / 把关）
 *
 * 打卡与复盘只存在浏览器本机（p64:practice:v1），可导出 Markdown 手记。
 */
export default function PracticeLab() {
  const [state, setState] = useState<PracticeState | null>(null);
  const [plan, setPlan] = useState<PracticePlanDay[]>([]);
  const [tab, setTab] = useState<"days" | "dictionary" | "quadrants">("days");
  const [lab, setLab] = useState<{
    dictionary: Array<{ pair: string; surface: string; misheard: string; mechanism: string; reply: string }>;
    quadrants: Array<{
      name: string;
      coreAction: string;
      behavior: string;
      bestSuffix: string;
      scenes: string;
      risk: string;
    }>;
  } | null>(null);

  useEffect(() => {
    setState(readPracticeState());
    void (async () => {
      const mod = await import("@/data/practiceLab.json");
      const data = mod.default ?? mod;
      setPlan(data.days ?? []);
      setLab({ dictionary: data.dictionary ?? [], quadrants: data.quadrants ?? [] });
    })();
  }, []);

  const today = todayISO();
  const progress = useMemo(() => (state ? planProgress(state) : null), [state]);

  const update = (next: PracticeState) => {
    setState(next);
    writePracticeState(next);
  };

  if (!state || !progress) {
    return (
      <div className="mt-4 h-[160px] w-full animate-pulse rounded-[var(--r-md)] bg-[var(--bg-soft)]" aria-hidden />
    );
  }

  const todayPlan = plan.find((d) => d.day === progress.currentDay) ?? null;

  return (
    <div className="mt-4">
      {/* 进度 */}
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            30 天行为实验 · 第 {progress.currentDay || "—"} / {PRACTICE_PLAN_DAYS} 天
          </p>
          <p className="text-[11.5px] text-[var(--text-tertiary)]">
            打卡 {progress.done} 天 · 完成度 {progress.percent}%
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elev)]">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-[width] duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {todayPlan ? (
          <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--bg-elev)] p-3">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              今天（第 {todayPlan.day} 天）· {todayPlan.direction}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-primary)]">
              {todayPlan.action}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
              晚间回顾：{todayPlan.question}
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => update(toggleCheckin(state, today))}
            className={cn(
              "min-h-[38px] rounded-full border px-3.5 text-[12.5px] font-semibold transition",
              state.checkins.includes(today)
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                : "border-[var(--line)] bg-[var(--bg-elev)] text-[var(--text-secondary)]",
            )}
          >
            {state.checkins.includes(today) ? "今天已打卡" : "今天打卡"}
          </button>
          <input
            type="text"
            maxLength={60}
            value={state.reviews[today] ?? ""}
            onChange={(e) => update(setReview(state, today, e.target.value))}
            placeholder="晚间回顾 · 一句话"
            className="min-h-[38px] flex-1 rounded-[8px] border border-[var(--line)] bg-[var(--bg-elev)] px-3 text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          <button
            type="button"
            onClick={() =>
              downloadText(
                `MBTI64-30天复盘-${today}.md`,
                exportPracticeMarkdown(state, plan),
              )
            }
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-elev)] px-3 text-[12.5px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--text-tertiary)]"
          >
            <Download size={14} aria-hidden />
            导出复盘手记
          </button>
        </div>
      </div>

      {/* 三个工具页 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(
          [
            ["days", "30 天清单"],
            ["dictionary", "吵架潜台词词典"],
            ["quadrants", "职场四象限"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "min-h-[32px] rounded-full border px-3 text-[12px] font-semibold transition",
              tab === key
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                : "border-[var(--line)] bg-[var(--bg-soft)] text-[var(--text-secondary)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "days" ? (
        <ol className="mt-2.5 space-y-1.5">
          {plan.map((d) => {
            const date = dateOfPlanDay(state.startDate, d.day);
            const done = date ? state.checkins.includes(date) : false;
            return (
              <li
                key={d.day}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2"
              >
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] font-bold tabular-nums text-[var(--text-tertiary)]">
                    Day {d.day}
                  </span>
                  <span className="text-[12.5px] text-[var(--text-primary)]">{d.action}</span>
                  {done ? (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--bg-elev)] px-1.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                      已打卡
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {d.direction} · {d.question}
                </p>
              </li>
            );
          })}
        </ol>
      ) : null}

      {tab === "dictionary" && lab ? (
        <div className="mt-2.5 space-y-2">
          {lab.dictionary.map((d, i) => (
            <div key={`${d.pair}-${i}`} className="rounded-[8px] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)]">{d.pair}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-primary)]">{d.surface}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
                对方听成：{d.misheard}
              </p>
              {d.mechanism ? (
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
                  {d.mechanism}
                </p>
              ) : null}
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
                可以这样说：{d.reply}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "quadrants" && lab ? (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {lab.quadrants.map((q) => (
            <div key={q.name} className="rounded-[8px] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
              <p className="text-[13px] font-bold text-[var(--text-primary)]">{q.name}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
                {q.coreAction}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                {q.behavior} · 适合 {q.bestSuffix}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                典型场景：{q.scenes}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                核心风险：{q.risk}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-[var(--text-tertiary)]">
        <Notebook size={13} aria-hidden className="mt-0.5 shrink-0" />
        打卡与复盘只存在你的浏览器里（{PRACTICE_KEY}），不会上传；
        导出的 Markdown 是你自己的复盘手记，可自由保存到别处。
      </p>
    </div>
  );
}
