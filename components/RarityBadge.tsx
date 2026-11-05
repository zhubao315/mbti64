import type { RarityTier } from "@/lib/rarity";
import { cn } from "@/lib/utils";

/**
 * 稀有度徽标：7 档统一中性样式
 *
 * 稀有度是独立的中性刻度（navy → slate），不占用族群四色；
 * 越稀有，色点越深；档位名承担语义。
 */
export default function RarityBadge({
  tier,
  size = "md",
  className,
}: {
  tier: RarityTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const pad =
    size === "sm" ? "px-2.5 py-1 text-[11.5px]" : size === "lg" ? "px-5 py-2.5 text-[15px]" : "px-3.5 py-1.5 text-[13px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white font-semibold",
        pad,
        className,
      )}
      style={{ color: tier.text }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tier.color }} />
      <span>{tier.name}</span>
    </span>
  );
}
