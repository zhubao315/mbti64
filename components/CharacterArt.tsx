import type { GroupKey } from "@/data/schema";
import { GROUP_META } from "@/data/schema";
import { cn, hexA } from "@/lib/utils";

/**
 * 扁平 2D 角色插画（纯 SVG，无图片资源）
 *
 * 为什么不自绘「真人头像」：结果页需要一个可无限复用的形象，
 * 用几何扁平插画 + 族群道具，既能保持水彩风格的干净感，
 * 也避免引入位图（首屏体积 / 深色模式 / 海报导出都会更简单）。
 *
 * 参数化：
 *  - group  决定主色与道具（分析师=几何图形 / 冒险家=火花 / 外交家=叶 / 守护者=盾）
 *  - ac     A 睁眼直视；C 眼神微垂（审慎）
 *  - oh     O 漂浮星点；H 稳定轨道环
 */

const GROUP_ACCENT: Record<GroupKey, { prop: "shape" | "spark" | "leaf" | "shield" }> = {
  analyst: { prop: "shape" },
  adventurer: { prop: "spark" },
  diplomat: { prop: "leaf" },
  guardian: { prop: "shield" },
};

export default function CharacterArt({
  group,
  ac = "A",
  oh = "O",
  size = 240,
  className,
  breathing = true,
}: {
  group: GroupKey;
  ac?: "A" | "C";
  oh?: "O" | "H";
  size?: number;
  className?: string;
  breathing?: boolean;
}) {
  const meta = GROUP_META[group];
  const color = meta.color;
  const soft = meta.soft;
  const prop = GROUP_ACCENT[group].prop;
  const introspective = ac === "C";

  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={cn(breathing && "animate-breathe", className)}
      role="img"
      aria-label={`${meta.cn}族群扁平插画`}
    >
      <defs>
        <linearGradient id={`bg-${group}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={soft} />
          <stop offset="100%" stopColor={hexA(color, 0.22)} />
        </linearGradient>
        <linearGradient id={`hair-${group}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={hexA(color, 0.72)} />
        </linearGradient>
        <radialGradient id={`halo-${group}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={hexA("#FFFFFF", 0.9)} />
          <stop offset="100%" stopColor={hexA("#FFFFFF", 0)} />
        </radialGradient>
      </defs>

      {/* 底板光斑 */}
      <circle cx="120" cy="120" r="112" fill={`url(#bg-${group})`} />
      <circle cx="120" cy="120" r="112" fill={`url(#halo-${group})`} opacity="0.7" />

      {/* 虚线轨道：H=稳定闭合，O=开口朝上（留出「还没画完」的感觉） */}
      {oh === "H" ? (
        <circle cx="120" cy="120" r="100" fill="none" stroke={hexA(color, 0.3)} strokeWidth="1.5" strokeDasharray="4 6" />
      ) : (
        <path
          d="M 32 140 A 96 96 0 1 1 208 118"
          fill="none"
          stroke={hexA(color, 0.32)}
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
      )}

      {/* 身体 */}
      <path
        d="M 78 186 C 78 158 96 146 120 146 C 144 146 162 158 162 186 Z"
        fill={hexA(color, 0.9)}
      />
      <path d="M 78 186 C 78 158 96 146 120 146 C 144 146 162 158 162 186 Z" fill={`url(#hair-${group})`} opacity="0.25" />

      {/* 领口 */}
      <path d="M 108 148 L 120 162 L 132 148" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />

      {/* 头 */}
      <circle cx="120" cy="104" r="42" fill="#FFF7F2" />
      <circle cx="120" cy="104" r="42" fill={hexA(color, 0.06)} />

      {/* 头发 / 兜帽 */}
      <path
        d="M 78 104 C 78 74 96 60 120 60 C 144 60 162 74 162 104 C 162 104 150 92 140 88 C 128 96 108 96 96 90 C 88 94 80 100 78 104 Z"
        fill={`url(#hair-${group})`}
      />

      {/* 眼睛：A 直视圆点 / C 微垂短弧 */}
      {introspective ? (
        <>
          <path d="M 103 108 Q 108 105 113 108" fill="none" stroke="#2B2540" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 127 108 Q 132 105 137 108" fill="none" stroke="#2B2540" strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="108" cy="107" r="3.6" fill="#2B2540" />
          <circle cx="132" cy="107" r="3.6" fill="#2B2540" />
          <circle cx="109.4" cy="105.6" r="1.1" fill="#FFFFFF" />
          <circle cx="133.4" cy="105.6" r="1.1" fill="#FFFFFF" />
        </>
      )}

      {/* 腮红 */}
      <ellipse cx="97" cy="118" rx="6" ry="3.6" fill={hexA("#FF8A8A", 0.45)} />
      <ellipse cx="143" cy="118" rx="6" ry="3.6" fill={hexA("#FF8A8A", 0.45)} />

      {/* 嘴：轻微上扬，避免过度夸张 */}
      <path d="M 114 121 Q 120 125.5 126 121" fill="none" stroke="#2B2540" strokeWidth="2.4" strokeLinecap="round" />

      {/* 族群道具 */}
      <g opacity="0.95">
        {prop === "shape" && (
          <>
            <rect x="158" y="60" width="26" height="26" rx="7" fill={hexA(color, 0.28)} stroke={color} strokeWidth="2" transform="rotate(14 171 73)" />
            <circle cx="188" cy="96" r="6" fill={color} opacity="0.6" />
          </>
        )}
        {prop === "spark" && (
          <>
            <path d="M 174 52 L 177 62 L 187 65 L 177 68 L 174 78 L 171 68 L 161 65 L 171 62 Z" fill={color} opacity="0.85" />
            <circle cx="192" cy="88" r="4.5" fill={color} opacity="0.45" />
          </>
        )}
        {prop === "leaf" && (
          <>
            <path d="M 172 66 C 190 58 202 68 198 86 C 182 88 172 80 172 66 Z" fill={hexA("#7FD1AE", 0.75)} stroke="#3F9C7A" strokeWidth="1.6" />
            <path d="M 174 84 L 190 70" stroke="#3F9C7A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </>
        )}
        {prop === "shield" && (
          <>
            <path d="M 174 58 L 196 64 V 80 C 196 92 186 99 178 102 C 170 99 160 92 160 80 V 64 Z" fill={hexA(color, 0.22)} stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <path d="M 170 80 L 176 86 L 187 72" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </g>

      {/* 变化策略的浮动标记 */}
      {oh === "O" ? (
        <g fill={hexA(color, 0.55)}>
          <circle cx="44" cy="92" r="3" />
          <circle cx="56" cy="72" r="2" />
          <circle cx="40" cy="118" r="2.2" />
        </g>
      ) : (
        <g stroke={hexA(color, 0.45)} strokeWidth="1.6" fill="none">
          <path d="M 34 150 A 12 12 0 1 0 46 162" strokeLinecap="round" />
          <circle cx="46" cy="162" r="2" fill={hexA(color, 0.6)} stroke="none" />
        </g>
      )}
    </svg>
  );
}
