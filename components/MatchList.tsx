"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Compass, Leaf, ShieldCheck } from "@phosphor-icons/react";
import type { MatchItem } from "@/lib/match";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * 相近 / 互补型别列表
 *
 * 两组数据来自 lib/match.ts 的 L1 距离：相似取最小距离，互补取最大距离。
 * 展示「相似度」而不是「距离」，因为用户更容易理解百分比。
 * 族群信息用图标 + 中文名同时表达，不只依赖颜色。
 */
const GROUP_ICONS = { analyst: Brain, diplomat: Leaf, guardian: ShieldCheck, adventurer: Compass } as const;

export default function MatchList({
  items,
  kind,
  className,
}: {
  items: MatchItem[];
  kind: "similar" | "complement";
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((m, i) => {
        const group = GROUP_META[m.type.group];
        const Icon = GROUP_ICONS[m.type.group as GroupKey];
        return (
          <motion.li
            key={m.type.code}
            initial={{ opacity: 0, x: kind === "similar" ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.32, ease: [0.22, 1.2, 0.36, 1] }}
          >
            <Link
              href={`/type/${m.type.code}`}
              className="group flex items-center gap-3 rounded-card border border-line bg-white px-3.5 py-3 transition-all hover:border-[#CBD5E1] hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]"
                style={{ background: group.soft, color: group.text }}
              >
                <Icon size={18} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-[14px] font-bold text-ink">{m.type.name}</span>
                  <span className="shrink-0 font-mono text-[10.5px] font-semibold text-ink-mute">{m.type.code}</span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: group.soft, color: group.text }}
                  >
                    {group.cn}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">{m.reason}</span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-black tabular-nums text-navy">
                  {kind === "similar" ? m.similarity : 100 - m.similarity}
                  <span className="text-[10px] font-bold">%</span>
                </span>
                <span className="block text-[10px] font-medium text-ink-mute">
                  {kind === "similar" ? "相似" : "差异"}
                </span>
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
