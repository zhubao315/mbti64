import type { ReactNode } from "react";

export type GroupKey = "analyst" | "diplomat" | "guardian" | "adventurer";

const TONES: Record<string, string> = {
  analyst: "bg-analyst-soft text-analyst-text",
  diplomat: "bg-diplomat-soft text-diplomat-text",
  guardian: "bg-guardian-soft text-guardian-text",
  adventurer: "bg-adventurer-soft text-adventurer-text",
  neutral: "bg-wash text-ink-soft",
  navy: "bg-navy-soft text-navy",
  success: "bg-[#E7F5EC] text-success",
  warning: "bg-[#FFF4D6] text-warning",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: GroupKey | "neutral" | "navy" | "success" | "warning";
  className?: string;
}

/** 语义标签：族群色只用于分类识别，文字使用加深版保证 4.5:1 对比度。 */
export default function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
