import type { ReactNode } from "react";

const TONES = {
  card: "rounded-card border border-line bg-white shadow-card",
  panel: "rounded-panel border border-line bg-white shadow-card",
  flat: "rounded-card border border-line bg-wash",
  quiet: "rounded-card border border-transparent bg-white",
} as const;

export interface CardProps {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
  /** 是否启用悬停上浮（列表卡默认关闭，可点击卡开启） */
  hover?: boolean;
  as?: "div" | "section" | "article" | "li";
}

/** 全站统一卡片容器；圆角、描边、阴影只允许来自设计令牌。 */
export default function Card({ children, tone = "card", className = "", hover = false, as = "div" }: CardProps) {
  const Tag = as;
  return <Tag className={`${TONES[tone]} ${hover ? "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lift" : ""} ${className}`}>{children}</Tag>;
}
