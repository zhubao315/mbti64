import { DIMS, DIM_ORDER, type DimKey, type DimScore } from "@/data/schema";
import { hexA } from "@/lib/utils";

/**
 * 六维雷达图（纯 SVG，无依赖）
 *
 * 为什么不用 recharts：六维雷达 + 结果页需要「呼吸光效 + 自绘标签 + 海报复用」，
 * 自己画能控制每一层透明度与描边，而且零 JS 运行时开销（首屏更快）。
 *
 * 数据语义：每维用 preferred（主导侧百分比 50–100）映射到半径，
 * 因此图形面积代表「倾向的清晰度」，而不是「强弱好坏」。
 *
 * 品牌 CI：默认使用深海军蓝单色；不使用光晕、渐变与族群四色叠加，
 * 避免同一张图里出现多种语义色造成误读。
 */

export interface RadarChartProps {
  dims: Record<DimKey, DimScore>;
  size?: number;
  /** 数据主色，默认品牌深海军蓝 */
  color?: string;
  /** 标签文字色 */
  labelColor?: string;
  /** 是否显示维度文字标签 */
  showLabels?: boolean;
  /** 是否显示外圈网格数字（20/40/60/80） */
  showScale?: boolean;
  /** 是否播放描线生长动画；首页预览等非结果场景关闭，避免加载期逐帧重绘抢占主线程 */
  animated?: boolean;
  className?: string;
}

const RINGS = [0.25, 0.5, 0.75, 1];

export default function RadarChart({
  dims,
  size = 320,
  color = "#0F2747",
  labelColor = "#172B45",
  showLabels = true,
  showScale = false,
  animated = true,
  className,
}: RadarChartProps) {
  const pad = showLabels ? 54 : 18;
  const box = size;
  const cx = box / 2;
  const cy = box / 2;
  const radius = box / 2 - pad;
  const n = DIM_ORDER.length;

  const angleOf = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / n;
  const pointAt = (i: number, ratio: number) => {
    const a = angleOf(i);
    return [cx + Math.cos(a) * radius * ratio, cy + Math.sin(a) * radius * ratio] as const;
  };

  // clamp：最小 0.18 让「中立」也有一块可见面积，避免图形塌缩成点
  const ratioOf = (k: DimKey) => Math.max(0.18, Math.min(1, dims[k].preferred / 100));

  const polygon = DIM_ORDER.map((k, i) => pointAt(i, ratioOf(k)).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width="100%"
      height="100%"
      className={className}
      role="img"
      aria-label={`六维倾向雷达图：${DIM_ORDER.map((k) => `${DIMS[k].name} ${dims[k].pole} ${dims[k].preferred}%`).join("，")}`}
    >
      {/* 网格环 */}
      {RINGS.map((r) => {
        const pts = DIM_ORDER.map((_, i) => pointAt(i, r).join(",")).join(" ");
        return (
          <polygon
            key={r}
            points={pts}
            fill={r === 1 ? "rgba(255,255,255,0.5)" : "none"}
            stroke={r === 1 ? "#CBD5E1" : "#E8E8E8"}
            strokeWidth={r === 1 ? 1.5 : 1}
            strokeDasharray={r === 1 ? undefined : "3 4"}
          />
        );
      })}

      {/* 轴线 */}
      {DIM_ORDER.map((k, i) => {
        const [x, y] = pointAt(i, 1);
        return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="#E8E8E8" strokeWidth={1} />;
      })}

      {/* 数据面：描线生长 800ms（pathLength 归一化后用 dashoffset 驱动） */}
      <polygon
        points={polygon}
        fill={hexA(color, 0.12)}
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        pathLength={animated ? 1 : undefined}
        strokeDasharray={animated ? 1 : undefined}
        className={animated ? "animate-radar-draw" : undefined}
      />

      {/* 顶点 */}
      {DIM_ORDER.map((k, i) => {
        const [x, y] = pointAt(i, ratioOf(k));
        return <circle key={k} cx={x} cy={y} r={4} fill="#fff" stroke={color} strokeWidth={2.5} />;
      })}

      {/* 刻度数字 */}
      {showScale &&
        RINGS.slice(0, 3).map((r) => (
          <text
            key={`s-${r}`}
            x={cx + 4}
            y={cy - radius * r + 2}
            fontSize={9}
            fill="#94A3B8"
          >
            {Math.round(50 + 50 * r)}
          </text>
        ))}

      {/* 维度标签 */}
      {showLabels &&
        DIM_ORDER.map((k, i) => {
          const [x, y] = pointAt(i, 1.16);
          const a = angleOf(i);
          const anchor = Math.abs(Math.cos(a)) < 0.25 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
          const d = dims[k];
          return (
            <g key={k}>
              <text
                x={x}
                y={y - 4}
                textAnchor={anchor}
                fontSize={11.5}
                fontWeight={600}
                fill="#64748B"
              >
                {DIMS[k].name.replace(/（后缀.*）/, "")}
              </text>
              <text x={x} y={y + 11} textAnchor={anchor} fontSize={11} fontWeight={700} fill={labelColor}>
                {d.pole} {d.preferred}%
              </text>
            </g>
          );
        })}
    </svg>
  );
}
