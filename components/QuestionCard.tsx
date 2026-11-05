"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { DIMS, LIKERT_LABELS, type Question } from "@/data/schema";
import { cn, hexA } from "@/lib/utils";

/**
 * 单题卡：三种题型共用一套壳，保证「场景标签 + 题干 + 选项 + 坐标系提示」结构稳定
 *
 * 为什么加「印章反馈」：心理测评最大的流失点在「点了没反应」，
 * 300ms 内出现一次盖章动效，等于告诉用户「这一题已经记下了」，比任何进度条都有效。
 */

const SCENE_HINT: Record<string, string> = {
  职场: "按你最近一年真实的样子答，不用按「应该怎样」答。",
  社交: "想你在熟人面前的样子，不用考虑长辈期待。",
  消费: "按你实际付款时的第一反应，不是按预算该有的样子。",
  生活方式: "按你一个人的时候的习惯，不用按朋友圈的人设。",
  数字生活: "按你手机里的真实操作，没人会看到。",
};

export default function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
  onPrev,
  isLast,
}: {
  question: Question;
  index: number;
  total: number;
  selected: number | undefined;
  onSelect: (choiceIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
}) {
  const dim = DIMS[question.dim];
  const [stamped, setStamped] = useState<number | null>(null);

  // 换题时清掉上一题的印章，避免串味
  useEffect(() => {
    setStamped(null);
  }, [question.id]);

  function pick(i: number) {
    onSelect(i);
    setStamped(i);
  }

  return (
    <div className="w-full" data-testid="question-card" data-qid={question.id} data-qtype={question.type}>
      {/* 顶部元信息：维度 / 题号 / 场景 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip border border-line bg-wash text-ink">{dim.name}</span>
        <span className="chip border border-line bg-white text-ink-soft">{question.scene}</span>
        <span className="ml-auto text-[11.5px] font-medium tabular-nums text-ink-mute">
          第 {index + 1} / {total} 题
        </span>
      </div>

      {/* 题干 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.26, ease: [0.22, 1.2, 0.36, 1] }}
        >
          <h2 className="text-[19px] font-bold leading-[1.55] tracking-tight text-ink sm:text-[22px]">
            {question.text}
          </h2>

          {question.reverse && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-mute">
              <ArrowsClockwise size={12} aria-hidden /> 这题的方向和其它题相反，按直觉答就好
            </p>
          )}

          {/* 选项区 */}
          <div className="mt-5">
            {question.type === "likert" && (
              <LikertRow selected={selected} onPick={pick} />
            )}

            {question.type === "binary" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {question.choices?.map((c, i) => (
                  <ChoiceCard
                    key={c.label}
                    active={selected === i}
                    stamped={stamped === i}
                    onClick={() => pick(i)}
                    label={c.label}
                    index={i}
                  />
                ))}
              </div>
            )}

            {question.type === "image" && (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {question.choices?.map((c, i) => (
                  <ChoiceCard
                    key={c.label}
                    active={selected === i}
                    stamped={stamped === i}
                    onClick={() => pick(i)}
                    label={c.label}
                    note={c.note}
                    index={i}
                    big
                  />
                ))}
              </div>
            )}
          </div>

          {/* 社交坐标系提示 */}
          <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-mute">
            <span aria-hidden className="mt-px">
              ↳
            </span>
            <span>{question.hint ?? SCENE_HINT[question.scene] ?? "按第一直觉答，不用想「应该怎样」。"}</span>
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 底部导航 */}
      <div className="mt-5 flex items-center gap-2.5">
        <button
          type="button"
          className="btn-ghost !px-5 !py-2.5 !text-[14px] disabled:opacity-40"
          onClick={onPrev}
          disabled={index === 0}
        >
          ← 上一题
        </button>

        <button
          type="button"
          className="btn-primary ml-auto !px-6 !py-3 !text-[15px] disabled:pointer-events-none disabled:opacity-45"
          onClick={onNext}
          disabled={selected === undefined}
        >
          {isLast ? "看结果" : "下一题 →"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 子组件 */

function LikertRow({ selected, onPick }: { selected: number | undefined; onPick: (i: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {LIKERT_LABELS.map((label, i) => {
        const active = selected === i;
        // 两端用主色强调「强同意/强不同意」，中间三档保持中性
        const strength = i === 0 || i === 4 ? 1 : 0;
        return (
          <button
            key={label}
            type="button"
            data-choice={i}
            onClick={() => onPick(i)}
            aria-pressed={active}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-[10px] border px-1 py-3 transition-all duration-200 sm:py-4",
              active
                ? "border-navy bg-navy-soft text-navy shadow-card"
                : "border-line bg-white text-ink-soft hover:-translate-y-0.5 hover:border-navy/30 hover:bg-surface-hover",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "rounded-full transition-all",
                active ? "h-2.5 w-2.5 bg-navy" : strength ? "h-2 w-2 bg-navy/25" : "h-1.5 w-1.5 bg-navy/20",
              )}
            />
            <span className={cn("text-center text-[11px] leading-tight sm:text-[12px]", active ? "font-bold" : "font-medium")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceCard({
  active,
  stamped,
  onClick,
  label,
  note,
  index,
  big = false,
}: {
  active: boolean;
  stamped: boolean;
  onClick: () => void;
  label: string;
  note?: string;
  index: number;
  big?: boolean;
}) {
  const letters = ["A", "B", "C", "D"];
  return (
    <button
      type="button"
      data-choice={index}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative overflow-hidden rounded-[10px] border text-left transition-all duration-200",
        big ? "p-3.5 sm:p-4" : "p-3.5 sm:p-4",
        active
          ? "border-navy bg-navy-soft shadow-card"
          : "border-line bg-white hover:-translate-y-0.5 hover:border-navy/30 hover:bg-surface-hover",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center rounded-full text-[12px] font-bold",
            big ? "h-7 w-7" : "h-6 w-6",
            active ? "bg-navy text-white" : "bg-surface-hover text-ink-mute",
          )}
        >
          {letters[index] ?? index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className={cn("block font-semibold leading-snug text-[14px]", active ? "text-navy" : "text-ink")}>
            {label}
          </span>
          {note && <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-mute">{note}</span>}
        </span>
      </div>

      {/* 盖章反馈 */}
      <AnimatePresence>
        {stamped && (
          <motion.span
            initial={{ opacity: 0, scale: 1.8, rotate: -18 }}
            animate={{ opacity: 1, scale: 1, rotate: -9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1.2, 0.36, 1] }}
            className="pointer-events-none absolute right-2 top-2 rounded-[6px] border px-1.5 py-0.5 text-[10px] font-black tracking-widest text-navy"
            style={{ borderColor: hexA("#0F2747", 0.25) }}
            aria-hidden
          >
            记下
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
