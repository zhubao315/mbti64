import Link from "next/link";
import { Brain, Compass, Leaf, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Type64 } from "@/data/types64";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { type RankedType, per1000Text } from "@/lib/rarity";
import RarityBadge from "@/components/RarityBadge";
import { withBasePath } from "@/lib/site";
import { cn } from "@/lib/utils";

const GROUP_ICONS = { analyst: Brain, diplomat: Leaf, guardian: ShieldCheck, adventurer: Compass } as const;

/**
 * 型别卡（榜单页 / 相关推荐 / 首页共用）
 *
 * 白底 + 1px 品牌边 + 12px 圆角，悬停上浮 2px。
 * 族群用「色点 + 中文名 + 线性图标」三重表达，不只依赖颜色；
 * 稀有度使用独立中性标签，不与族群色混用。
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
  const Icon = GROUP_ICONS[type.group as GroupKey];

  return (
    <Link
      href={`/type/${type.code}`}
      className={cn(
        "card card-hover group relative flex flex-col",
        compact ? "p-3.5" : "p-4 sm:p-5",
        highlight && "ring-2 ring-navy",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "relative shrink-0 overflow-hidden rounded-[8px] border border-line",
            compact ? "h-11 w-11" : "h-12 w-12",
          )}
          style={{ background: group.soft }}
        >
          <img
            src={withBasePath(`/assets/portraits-light/thumb-512/${type.code}-thumb-512.webp`)}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="portrait-blob"
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold"
              style={{ background: group.soft, color: group.text }}
            >
              <Icon size={11} aria-hidden />
              {group.cn}
            </span>
            <span className="font-mono text-[11.5px] font-bold tracking-[0.06em] text-navy">{type.code}</span>
            {rarity && <RarityBadge tier={rarity.tier} size="sm" />}
          </div>
          <h3
            className={cn(
              "mt-1.5 truncate font-bold tracking-tight text-navy",
              compact ? "text-[14.5px]" : "text-[16px] sm:text-[17px]",
            )}
          >
            {type.name}
          </h3>
        </div>
      </div>

      {!compact && (
        <>
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">{type.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {type.keywords.slice(0, 3).map((k) => (
              <span key={k} className="rounded-full bg-wash px-2 py-0.5 text-[10.5px] font-medium text-ink-mute">
                {k}
              </span>
            ))}
          </div>
          {rarity && (
            <p className="mt-3 text-[11px] font-medium text-ink-mute">
              {per1000Text(rarity)}
              {rarity.rankLabel === "" ? "" : ` · 稀有度第 ${rarity.rankLabel} 位`}
            </p>
          )}
        </>
      )}

      {compact && <p className="mt-1.5 line-clamp-1 text-[11.5px] text-ink-mute">{type.tagline}</p>}
    </Link>
  );
}
