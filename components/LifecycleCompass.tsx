"use client";

import { useState } from "react";
import type { BookVariant } from "@/data/bookEnriched";

/**
 * 只接收渲染所需字段（不含整章 body），避免把全文序列化到客户端。
 */
export type CompassStage = Omit<BookVariant, "body">;

interface LifecycleCompassProps {
  base: string;
  spiralStage: Record<string, CompassStage>;
  currentSuffix?: string | null;
  /**
   * 摇摆标记：某一轴的二选一票数没到 2/3 门槛（如 AC 的 A 票 3/6）。
   * 这一轴的两个状态都算「当前」，罗盘上会同时点亮。
   */
  swingAxes?: { AC?: boolean; OH?: boolean };
  /** 展示用后缀（含 ?），如 "?-O"；缺省时用当前查看的 state */
  displaySuffix?: string | null;
}

const STATE_ORDER = ["C-O", "A-O", "A-H", "C-H"] as const;

/** 四态固定命名：不是年龄阶段，也不是优劣排序；也不是季节 */
const STATE_LABELS: Record<string, string> = {
  "C-O": "审慎探索",
  "A-O": "坚定探索",
  "A-H": "坚定守成",
  "C-H": "审慎守成",
};

export default function LifecycleCompass({
  base,
  spiralStage,
  currentSuffix,
  swingAxes,
  displaySuffix,
}: LifecycleCompassProps) {
  const [active, setActive] = useState<string>(currentSuffix ?? "C-O");
  const current = spiralStage[active];

  /** 本次作答落在哪些状态上（摇摆轴的两个状态都算） */
  const currentStates = (() => {
    const ac = currentSuffix?.[0] ?? "C";
    const oh = currentSuffix?.[2] ?? "O";
    const acList = swingAxes?.AC ? ["A", "C"] : [ac];
    const ohList = swingAxes?.OH ? ["O", "H"] : [oh];
    return acList.flatMap((a) => ohList.map((o) => `${a}-${o}`));
  })();

  const swinging = currentStates.length > 1;

  if (!current) return null;

  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">FOUR-STATE EXPLORATION COMPASS</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">四种状态 · 双环探索罗盘</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">同一套功能栈的四种调用方式</p>
      </div>

      <p className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
        四态不是年龄阶段，也不是优劣排名。它们代表人在不同情境、角色与成长阶段中可能采用的适应策略：
        同一天里，你完全可以在不同场景调用不同状态。所谓「切换」，是工具箱扩容，而不是从一种人格变成另一种人格。
      </p>

      {/* 四态圆盘 */}
      <div className="relative mx-auto mt-4 h-52 w-52 max-w-full">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>

        {/* 中心 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg-soft)] text-center">
            <span className="text-[10px] tracking-wider text-[var(--text-tertiary)]">当前查看</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {base}-{displaySuffix ?? active}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {swinging ? "摇摆过渡" : STATE_LABELS[active]}
            </span>
          </div>
        </div>

        {/* 四个状态按钮 */}
        {STATE_ORDER.map((suffix, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          const isActive = suffix === active;
          const isCurrent = currentStates.includes(suffix);
          const meta = spiralStage[suffix];
          return (
            <button
              key={suffix}
              type="button"
              onClick={() => setActive(suffix)}
              aria-pressed={isActive}
              aria-label={`查看 ${base}-${suffix} ${STATE_LABELS[suffix]}`}
              className={`absolute flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded px-1 py-0.5 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isActive ? "font-semibold" : ""
              }`}
              style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
            >
              <span
                className="h-3 w-3 rounded-full border-2"
                style={{
                  borderColor: meta?.color ?? "#999",
                  backgroundColor: isActive ? (meta?.color ?? "#999") : "transparent",
                  // 摇摆轴：本次作答落点用实心内圈标出，与「正在查看」区分开
                  boxShadow: isCurrent && !isActive ? `inset 0 0 0 3px var(--bg-soft)` : undefined,
                }}
              />
              <span className={`whitespace-nowrap text-[10px] ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                {STATE_LABELS[suffix]}
              </span>
            </button>
          );
        })}
      </div>

      {swinging ? (
        <p className="mt-3 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3 text-[12.5px] leading-6 text-[var(--text-secondary)]">
          你在
          {swingAxes?.AC ? "决策姿态（A/C）" : ""}
          {swingAxes?.AC && swingAxes?.OH ? " 与 " : ""}
          {swingAxes?.OH ? "变化策略（O/H）" : ""}
          上都停在中间地带：二选一票数没到 2/3 门槛。这不是缺陷，而是你还在两种调用方式之间切换的临界态 ——
          罗盘上同时点亮的两颗点，就是你此刻同时带着的两种状态。
        </p>
      ) : null}

      {/* 当前态详情 */}
      <div className="mt-5 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: current.color }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{current.label}</h3>
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
            当前状态
          </span>
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">并列名次 {current.rankLabel ?? current.rank} · 每千人约 {current.per1000} 人</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{current.bodyPreview}</p>
        <p className="mt-2 text-[11px] leading-5 text-[var(--text-tertiary)]">
          书稿节选。其中神经机制表述为通俗解释性类比，不是个人脑成像结果，也不构成诊断结论。
        </p>
        {current.hiddenStuck && (
          <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">隐秘卡点：</span>{current.hiddenStuck}
          </p>
        )}
        {current.leapSignal && (
          <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">跃迁信号：</span>{current.leapSignal}
          </p>
        )}
        {current.nextSuffix && (
          <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">可尝试的训练方向：</span>{current.nextLabel}
          </p>
        )}
      </div>
    </section>
  );
}
