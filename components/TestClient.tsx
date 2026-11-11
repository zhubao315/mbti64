"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar, { ProgressDots } from "@/components/ProgressBar";
import BrandLogo from "@/components/BrandLogo";
import DisclaimerBar from "@/components/DisclaimerBar";
import { SESSION_ORDER, EASTER_EGGS } from "@/data/questions";
import { answeredTotal, totalOf, useHydrated, useQuizStore } from "@/lib/store";
import { clampIndex } from "@/lib/progress";
import { estimateMinutes, reverseConsistency } from "@/lib/answer-checks";
import { DIMS } from "@/data/schema";
import { cn } from "@/lib/utils";

// 这三个弹层带 framer-motion 动画，改为按需加载：
// 动画库（约 116KB）就不会进 /test 的首屏关键包。
const EasterEgg = dynamic(() => import("@/components/EasterEgg"), { ssr: false });
const PauseDialog = dynamic(() => import("@/components/PauseDialog"), { ssr: false });
const AnswerCheckDialog = dynamic(() => import("@/components/AnswerCheckDialog"), { ssr: false });

/**
 * 作答行为统计（仅内存）
 *
 * durations：题目 id → 该题的停留毫秒数
 * changes  ：题目 id → 该题被改答了几次
 *
 * 只用于提交前的提醒，不参与任何计分。
 */
interface AnswerStats {
  durations: Map<string, number>;
  changes: Map<string, number>;
}

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
  const indexByMode = useQuizStore((s) => s.index);
  const index = indexByMode[mode];
  const seenEggs = useQuizStore((s) => s.seenEggs);
  const answer = useQuizStore((s) => s.answer);
  const goTo = useQuizStore((s) => s.goTo);
  const next = useQuizStore((s) => s.next);
  const prev = useQuizStore((s) => s.prev);
  const markEgg = useQuizStore((s) => s.markEgg);
  const finish = useQuizStore((s) => s.finish);
  const setMode = useQuizStore((s) => s.setMode);
  const reset = useQuizStore((s) => s.reset);
  const normalize = useQuizStore((s) => s.normalize);

  const [egg, setEgg] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 已处理过的题目 id：同一题只接受一次选择，挡住连点 */
  const lockedRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  /** 每题首次出现时间（仅内存，不写入 answers） */
  const enteredAtRef = useRef<Map<string, number>>(new Map());
  /**
   * 作答行为统计（仅内存，不写入 answers）：
   *   durations：题目 id → 该题的停留毫秒数
   *   changes  ：题目 id → 该题被改答了几次
   *
   * 为什么用 state 而不是 ref：
   * 统计结论（快答题数 / 改答题数）要随作答实时更新，
   * 而 ref 的「引用」本身不变 —— useMemo 的依赖数组拿不到「内容变了」这个信号。
   * 旧实现写的是 `useMemo(..., [])`，依赖数组为空 → 只在首次挂载时算一次，
   * 而首次挂载时这两个容器还是空的，于是快答数与改答数恒为 0，
   * AnswerCheckDialog 里的两条提示从来没有生效过。
   */
  const [stats, setStats] = useState<AnswerStats>(() => ({
    durations: new Map<string, number>(),
    changes: new Map<string, number>(),
  }));

  const order = SESSION_ORDER[mode];
  const total = order.length;
  const answered = answeredTotal({ answers, mode });
  const done = answered >= total && total > 0;

  // 当前模式里第一道还没答的题：用于「看结果」但还没答完时把用户拉回去补齐
  const firstUnanswered = useMemo(() => {
    const idx = order.findIndex((q) => typeof answers[mode][q.id] !== "number");
    return idx === -1 ? total - 1 : idx;
  }, [answers, mode, order, total]);

  // 单一口径：游标既不超过「已答数」，也不越过第一道未答题。
  // 缓存里若曾出现游标跑到未答题之前（旧版/重复触发遗留），这里会自动拉回到缺口。
  const displayIndex =
    total > 0 ? Math.min(clampIndex(index, answered, total), firstUnanswered) : 0;
  const question = order[Math.min(displayIndex, total - 1)];
  const selected = question ? answers[mode][question.id] : undefined;

  // 首页 CTA 通过 /test?mode=quick|full 进入；挂载后读取一次并写入状态机
  useEffect(() => {
    if (!hydrated) return;
    const param = new URLSearchParams(window.location.search).get("mode");
    if (param === "quick" || param === "full") setMode(param);
  }, [hydrated, setMode]);

  // 读取本地缓存恢复答卷后，先把 answers 与 index 归一化：
  // 进度条百分比 = 已答数 / 总题数，题号也从同一口径推导。
  useEffect(() => {
    if (hydrated) normalize();
  }, [hydrated, normalize]);

  // 换题时滚动回顶部（长题卡在手机上会溢出屏幕）
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [displayIndex]);

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

  // 记录每题首次出现时间（只在内存里，用于作答时长提示）
  useEffect(() => {
    if (!question) return;
    if (!enteredAtRef.current.has(question.id)) enteredAtRef.current.set(question.id, Date.now());
  }, [question]);

  /** 取消当前待执行的自动跳题，并解除题目锁 */
  const cancelAdvance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    lockedRef.current = null;
  }, []);

  const handleSelect = useCallback(
    (questionId: string, choiceIndex: number) => {
      const q = question;
      if (!q) return;
      // 切题动画期间旧卡片还在屏幕上，用 id 挡住对下一题的误点
      if (q.id !== questionId) return;
      // 同一题只处理第一次点击：连点不会反复重置计时器，也不会卡住
      if (lockedRef.current === q.id) return;
      lockedRef.current = q.id;

      // 答题时长与修改记录：只用于提交前提示，不写入 answers
      const now = Date.now();
      const entered = enteredAtRef.current.get(q.id) ?? now;
      enteredAtRef.current.set(q.id, entered);
      const wasAnswered = typeof answers[mode][q.id] === "number";
      setStats((prev) => {
        const durations = new Map(prev.durations);
        durations.set(q.id, now - entered);
        const changes = new Map(prev.changes);
        if (wasAnswered) changes.set(q.id, (changes.get(q.id) ?? 0) + 1);
        return { durations, changes };
      });

      answer(q.id, choiceIndex);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);

      if (displayIndex < total - 1) {
        advanceTimer.current = setTimeout(() => {
          advanceTimer.current = null;
          lockedRef.current = null;
          next();
        }, 260);
      }
    },
    [answer, answers, displayIndex, mode, next, question, total],
  );

  const handleFinish = useCallback(() => {
    // 没答完不能跳结果页：直接拉回第一道未答的题，避免用户看到「不完整结果」
    if (!done) {
      cancelAdvance();
      goTo(firstUnanswered);
      return;
    }
    cancelAdvance();
    setCheckOpen(true);
  }, [cancelAdvance, done, firstUnanswered, goTo]);

  /** 确认后真正结算并跳转 */
  const confirmResult = useCallback(() => {
    setCheckOpen(false);
    finish();
    router.push("/result");
  }, [finish, router]);

  const remaining = useMemo(() => total - answered, [total, answered]);
  /**
   * 快答题数 / 改答题数。
   *
   * 这两个计数来自 durationRef / changeCountRef —— 它们是在事件回调里
   * 就地更新的 ref，引用本身不会变化。
   * 旧实现用 `useMemo(..., [])`：依赖数组为空意味着只在首次挂载时算一次，
   * 而首次挂载时两个 ref 还是空的，所以快答数与改答数永远是 0，
   * AnswerCheckDialog 里的两条提示从来没生效过。
   *
   * 现在依赖 answers（每次作答都会变），保证统计随作答实时重算。
   * answers / mode 在回调里被读取，用于满足依赖完整性并表明重算时机。
   */
  /** 快答题数：停留不足 1.5 秒的题数 */
  const fastCount = useMemo(() => {
    let n = 0;
    for (const d of stats.durations.values()) if (d < 1500) n += 1;
    return n;
  }, [stats]);
  /** 改答题数：被改过答案的题数 */
  const changedCount = useMemo(() => {
    let n = 0;
    for (const c of stats.changes.values()) if (c > 0) n += 1;
    return n;
  }, [stats]);
  const consistencyIssues = useMemo(() => reverseConsistency(answers[mode], order), [answers, mode, order]);

  // 键盘操作：1–5 选择、← 上一题、→/Enter 下一题
  useEffect(() => {
    if (!hydrated || !question) return;
    if (pauseOpen || checkOpen || confirmReset || egg !== null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const max = question.type === "likert" ? 5 : question.choices?.length ?? 0;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= max) {
        e.preventDefault();
        handleSelect(question.id, n - 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        cancelAdvance();
        prev();
        return;
      }
      if (e.key === "ArrowRight" && selected !== undefined) {
        e.preventDefault();
        if (displayIndex >= total - 1) handleFinish();
        else {
          cancelAdvance();
          next();
        }
        return;
      }
      if (e.key === "Enter" && selected !== undefined) {
        e.preventDefault();
        if (displayIndex >= total - 1) handleFinish();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    hydrated,
    question,
    selected,
    pauseOpen,
    checkOpen,
    confirmReset,
    egg,
    displayIndex,
    total,
    handleSelect,
    cancelAdvance,
    prev,
    next,
    handleFinish,
  ]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="sr-only">64 型人格测评 · 答题</h1>
        <div className="card h-2.5 w-full animate-pulse rounded-full" />
        <div className="card mt-4 h-[420px] w-full animate-pulse" />
        <p className="mt-6 text-center text-[12px] text-ink-mute">正在读取上次的答题进度…</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="mx-auto w-full max-w-3xl scroll-mt-24 px-4 pb-28 pt-6 sm:pt-10">
      {/* 语义标题：题目本身是 h2，页面需要一个 h1 供屏幕阅读器与 SEO 使用 */}
      <h1 className="sr-only">64 型人格测评 · 答题</h1>

      {/* 顶部：模式 + 进度 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="icon" size={24} className="opacity-90" />
          <span aria-hidden className="h-4 w-px bg-navy/15" />
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
                  m === mode ? "bg-navy text-white" : "border border-brand-border bg-white text-ink-soft hover:bg-surface-hover",
                )}
              >
                {m === "quick" ? `精简 ${totalOf("quick")} 题` : `完整 ${totalOf("full")} 题`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPauseOpen(true)}
            className="flex min-h-[40px] items-center rounded-full px-2.5 text-[12.5px] font-medium text-ink-mute transition hover:bg-surface-hover hover:text-navy"
          >
            暂停 / 退出
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex min-h-[40px] items-center rounded-full px-2.5 text-[12.5px] font-medium text-ink-mute transition hover:bg-surface-hover hover:text-navy"
          >
            重新开始
          </button>
        </div>
      </div>

      <ProgressBar current={answered} total={total} className="mt-4" />
      <ProgressDots current={answered} total={total} className="mt-2" />

      {answered > 0 && !done && (
        <p className="mt-2 text-[11.5px] text-ink-mute">
          已保存到本机浏览器，随时可以关掉再来 · 还剩 {remaining} 题 · 预计约 {estimateMinutes(remaining)} 分钟
        </p>
      )}
      {answered === 0 && !done && (
        <p className="mt-2 text-[11.5px] text-ink-mute">
          进度自动保存在本机 · 约 {estimateMinutes(remaining)} 分钟完成 · 可用键盘 1–5 选择
        </p>
      )}

      {/* 题卡 */}
      <div className="mt-5">
        {/* 用 CSS 动画取代 framer-motion：动画库（约 116KB）不进答题页首屏关键包。
            题干 h2 是本页 LCP 元素，首屏不做入场淡入，避免推迟 LCP。 */}
        {question && (
            <div key={question.id} className="animate-slide-up">
              <QuestionCard
                question={question}
                index={displayIndex}
                total={total}
                selected={selected}
                onSelect={handleSelect}
                onNext={() => {
                  cancelAdvance();
                  if (displayIndex >= total - 1) handleFinish();
                  else next();
                }}
                onPrev={() => {
                  cancelAdvance();
                  prev();
                }}
                isLast={displayIndex >= total - 1 && done}
                nextLabel={displayIndex >= total - 1 && !done ? "补齐未答题 →" : undefined}
              />
            </div>
        )}
      </div>

      {/* 完成态：兜底 CTA（题卡最后一题的按钮已经变成「看结果」） */}
      {done && (
        <div className="animate-slide-up card mt-5 flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[14px] font-bold text-navy">全部 {total} 题已完成</p>
            <p className="mt-1 text-[12px] text-ink-mute">结果只存在你的浏览器里，不上传任何答题记录。</p>
          </div>
          <button type="button" onClick={handleFinish} className="btn-primary shrink-0">
            生成我的 64 型结果
          </button>
        </div>
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

      <PauseDialog
        open={pauseOpen}
        mode={mode}
        answered={answered}
        total={total}
        onResume={() => setPauseOpen(false)}
        onExit={() => {
          setPauseOpen(false);
          router.push("/");
        }}
      />

      <AnswerCheckDialog
        open={checkOpen}
        answered={answered}
        total={total}
        changed={changedCount}
        fast={fastCount}
        issues={consistencyIssues}
        onBack={() => {
          setCheckOpen(false);
          if (!done) goTo(firstUnanswered);
        }}
        onConfirm={confirmResult}
      />

      {/* 重置确认 */}
      {confirmReset && (
          <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <button
              type="button"
              aria-label="取消"
              className="absolute inset-0 bg-navy/50"
              onClick={() => setConfirmReset(false)}
            />
            <div className="animate-pop-in card relative w-full max-w-sm p-5">
              <h2 id="reset-title" className="text-[17px] font-bold text-navy">
                清空所有答题记录？
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">
                会清空精简 60 题与完整 120 题两套模式的全部进度（当前模式已答 {answered} 题），这个操作不可撤销。
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmReset(false)} className="btn-ghost !py-2.5 !text-[14px]">
                  继续答题
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelAdvance();
                    reset();
                    setConfirmReset(false);
                    setEgg(null);
                  }}
                  className="btn !bg-error !py-2.5 !text-[14px] !text-white"
                >
                  清空重来
                </button>
              </div>
            </div>
          </div>
      )}

      <DisclaimerBar variant="sticky" />
    </div>
  );
}
