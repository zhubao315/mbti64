"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { DIMS } from "@/data/schema";
import type { ConsistencyIssue } from "@/lib/answer-checks";

export interface AnswerCheckDialogProps {
  open: boolean;
  answered: number;
  total: number;
  /** 改过答案的题数 */
  changed: number;
  /** 作答时长偏短（< 1.5 秒）的题数 */
  fast: number;
  issues: ConsistencyIssue[];
  onBack: () => void;
  onConfirm: () => void;
}

/**
 * 提交前确认
 * - 完整性检查：未答完时只允许返回补齐
 * - 反向题一致性 / 作答时长 / 修改记录：只作提示，不改变计分
 */
export default function AnswerCheckDialog({
  open,
  answered,
  total,
  changed,
  fast,
  issues,
  onBack,
  onConfirm,
}: AnswerCheckDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onBack]);

  const missing = Math.max(0, total - answered);
  const complete = missing === 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-title"
        >
          <button type="button" aria-label="关闭" className="absolute inset-0 bg-navy/50" onClick={onBack} />
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="card relative max-h-[86vh] w-full max-w-md overflow-y-auto p-5"
          >
            <h2 id="check-title" className="text-[17px] font-bold text-navy">
              {complete ? "确认生成结果？" : "还有题目没答完"}
            </h2>

            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
              <p>
                已答 <strong className="text-navy">{answered}</strong> / {total} 题
                {complete ? "，完整性检查通过。" : `，还差 ${missing} 题。`}
              </p>

              {changed > 0 ? <p>· 你修改过 {changed} 道题的答案，最终结果以当前选择为准。</p> : null}

              {issues.length > 0 ? (
                <div className="rounded-[10px] border border-[#F0D9A8] bg-[#FFF8E8] p-3 text-[12.5px] text-[#7A5600]">
                  <p className="font-semibold">一致性提示（不会改变结果）</p>
                  <p className="mt-1">
                    {issues.map((i) => DIMS[i.dim].name).join("、")} 的正向题与反向题倾向不一致，建议回看相关题目。
                  </p>
                </div>
              ) : null}

              {fast > 0 ? (
                <p className="text-[12.5px] text-ink-mute">
                  · 有 {fast} 道题作答时间偏短（少于 1.5 秒）。速度不会影响评分，若不确定可以回看。
                </p>
              ) : null}

              <p className="text-[12px] text-ink-mute">以上提示只帮助你检查答案，不会改变任何计分规则。</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={onBack} className="btn-ghost !py-2.5 !text-[14px]">
                {complete ? "返回检查" : "去补齐"}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!complete}
                className="btn-primary !py-2.5 !text-[14px] disabled:cursor-not-allowed disabled:opacity-45"
              >
                确认生成
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
