"use client";

import Link from "next/link";
import { computeResult, useHydrated, useQuizStore } from "@/lib/store";
import { PRIOR_TABLE, per1000Text, rankText } from "@/lib/rarity";
import RarityBadge from "@/components/RarityBadge";
import { useMemo } from "react";

/**
 * 榜单页的「我的位置」条
 * 未做完测评时显示引导，不隐藏入口（榜单页是主要的二跳落地页）。
 */
export default function MyRankBar() {
  const hydrated = useHydrated();
  const answers = useQuizStore((s) => s.answers);
  const mode = useQuizStore((s) => s.mode);

  const result = useMemo(() => computeResult({ answers, mode }), [answers, mode]);

  if (!hydrated) {
    return <div className="card mt-4 h-16 animate-pulse" />;
  }

  if (!result.complete) {
    return (
      <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[13px] text-ink-soft">
          你还没有完整结果 —— 答完才能在这张榜上找到自己的位置。
          {result.answeredCount > 0 && (
            <span className="text-ink-mute">（已答 {result.answeredCount} / {result.totalCount} 题）</span>
          )}
        </p>
        <Link href="/test" className="btn-primary !px-4 !py-2 !text-[13px]">
          去答题
        </Link>
      </div>
    );
  }

  const rarity = PRIOR_TABLE.byCode[result.code];

  return (
    <div className="card mt-4 flex flex-wrap items-center gap-3 p-4">
      <span className="text-[11.5px] font-bold tracking-wide text-ink-mute">我的位置</span>
      <span className="font-mono text-[12.5px] font-bold text-ink">{result.displayCode}</span>
      {rarity && <RarityBadge tier={rarity.tier} size="sm" />}
      {rarity && (
        <span className="min-w-0 flex-1 text-[12.5px] text-ink-soft">
          {rankText(rarity)} · {per1000Text(rarity)}
        </span>
      )}
      <Link href="/result" className="btn-ghost !px-4 !py-2 !text-[13px]">
        看我的结果
      </Link>
    </div>
  );
}
