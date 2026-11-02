import type { RarityTier } from "@/lib/rarity";
import { cn, hexA } from "@/lib/utils";

/**
 * 稀有度徽标：7 档统一视觉（金字塔顶的越窄越亮）
 * size: sm 用于列表，md 用于卡片，lg 用于结果页主视觉
 */
export default function RarityBadge({
  tier,
  size = "md",
  className,
  showEmoji = true,
}: {
  tier: RarityTier;
  size?: "sm" | "md" | "lg";
  className?: string;
  showEmoji?: boolean;
}) {
  const pad =
    size === "sm" ? "px-2.5 py-1 text-[11.5px]" : size === "lg" ? "px-5 py-2.5 text-[15px]" : "px-3.5 py-1.5 text-[13px]";
  const emoji = tier.badge.split(" ")[0];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full font-bold", pad, className)}
      style={{
        color: tier.text,
        background: hexA(tier.color, 0.12),
        border: `1px solid ${hexA(tier.color, 0.28)}`,
      }}
    >
      {showEmoji && <span aria-hidden>{emoji}</span>}
      <span>{tier.name}</span>
    </span>
  );
}
