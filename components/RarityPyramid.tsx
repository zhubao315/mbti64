import { type RarityTable, type RankedType, rarityPyramid } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { per1000Text } from "@/lib/rarity";

/** 把档位色按透明度叠到白底上，保证中下层的文字对比度 */
function tint(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 稀有度金字塔（静态版：结果页 / 首页结果预览用）
 *
 * 顶部最窄 = 最稀有，底部最宽 = 最常见。
 * 单色墨色层级：越稀有越深；族群四色留给型别本身，稀有度不占语义色。
 * 首页另有一个可交互版本：components/PyramidExplorer.tsx
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
        const dark = i <= 2;
        return (
          <div key={layer.tier.key} className="relative flex w-full justify-center">
            <div
              className={cn(
                "relative flex items-center justify-between overflow-hidden rounded-[10px] px-3 transition-all duration-200",
                compact ? "h-9" : "h-12 sm:h-14",
              )}
              style={{
                width: `${width}%`,
                background: dark ? layer.tier.color : tint(layer.tier.color, 0.22),
                color: dark ? "#FFFFFF" : "#172B45",
                outline: isMine ? "2px solid #0F2747" : undefined,
                outlineOffset: 2,
              }}
              title={`${layer.tier.name}：${layer.count} 型，合计约 ${layer.share}%`}
            >
              <span className={cn("truncate font-bold", compact ? "text-[11.5px]" : "text-[12.5px] sm:text-[14px]")}>
                {layer.tier.name}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span className={cn("text-[10px] font-medium sm:text-[11px]", dark ? "text-white" : "text-[#334155]")}>
                  {layer.count} 型 · {layer.share}%
                </span>
                <span
                  aria-hidden
                  className={cn("hidden h-1.5 rounded-full sm:block", dark ? "bg-white/50" : "bg-navy/20")}
                  style={{ width: `${Math.max(6, countRatio * 34)}px` }}
                />
              </span>

              {isMine && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 translate-x-full rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white sm:text-[11px]">
                  你
                </span>
              )}
            </div>
          </div>
        );
      })}

      {!compact && current && (
        <p className="mt-1 text-center text-[12px] text-ink-mute">
          你在<strong className="text-navy">「{current.tier.name}」</strong>这一层，{per1000Text(current)}
        </p>
      )}
    </div>
  );
}
