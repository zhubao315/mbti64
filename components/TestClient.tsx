"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar, { ProgressDots } from "@/components/ProgressBar";
import EasterEgg from "@/components/EasterEgg";
import DisclaimerBar from "@/components/DisclaimerBar";
import { SESSION_ORDER, EASTER_EGGS } from "@/data/questions";
import { answeredTotal, totalOf, useHydrated, useQuizStore } from "@/lib/store";
import { DIMS } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * 答题页客户端
 *
 * 三个关键决策：
 * 1) 首帧不渲染任何依赖 localStorage 的内容（useHydrated 守卫），否则 React 会报 hydration mismatch。
 * 2) 选完自动跳下一题（320ms），但保留「上一题」按钮 —— 心理测评里"点了没反应"是最大的流失点。
 * 3) 彩蛋按「已答题数」触发而不是按 index，这样即使回跳改答案也不会重复弹。
 */
export default function TestClient() {
  const router = useRouter();
  const hydrated = useHydrated();

  const mode = useQuizStore((s) => s.mode);
  const answers = useQuizStore((s) => s.answers);
  const index = useQuizStore((s) => s.index);
  const seenEggs = useQuizStore((s) => s.seenEggs);
  const answer = useQuizStore((s) => s.answer);
  const goTo = useQuizStore((s) => s.goTo);
  const next = useQuizStore((s) => s.next);
  const prev = useQuizStore((s) => s.prev);
  const markEgg = useQuizStore((s) => s.markEgg);
  const finish = useQuizStore((s) => s.finish);
  const setMode = useQuizStore((s) => s.setMode);
  const reset = useQuizStore((s) => s.reset);

  const [egg, setEgg] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const order = SESSION_ORDER[mode];
  const total = order.length;
  const answered = answeredTotal({ answers, mode });
  const done = answered >= total && total > 0;
  const question = order[Math.min(index, total - 1)];
  const selected = question ? answers[question.id] : undefined;

  // 换题时滚动回顶部（长题卡在手机上会溢出屏幕）
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [index]);

  // 每答完 10 题触发一次彩蛋（同一蛋只弹一次）
  useEffect(() => {
    if (!hydrated || answered === 0) return;
    if (answered % 10 !== 0) return;
    const eggIndex = Math.max(0, answered / 10 - 1);
    if (eggIndex >= EASTER_EGGS.length) return;
    if (seenEggs.includes(eggIndex)) return;
    markEgg(eggIndex);
    setEgg(eggIndex);
  }, [answered, hydrated, seenEggs, markEgg]);

  // 卸载时清掉未执行的自动跳题，避免跳页后仍然 setTimeout
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const handleSelect = useCallback(
    (choiceIndex: number) => {
      if (!question) return;
      answer(question.id, choiceIndex);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const isLast = index >= total - 1;
      if (!isLast) {
        advanceTimer.current = setTimeout(() => next(), 320);
      }
    },
    [answer, index, next, question, total],
  );

  const handleFinish = useCallback(() => {
    finish();
    router.push("/result");
  }, [finish, router]);

  const remaining = useMemo(() => total - answered, [total, answered]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="sr-only">64 型人格测评 · 答题</h1>
        <div className="glass h-2.5 w-full animate-pulse rounded-full" />
        <div className="glass mt-4 h-[420px] w-full animate-pulse rounded-3xl" />
        <p className="mt-6 text-center text-[12px] text-ink-mute">正在读取上次的答题进度…</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:pt-10">
      {/* 语义标题：题目本身是 h2，页面需要一个 h1 供屏幕阅读器与 SEO 使用 */}
      <h1 className="sr-only">64 型人格测评 · 答题</h1>

      {/* 顶部：模式 + 进度 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["quick", "full"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (m === mode) return;
                setMode(m);
                setEgg(null);
              }}
              className={cn(
                "min-h-[38px] rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                m === mode ? "bg-ink text-white" : "bg-white/70 text-ink-soft hover:bg-white",
              )}
            >
              {m === "quick" ? `精简 ${totalOf("quick")} 题` : `完整 ${totalOf("full")} 题`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="flex min-h-[40px] items-center rounded-full px-2.5 text-[12.5px] font-medium text-ink-mute transition hover:bg-white/70 hover:text-ink"
          >
            退出
          </Link>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex min-h-[40px] items-center rounded-full px-2.5 text-[12.5px] font-medium text-ink-mute transition hover:bg-white/70 hover:text-coral-deep"
          >
            重新开始
          </button>
        </div>
      </div>

      <ProgressBar current={answered} total={total} className="mt-4" />
      <ProgressDots current={answered} total={total} className="mt-2" />

      {answered > 0 && !done && (
        <p className="mt-2 text-[11.5px] text-ink-mute">
          已保存到本机浏览器，随时可以关掉再来 · 还剩 {remaining} 题
        </p>
      )}

      {/* 题卡 */}
      <div className="mt-5">
        <AnimatePresence mode="wait">
          {question && (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1.2, 0.36, 1] }}
            >
              <QuestionCard
                question={question}
                index={index}
                total={total}
                selected={selected}
                onSelect={handleSelect}
                onNext={() => (index >= total - 1 ? handleFinish() : next())}
                onPrev={() => {
                  if (advanceTimer.current) clearTimeout(advanceTimer.current);
                  prev();
                }}
                isLast={index >= total - 1}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 完成态：兜底 CTA（题卡最后一题的按钮已经变成「看结果」） */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mt-5 flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <div>
            <p className="text-[14px] font-bold text-ink">全部 {total} 题已完成</p>
            <p className="mt-1 text-[12px] text-ink-mute">结果只存在你的浏览器里，不上传任何答题记录。</p>
          </div>
          <button type="button" onClick={handleFinish} className="btn-primary shrink-0">
            生成我的 64 型结果 ✦
          </button>
        </motion.div>
      )}

      {/* 维度提示：让用户知道当前在测哪一维（降低中段疲劳） */}
      {question && (
        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-mute">
          当前维度 · {DIMS[question.dim].name}
          <span className="mx-1.5 opacity-40">/</span>
          {DIMS[question.dim].question}
        </p>
      )}

      <EasterEgg eggIndex={egg ?? 0} open={egg !== null} onClose={() => setEgg(null)} />

      {/* 重置确认 */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <button
              type="button"
              aria-label="取消"
              className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
              onClick={() => setConfirmReset(false)}
            />
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="glass-strong relative w-full max-w-sm p-5"
            >
              <h2 id="reset-title" className="text-[17px] font-bold text-ink">
                清空所有答题记录？
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">
                已答的 {answered} 题会被删除，这个操作不可撤销。
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmReset(false)} className="btn-ghost !py-2.5 !text-[14px]">
                  继续答题
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setEgg(null);
                  }}
                  className="btn !bg-coral !py-2.5 !text-[14px] !text-white"
                >
                  清空重来
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DisclaimerBar variant="sticky" />
    </div>
  );
}
