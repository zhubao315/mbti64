"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { DIMS, DIM_ORDER } from "@/data/schema";
import { cn, hexA } from "@/lib/utils";

/**
 * 六维说明卡（答题前的「规则说明」，也是首页的可滑动科普）
 *
 * 为什么用卡片轮播而不是长列表：
 * 用户在开始测试前只会给 10 秒注意力，卡片一次只讲一维，
 * 六个维度正好对应 6 张，翻完就等于看懂了规则。
 */

const DIM_ACCENT: Record<string, string> = {
  EI: "#7C5CFF",
  SN: "#5FA8E8",
  TF: "#FF8A8A",
  JP: "#FFD166",
  AC: "#B7A6FF",
  OH: "#7FD1AE",
};

const SUFFIX_KEYS = ["AC", "OH"];

export default function TeachingCarousel({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  const total = DIM_ORDER.length;
  const key = DIM_ORDER[i];
  const dim = DIMS[key];
  const accent = DIM_ACCENT[key] ?? "#7C5CFF";
  const isSuffix = SUFFIX_KEYS.includes(key);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative overflow-hidden">
        <motion.div
          key={key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1.2, 0.36, 1] }}
          className="glass p-5 sm:p-7"
        >
          <div className="flex items-center justify-between">
            <span
              className="chip"
              style={{ color: accent, background: hexA(accent, 0.12), border: `1px solid ${hexA(accent, 0.24)}` }}
            >
              {i + 1} / {total} · {isSuffix ? "后缀维度" : "核心维度"}
            </span>
            <span className="text-[11.5px] font-medium text-ink-mute">
              每题只问一件事
            </span>
          </div>

          <h3 className="mt-3 text-[20px] font-bold tracking-tight text-ink sm:text-[23px]">{dim.name}</h3>

          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{dim.question}</p>

          <div className="mt-4 flex items-center gap-2.5">
            <PoleTag label={dim.poleAName} accent={accent} />
            <span aria-hidden className="text-[13px] text-ink-mute">
              ⇄
            </span>
            <PoleTag label={dim.poleBName} accent="#8B85A0" muted />
          </div>

          <p className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
            {dim.summary}
          </p>

          {isSuffix && (
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-mute">
              这一维只看「二选一」的票数：票数不到 <strong className="text-ink-soft">2/3</strong> 时，会被标成
              <strong className="text-ink-soft"> 摇摆型（-X）</strong>，代表你两种状态都成立。
            </p>
          )}
        </motion.div>
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
                "h-1.5 rounded-full transition-all duration-300",
                idx === i ? "w-5 bg-violet" : "w-1.5 bg-ink/15",
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

function PoleTag({ label, accent, muted = false }: { label: string; accent: string; muted?: boolean }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-[12px] font-semibold"
      style={{
        color: muted ? "#5B5470" : accent,
        background: muted ? "rgba(139,133,160,0.12)" : hexA(accent, 0.12),
        border: `1px solid ${muted ? "rgba(139,133,160,0.24)" : hexA(accent, 0.24)}`,
      }}
    >
      {label}
    </span>
  );
}
