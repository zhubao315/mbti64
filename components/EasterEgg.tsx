"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { EASTER_EGGS } from "@/data/questions";

/**
 * 每 10 题的小彩蛋（轻提示，不打断答题）
 *
 * 设计原则：
 *  - 不自带关闭按钮以外的交互，2.6s 自动消失
 *  - 只出现在「答完第 10/20/30… 题」的瞬间，且同一蛋只弹一次（seenEggs）
 *  - 文案只做情绪陪伴，不透露倾向，避免暗示用户「应该往哪边答」
 */
export default function EasterEgg({
  eggIndex,
  open,
  onClose,
}: {
  /** 0-based，对应 EASTER_EGGS 下标 */
  eggIndex: number;
  open: boolean;
  onClose: () => void;
}) {
  const text = EASTER_EGGS[eggIndex % EASTER_EGGS.length];

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [open, onClose, eggIndex]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={`egg-${eggIndex}`}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.22, 1.2, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="glass-strong pointer-events-auto flex max-w-md items-start gap-2.5 px-4 py-3">
            <span aria-hidden className="mt-0.5 text-[15px]">
              ✨
            </span>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">{text}</p>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 shrink-0 rounded-full px-1.5 text-[13px] leading-none text-ink-mute hover:text-ink"
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
