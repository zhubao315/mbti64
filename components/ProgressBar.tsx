"use client";

import { cn } from "@/lib/utils";
import { progressPct } from "@/lib/progress";

/**
 * 进度条：墨色实心推进 + 百分比读数
 *
 * 用 spring 做宽度过渡，不做流光动画 —— 测评进行中不应该有抢注意力的装饰。
 * 每 10 题一个白色分段刻度，让长测的「还剩几段」一眼可见。
 */
export default function ProgressBar({
  current,
  total,
  className,
  showCount = true,
}: {
  /** 已答题数 */
  current: number;
  total: number;
  className?: string;
  showCount?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
  const pctInt = progressPct(current, total);
  const finished = current >= total && total > 0;
  const segments = Math.max(1, Math.ceil(total / 10));

  return (
    <div className={cn("w-full", className)}>
      {showCount && (
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-ink-mute">
            <span
              aria-hidden
              className={cn("h-1.5 w-1.5 rounded-full", finished ? "bg-success" : "bg-navy")}
            />
            {finished ? "全部完成" : "答题进度"}
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="num-hero text-[15px] font-black leading-none text-navy">
              {pctInt}
              <span className="ml-0.5 text-[10.5px] font-bold text-ink-mute">%</span>
            </span>
            <span className="text-[11.5px] font-semibold text-ink-mute">
              已答 {current} / {total}
            </span>
          </span>
        </div>
      )}

      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full border border-line bg-white"
        data-testid="progress"
        data-answered={current}
        data-total={total}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={`已答 ${current} / ${total} 题，进度 ${pctInt}%`}
        aria-label={`答题进度 ${current} / ${total}`}
      >
        {/* 用 CSS transition 取代 motion.div：动画库不进答题页首屏关键包 */}
        <div className="progress-fill h-full rounded-full bg-navy" style={{ width: `${pct}%` }} />

        {segments > 1 &&
          Array.from({ length: segments - 1 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-0 h-full w-px bg-white/60"
              style={{ left: `${((i + 1) / segments) * 100}%` }}
            />
          ))}
      </div>
    </div>
  );
}

/** 分段点阵：每 10 题一个点，用于长测的「还剩几段」感知 */
export function ProgressDots({
  current,
  total,
  step = 10,
  className,
}: {
  current: number;
  total: number;
  step?: number;
  className?: string;
}) {
  const segments = Math.ceil(total / step);
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)} aria-hidden>
      {Array.from({ length: segments }).map((_, i) => {
        const done = current >= Math.min((i + 1) * step, total);
        const active = current > i * step && !done;
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              done ? "w-5 bg-navy" : active ? "w-5 bg-navy/40" : "w-1.5 bg-navy/15",
            )}
          />
        );
      })}
    </div>
  );
}
