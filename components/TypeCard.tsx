import Link from "next/link";
import type { Type64 } from "@/data/types64";
import { GROUP_META } from "@/data/schema";
import { type RankedType, per1000Text } from "@/lib/rarity";
import RarityBadge from "@/components/RarityBadge";
import { cn, hexA } from "@/lib/utils";

/**
 * 型别卡（榜单页 / 相关推荐 / 搜索结果共用）
 *
 * compact=false 用于榜单主列表：显示中文名、关键词、稀有度与每千人比例
 * compact=true  用于「相近/互补」推荐位：只保留核心信息，避免把结果页撑长
 */
export default function TypeCard({
  type,
  rarity,
  compact = false,
  highlight = false,
  className,
}: {
  type: Type64;
  rarity?: RankedType;
  compact?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  const group = GROUP_META[type.group];

  return (
    <Link
      href={`/type/${type.code}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-300",
        compact ? "p-3.5" : "p-4 sm:p-5",
        highlight
          ? "border-violet/35 bg-white shadow-glow"
          : "border-white/70 bg-white/55 hover:-translate-y-0.5 hover:border-violet/25 hover:bg-white/85 hover:shadow-glass",
        className,
      )}
      style={{ background: highlight ? hexA("#7C5CFF", 0.06) : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="text-[13px]">
              {group.emoji}
            </span>
            <span className="font-mono text-[11.5px] font-bold tracking-[0.08em] text-ink-mute">{type.code}</span>
          </div>
          <h3
            className={cn(
              "mt-1 truncate font-bold tracking-tight text-ink",
              compact ? "text-[14.5px]" : "text-[16px] sm:text-[17px]",
            )}
          >
            {type.name}
          </h3>
        </div>
        {rarity && <RarityBadge tier={rarity.tier} size="sm" />}
      </div>

      {!compact && (
        <>
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft/90">{type.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {type.keywords.slice(0, 3).map((k) => (
              <span key={k} className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-medium text-ink-mute">
                {k}
              </span>
            ))}
          </div>
          {rarity && (
            <p className="mt-3 text-[11px] font-medium text-ink-mute">
              {per1000Text(rarity)} · {rarity.rankLabel === "" ? "" : `稀有度第 ${rarity.rankLabel} 位`}
            </p>
          )}
        </>
      )}

      {compact && <p className="mt-1.5 line-clamp-1 text-[11.5px] text-ink-mute">{type.tagline}</p>}
    </Link>
  );
}
