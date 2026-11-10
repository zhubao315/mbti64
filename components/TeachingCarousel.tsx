"use client";

import { useState } from "react";
import { DIMS, DIM_ORDER } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * 六维说明卡（答题前的「规则说明」，也是首页的可滑动科普）
 *
 * 单色体系：维度不是族群，不占语义色——用墨色深浅区分主导极与另一极。
 */

const SUFFIX_KEYS = ["AC", "OH"];

export default function TeachingCarousel({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  const total = DIM_ORDER.length;
  const key = DIM_ORDER[i];
  const dim = DIMS[key];
  const isSuffix = SUFFIX_KEYS.includes(key);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative overflow-hidden">
        <div
          key={key}
          className="card animate-fade-in p-5 sm:p-7"
        >
          <div className="flex items-center justify-between">
            <span className="chip border border-line bg-wash text-ink-soft">
              {i + 1} / {total} · {isSuffix ? "后缀维度" : "核心维度"}
            </span>
            <span className="text-[11.5px] font-medium text-ink-mute">每题只问一件事</span>
          </div>

          <h3 className="mt-3 text-[20px] font-bold tracking-tight text-navy sm:text-[23px]">{dim.name}</h3>

          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{dim.question}</p>

          <div className="mt-4 flex items-center gap-2.5">
            <PoleTag label={dim.poleAName} active />
            <span aria-hidden className="text-[13px] text-ink-mute">
              ⇄
            </span>
            <PoleTag label={dim.poleBName} />
          </div>

          <p className="mt-4 rounded-[10px] bg-wash px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
            {dim.summary}
          </p>

          {isSuffix && (
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-mute">
              这一维只看「二选一」的票数：票数不到 <strong className="text-ink-soft">2/3</strong> 时，会被标成
              <strong className="text-ink-soft"> 摇摆型（-X）</strong>，代表你两种状态都成立。
            </p>
          )}
        </div>
      </div>

      {/* 控制条 */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setI((n) => Math.max(0, n - 1))}
          disabled={i === 0}
          className="btn-ghost !px-4 !py-2 !text-[13px] disabled:opacity-40"
        >
          ← 上一维
        </button>

        <div className="flex items-center gap-1.5" aria-hidden>
          {DIM_ORDER.map((k, idx) => (
            <span
              key={k}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                idx === i ? "w-5 bg-navy" : "w-1.5 bg-navy/15",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setI((n) => Math.min(total - 1, n + 1))}
          disabled={i === total - 1}
          className="btn-ghost !px-4 !py-2 !text-[13px] disabled:opacity-40"
        >
          下一维 →
        </button>
      </div>
    </div>
  );
}

function PoleTag({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[12px] font-semibold",
        active ? "border border-navy bg-navy text-white" : "border border-line bg-white text-ink-mute",
      )}
    >
      {label}
    </span>
  );
}
