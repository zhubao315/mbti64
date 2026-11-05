import { withBasePath } from "@/lib/site";
import { cn } from "@/lib/utils";

type LogoVariant = "primary" | "icon" | "stacked";
type LogoTone = "color" | "light" | "dark" | "mono-black" | "mono-white";

const ASSETS: Record<LogoVariant, Record<LogoTone, string>> = {
  primary: {
    color: "/assets/brand/logo-primary.svg",
    light: "/assets/brand/logo-light.svg",
    dark: "/assets/brand/logo-dark.svg",
    "mono-black": "/assets/brand/logo-mono-black.svg",
    "mono-white": "/assets/brand/logo-mono-white.svg",
  },
  stacked: {
    color: "/assets/brand/logo-stacked.svg",
    light: "/assets/brand/logo-stacked-light.svg",
    dark: "/assets/brand/logo-stacked-dark.svg",
    "mono-black": "/assets/brand/logo-stacked-mono-black.svg",
    "mono-white": "/assets/brand/logo-stacked-mono-white.svg",
  },
  icon: {
    color: "/assets/brand/logo-icon.svg",
    light: "/assets/brand/logo-icon.svg",
    dark: "/assets/brand/logo-icon-navy.svg",
    "mono-black": "/assets/brand/logo-icon-black.svg",
    "mono-white": "/assets/brand/logo-icon-white.svg",
  },
};

// 画布宽高比：主标 924×240、堆叠 240×317、图标 240×240；图形在画布内占 200/240
const RATIO: Record<LogoVariant, number> = {
  primary: 924 / 240,
  stacked: 240 / 317,
  icon: 1,
};
const MARK_RATIO = 240 / 200;

/**
 * MBTI64 品牌标识。
 *
 * 直接引用 public/assets/brand 下的矢量源文件（与 favicon、社交图、应用图标同源），
 * 保证站内所有位置的品牌呈现完全一致。`size` = 图形（花瓣标记）的可视边长。
 */
export default function BrandLogo({
  variant = "primary",
  tone = "color",
  size = 32,
  className,
}: {
  variant?: LogoVariant;
  tone?: LogoTone;
  size?: number;
  className?: string;
}) {
  const box = size * MARK_RATIO;
  const isVert = variant === "stacked";
  const src = withBasePath(ASSETS[variant][tone]);

  return (
    <span role="img" aria-label="MBTI64" className={cn("inline-flex select-none", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        width={isVert ? box : box * RATIO[variant]}
        height={isVert ? box / RATIO[variant] : box}
        className="shrink-0"
        style={{ width: isVert ? box : box * RATIO[variant], height: isVert ? box / RATIO[variant] : box }}
      />
    </span>
  );
}
