import { GROUP_META } from "@/data/schema";
import type { Type64 } from "@/data/types64";

/**
 * 中文经典引语：系统衬线引用体 + 族群色左侧细线
 */
export default function TypeQuote({ type }: { type: Type64 }) {
  const group = GROUP_META[type.group];
  return (
    <figure
      className="relative rounded-card border border-line bg-wash px-5 py-5 sm:px-7 sm:py-6"
      style={{ borderLeftWidth: 4, borderLeftColor: group.color }}
    >
      <blockquote className="font-quote text-[17px] leading-[1.9] text-navy sm:text-[19px]">
        「{type.quote.text}」
      </blockquote>
      <figcaption className="mt-2 text-[12px] font-medium text-ink-mute">
        — {type.quote.source}
      </figcaption>
    </figure>
  );
}
