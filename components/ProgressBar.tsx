"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 进度条：水彩光带 + 弹簧推进
 * 光带用 CSS 动画（.progress-band::after），不额外吃 JS 帧
 */
export default function ProgressBar({
  current,
  total,
  className,
  showCount = true,
}: {
  /** 已答题数（1-based 视觉更自然） */
  current: number;
  total: number;
  className?: string;
  showCount?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className={cn("w-full", className)}>
      {showCount && (
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-[11.5px] font-semibold tracking-wide text-ink-mute">
            {current === total ? "已答完" : "答题进度"}
          </span>
          <span className="num-hero text-[12.5px] font-bold text-ink-soft">
            {current}
            <span className="text-ink-mute"> / {total}</span>
          </span>
        </div>
      )}

      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/70 shadow-[inset_0_1px_2px_rgba(59,40,120,0.12)]"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`答题进度 ${current} / ${total}`}
      >
        <motion.div
          className="progress-band relative h-full rounded-full bg-gradient-to-r from-violet via-violet-soft to-coral"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
        />
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
              done ? "w-5 bg-violet" : active ? "w-5 bg-violet/45" : "w-1.5 bg-ink/15",
            )}
          />
        );
      })}
    </div>
  );
}
