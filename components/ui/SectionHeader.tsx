import type { ReactNode } from "react";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  id?: string;
  align?: "left" | "center";
  className?: string;
}

/** 章节标题：eyebrow + 标题 + 说明 + 右侧动作，统一全站章节节奏。 */
export default function SectionHeader({
  eyebrow,
  title,
  sub,
  action,
  id,
  align = "left",
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${align === "center" ? "text-center sm:text-left" : ""} ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={id} className="section-title mt-1">
          {title}
        </h2>
        {sub ? <p className="section-sub max-w-2xl">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
