"use client";

import Link from "next/link";
import { answeredTotal, totalOf, useHydrated, useQuizStore } from "@/lib/store";

/**
 * 首页「继续答题」提示
 *
 * 断点续答是这个产品的基础能力，但如果首页不提示，回来的用户会以为要重头再来。
 * 只在「答了一部分且没答完」时出现，避免干扰新用户。
 */
export default function ResumeBanner() {
  const hydrated = useHydrated();
  const answers = useQuizStore((s) => s.answers);
  const mode = useQuizStore((s) => s.mode);

  if (!hydrated) return null;

  const answered = answeredTotal({ answers, mode });
  const total = totalOf(mode);
  if (answered === 0 || answered >= total) return null;

  const pct = Math.round((answered / total) * 100);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-violet/20 bg-violet/10 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/80 text-[14px]" aria-hidden>
        ⏱
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-ink">
          上次答到第 {answered} / {total} 题（{pct}%）
        </p>
        <p className="mt-0.5 text-[11.5px] text-ink-mute">进度存在这台设备的浏览器里，不会上传。</p>
      </div>
      <Link href="/test" className="btn-primary shrink-0 !px-4 !py-2 !text-[13px]">
        继续答题
      </Link>
    </div>
  );
}
