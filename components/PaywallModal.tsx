"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

/**
 * 付费墙（Demo 版）
 *
 * 真实产品里这里会有：价格锚点、支付渠道、订单号回传、服务端解锁校验。
 * Demo 版只做「转化流程的可视化」：
 *  - 明确写清「Demo 不收款」
 *  - 点击解锁仅在本地把 unlocked 置 true（localStorage），不做任何网络请求
 * 这样既能看到完整链路，也不会让用户误以为被扣费。
 */
export default function PaywallModal({
  open,
  onClose,
  onUnlock,
  lockedCount,
  priceLabel = "¥ 9.9",
}: {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  lockedCount: number;
  priceLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1.2, 0.36, 1] }}
            className="glass-strong relative w-full max-w-md overflow-hidden p-5 sm:p-7"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet/25 blur-3xl"
            />

            <div className="relative">
              <p className="text-[11px] font-bold tracking-[0.18em] text-violet-deep">完整报告 · DEMO</p>
              <h2 id="paywall-title" className="mt-1.5 text-[21px] font-bold tracking-tight text-ink">
                还有 {lockedCount} 个板块未解锁
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">
                基础结果永久免费。完整报告包含：六维逐项解读、盲区清单、成长路径、关系与协作建议、可下载高清海报。
              </p>

              <ul className="mt-4 space-y-2">
                {[
                  "六维逐项解读 + 强度分档说明",
                  "盲区清单与 30 天成长路径",
                  "恋爱 / 职场 / 副业 深度建议",
                  "9:16 高清分享海报（无水印）",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <span aria-hidden className="mt-0.5 text-[12px] text-avocado-deep">
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-end gap-2">
                <span className="num-hero text-[30px] font-black text-ink">{priceLabel}</span>
                <span className="pb-1.5 text-[11.5px] text-ink-mute line-through">¥ 29.9</span>
                <span className="mb-1.5 rounded-full bg-coral/15 px-2 py-0.5 text-[10.5px] font-bold text-coral-deep">
                  首发价
                </span>
              </div>

              <button type="button" onClick={onUnlock} className="btn-primary mt-4 w-full">
                解锁完整报告
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-2.5 w-full rounded-full py-2 text-[13px] font-medium text-ink-mute transition hover:text-ink"
              >
                先看免费部分
              </button>

              <p className="mt-3 text-center text-[10.5px] leading-relaxed text-ink-mute">
                ⚠️ Demo 演示：本按钮不会发起支付、不会产生任何费用，仅在本地标记为已解锁。
                <br />
                结果仅用于娱乐与自我探索，不构成心理咨询或诊断。
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
