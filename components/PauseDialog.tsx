"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export interface PauseDialogProps {
  open: boolean;
  mode: "quick" | "full";
  answered: number;
  total: number;
  onResume: () => void;
  onExit: () => void;
}

/** 暂停/退出说明：明确进度已保存在本机、如何恢复，降低中断焦虑。 */
export default function PauseDialog({ open, mode, answered, total, onResume, onExit }: PauseDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResume();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onResume]);

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
          aria-labelledby="pause-title"
        >
          <button type="button" aria-label="关闭" className="absolute inset-0 bg-navy/50" onClick={onResume} />
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="card relative w-full max-w-md p-5"
          >
            <h2 id="pause-title" className="text-[17px] font-bold text-navy">
              先暂停一下？
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              这次{ mode === "quick" ? "精简 60 题" : "完整 120 题" }的作答进度（{answered} / {total}）
              已经保存在你的浏览器本机。关掉页面、换设备前回来，都会从上次的位置继续。
            </p>
            <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-mute">
              <li>· 数据不上传，只在本机 localStorage（p64:v1）</li>
              <li>· 两种测评模式各自保存进度，互不影响</li>
              <li>· 如需清空，可在「重新开始」里确认</li>
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={onExit} className="btn-ghost !py-2.5 !text-[14px]">
                退出到首页
              </button>
              <button type="button" onClick={onResume} className="btn-primary !py-2.5 !text-[14px]">
                继续答题
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
