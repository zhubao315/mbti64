import { RARITY_TIERS, type RarityTable, type RankedType, rarityPyramid } from "@/lib/rarity";
import { cn, hexA } from "@/lib/utils";
import { per1000Text } from "@/lib/rarity";

/**
 * 稀有度金字塔
 *
 * 顶部最窄 = 最稀有，底部最宽 = 最常见。
 * 每层用宽度百分比表示「该档型别数量占 64 的比例」，视觉上自然成塔。
 * 当前型别所在层高亮 + 标记「你在这里」。
 */
export default function RarityPyramid({
  table,
  current,
  className,
  compact = false,
}: {
  table: RarityTable;
  current?: RankedType;
  className?: string;
  compact?: boolean;
}) {
  const layers = rarityPyramid(table);
  const maxCount = Math.max(...layers.map((l) => l.count), 1);
  // 宽度按「该档人口占比」而不是型别数量：这样即使某档因为并列只有 2 型，
  // 金字塔也不会出现中间突然收窄的畸形。
  const maxShare = Math.max(...layers.map((l) => l.share), 0.1);

  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-1.5" : "gap-2.5", className)}>
      {layers.map((layer, i) => {
        const isMine = current?.tier.key === layer.tier.key;
        const width = 42 + (layer.share / maxShare) * 58;
        const countRatio = layer.count / maxCount;
        return (
          <div key={layer.tier.key} className="relative flex w-full justify-center">
            <div
              className={cn(
                "relative flex items-center justify-between overflow-hidden rounded-xl px-3 transition-all duration-500",
                compact ? "h-9" : "h-12 sm:h-14",
              )}
              style={{
                width: `${width}%`,
                background: `linear-gradient(100deg, ${hexA(layer.tier.color, isMine ? 0.34 : 0.18 - i * 0.01)}, ${hexA(
                  layer.tier.color,
                  isMine ? 0.18 : 0.08,
                )})`,
                border: `1px solid ${hexA(layer.tier.color, isMine ? 0.6 : 0.22)}`,
                boxShadow: isMine
                  ? `0 0 0 3px ${hexA(layer.tier.color, 0.22)}, 0 10px 26px -12px ${hexA(layer.tier.color, 0.75)}`
                  : undefined,
              }}
              title={`${layer.tier.name}：${layer.count} 型，合计约 ${layer.share}%`}
            >
              <span
                className={cn("truncate font-bold", compact ? "text-[11.5px]" : "text-[12.5px] sm:text-[14px]")}
                style={{ color: layer.tier.color }}
              >
                {layer.tier.name}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] font-medium text-ink-mute sm:text-[11px]">
                  {layer.count} 型 · {layer.share}%
                </span>
                <span
                  aria-hidden
                  className="hidden h-1.5 rounded-full sm:block"
                  style={{
                    width: `${Math.max(6, countRatio * 34)}px`,
                    background: hexA(layer.tier.color, 0.55),
                  }}
                />
              </span>

              {isMine && (
                <span
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 translate-x-full rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow sm:text-[11px]"
                  style={{ background: layer.tier.color }}
                >
                  你
                </span>
              )}
            </div>
          </div>
        );
      })}

      {!compact && current && (
        <p className="mt-1 text-center text-[12px] text-ink-mute">
          你在<strong style={{ color: current.tier.color }}>「{current.tier.name}」</strong>这一层，
          {per1000Text(current)}
        </p>
      )}
    </div>
  );
}

/** 图例：7 档横向排列（用于榜单页顶部） */
export function RarityLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-1.5", className)}>
      {RARITY_TIERS.map((t) => (
        <span key={t.key} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-soft">
          <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
          {t.name}
        </span>
      ))}
    </div>
  );
}
