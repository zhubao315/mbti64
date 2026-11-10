import Link from "next/link";
import type { ReactNode } from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary: "bg-navy text-white hover:bg-navy-deep hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
  ghost: "border border-[#CBD5E1] bg-white text-navy hover:border-navy hover:bg-surface-hover",
  tertiary: "bg-transparent text-navy hover:bg-navy-soft",
  danger: "border border-[#E4B4AF] bg-white text-error hover:bg-[#FDF2F1]",
} as const;

const SIZES = {
  sm: "min-h-[40px] px-3.5 py-2 text-[13px]",
  md: "min-h-[44px] px-5 py-2.5 text-[14px]",
  lg: "min-h-[48px] px-7 py-3.5 text-[16px]",
} as const;

export interface ButtonProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** 无障碍名称；提供时写入 aria-label */
  ariaLabel?: string;
  title?: string;
}

/** 全站统一按钮：实心主色 / 描边 / 文字 / 危险四种形态，默认 44px 触控高度。 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  onClick,
  type = "button",
  disabled = false,
  ariaLabel,
  title,
}: ButtonProps) {
  const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} prefetch={false} className={cls} aria-label={ariaLabel} title={title} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={title}>
      {children}
    </button>
  );
}
