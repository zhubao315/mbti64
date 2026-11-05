"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 进度条：墨色实心推进
 * 用 framer-motion 的 spring 做宽度过渡，不做流光动画 —— 测评进行中不应该有抢注意力的装饰。
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
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#E8E8E8]"
        data-testid="progress"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`答题进度 ${current} / ${total}`}
      >
        <motion.div
          className="h-full rounded-full bg-navy"
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
              done ? "w-5 bg-navy" : active ? "w-5 bg-navy/40" : "w-1.5 bg-navy/15",
            )}
          />
        );
      })}
    </div>
  );
}
