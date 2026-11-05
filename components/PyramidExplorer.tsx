"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * 交互式稀有度金字塔（首页专用）
 *
 * hover / 聚焦某一层 → 右侧浮出该档全部型别（可点入详情页）。
 * 单色墨色层级：越稀有越深；族群四色只出现在型别列表的色点上。
 */

export interface PyramidLayerData {
  key: string;
  name: string;
  note: string;
  count: number;
  share: number;
  types: Array<{ code: string; name: string; group: GroupKey }>;
}

export default function PyramidExplorer({
  layers,
  className,
}: {
  layers: PyramidLayerData[];
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const maxShare = Math.max(...layers.map((l) => l.share), 0.1);
  const layer = layers[active];

  return (
    <div className={cn("grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]", className)}>
      {/* 塔体 */}
      <div className="flex flex-col items-center gap-1.5" role="group" aria-label="稀有度金字塔：选择一档查看该层型别">
        {layers.map((l, i) => {
          const width = 46 + (l.share / maxShare) * 54;
          const alpha = [0.92, 0.78, 0.62, 0.3, 0.22, 0.16, 0.1][i] ?? 0.1;
          const isActive = i === active;
          const dark = i <= 2;
          return (
            <button
              key={l.key}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              className={cn(
                "flex h-10 items-center justify-between gap-2 rounded-[10px] px-3 transition-all duration-200 ease-product",
                isActive ? "shadow-lift" : "hover:shadow-card",
              )}
              style={{
                width: `${width}%`,
                background: `rgba(15, 39, 71, ${alpha})`,
                color: dark ? "#FFFFFF" : "#172B45",
                outline: isActive ? "2px solid #0F2747" : undefined,
                outlineOffset: 2,
              }}
            >
              <span className="truncate text-[12.5px] font-bold">{l.name}</span>
              <span className={cn("shrink-0 text-[10.5px] font-medium", dark ? "text-white" : "text-[#172B45]")}>
                {l.count} 型
              </span>
            </button>
          );
        })}
        <p className="mt-2 text-center text-[11px] text-ink-mute">越靠上越稀有 · 移到某一层查看该档型别</p>
      </div>

      {/* 该档型别浮出面板 */}
      <div key={layer.key} className="card animate-fade-in p-5" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[16px] font-bold tracking-tight text-navy">{layer.name}</h3>
          <span className="text-[11.5px] font-medium text-ink-mute">
            {layer.count} 型 · 合计约 {layer.share}%
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{layer.note}</p>

        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {layer.types.map((t) => (
            <li key={t.code}>
              <Link
                href={`/type/${t.code}`}
                className="group flex items-center gap-2 rounded-[8px] px-2 py-1.5 transition hover:bg-surface-hover"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: GROUP_META[t.group].color }}
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-soft group-hover:text-navy">
                  {t.name}
                </span>
                <span className="font-mono text-[10.5px] text-ink-mute">{t.code}</span>
                <CaretRight size={12} className="shrink-0 text-ink-mute opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
