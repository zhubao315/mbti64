"use client";

import { useState } from "react";
import type { BookVariant } from "@/data/bookEnriched";

interface LifecycleCompassProps {
  base: string;
  spiralStage: Record<string, BookVariant>;
  currentSuffix?: string | null;
}

const SEASON_ORDER = ["C-O", "A-O", "A-H", "C-H"] as const;
const SEASON_LABELS = { "C-O": "春 · 觉醒", "A-O": "夏 · 破局", "A-H": "秋 · 建制", "C-H": "冬 · 内观" };

export default function LifecycleCompass({ base, spiralStage, currentSuffix }: LifecycleCompassProps) {
  const [active, setActive] = useState<string>(currentSuffix ?? "C-O");
  const current = spiralStage[active];

  if (!current) return null;

  return (
    <section className="mt-10 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">LIFECYCLE SPIRAL COMPASS</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">四季演进罗盘</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">同一套神经底盘的四种季节</p>
      </div>

      {/* 四季圆盘 */}
      <div className="relative mx-auto h-48 w-48 max-w-full">
        {/* 中心 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-[var(--line)] bg-[var(--bg-soft)] flex flex-col items-center justify-center">
            <span className="text-[10px] tracking-wider text-[var(--text-tertiary)]">你在这里</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{base}-{active}</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{current.seasonLabel}</span>
          </div>
        </div>

        {/* 四个季节按钮 */}
        {SEASON_ORDER.map((suffix, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          const isActive = suffix === active;
          const meta = spiralStage[suffix];
          return (
            <button
              key={suffix}
              onClick={() => setActive(suffix)}
              className="absolute flex flex-col items-center gap-0.5 transition-transform hover:scale-105"
              style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
            >
              <span
                className="h-3 w-3 rounded-full border-2"
                style={{
                  borderColor: meta?.color ?? "#999",
                  backgroundColor: isActive ? (meta?.color ?? "#999") : "transparent",
                }}
              />
              <span className={`text-[10px] ${isActive ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                {SEASON_LABELS[suffix]}
              </span>
            </button>
          );
        })}

        {/* 连接线 */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* 当前态详情 */}
      <div className="mt-5 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: current.color }} />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{current.label}</h3>
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">第 {current.rank}/64 · {current.per1000}‰</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{current.bodyPreview}</p>
        {current.hiddenStuck && (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">隐秘卡点：</span>{current.hiddenStuck}
          </p>
        )}
        {current.nextSuffix && (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">下一阶：</span>{current.nextLabel}
          </p>
        )}
      </div>
    </section>
  );
}
