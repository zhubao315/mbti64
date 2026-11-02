import { cn } from "@/lib/utils";

export const DISCLAIMER_SHORT = "娱乐与自我探索目的，不构成心理咨询/诊断服务";

export const DISCLAIMER_FULL =
  "本测评仅用于娱乐与自我探索，不构成心理咨询、诊断或医疗建议。人格是流动的，结果不代表对你的定义。完整报告为付费解锁的 Demo 功能。";

/**
 * 免责声明条
 * 三个位置必现：首页首屏、测试页常驻、结果页顶部与海报底部。
 * variant="inline" 为页内说明；variant="sticky" 为测试页底部常驻细条。
 */
export default function DisclaimerBar({
  variant = "inline",
  className,
  text,
}: {
  variant?: "inline" | "sticky" | "compact";
  className?: string;
  text?: string;
}) {
  if (variant === "compact") {
    return (
      <p className={cn("text-center text-[11px] leading-relaxed text-ink-mute", className)}>
        ⚠️ {text ?? DISCLAIMER_SHORT}
      </p>
    );
  }

  if (variant === "sticky") {
    return (
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/70 px-4 py-1.5 backdrop-blur-lg",
          className,
        )}
      >
        <p className="mx-auto max-w-3xl text-center text-[10.5px] leading-relaxed text-ink-mute">
          ⚠️ {text ?? DISCLAIMER_SHORT}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900/80",
        className,
      )}
      role="note"
    >
      <span aria-hidden className="mt-px text-[13px]">
        ⚠️
      </span>
      <p>{text ?? DISCLAIMER_FULL}</p>
    </div>
  );
}
