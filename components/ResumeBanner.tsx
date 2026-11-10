"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Timer } from "@phosphor-icons/react";
import { STORAGE_KEY } from "@/lib/store-key";

/**
 * 首页「继续答题」提示
 *
 * 断点续答是这个产品的基础能力，但如果首页不提示，回来的用户会以为要重头再来。
 * 只在「答了一部分且没答完」时出现，避免干扰新用户。
 *
 * 这里直接读 localStorage，而不是引入 zustand store：
 * store 会连带把题库和计分逻辑打进首页 JS，拖慢首屏。
 */
export default function ResumeBanner() {
  const [progress, setProgress] = useState<{ answered: number; total: number } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        state?: {
          // v2：按模式分桶；v1 遗留为扁平对象，迁移后也会变成分桶
          answers?: Record<string, Record<string, number>> | Record<string, number>;
          mode?: string;
        };
      };
      const mode = (parsed?.state?.mode === "quick" ? "quick" : "full") as "quick" | "full";
      const answers = parsed?.state?.answers ?? {};
      const modeAnswers =
        answers && typeof (answers as Record<string, unknown>)[mode] === "object"
          ? ((answers as Record<string, Record<string, number>>)[mode] ?? {})
          : (answers as Record<string, number>);
      const total = mode === "quick" ? 60 : 120;
      // 只统计有效数字答案，避免旧版缓存里的字符串/脏数据把进度算错
      const answered = Object.values(modeAnswers).filter((v) => typeof v === "number").length;
      if (answered > 0 && answered < total) setProgress({ answered, total });
    } catch {
      /* 本地数据损坏时静默忽略 */
    }
  }, []);

  if (!progress) return null;

  const pct = Math.round((progress.answered / progress.total) * 100);

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-wash text-ink-soft" aria-hidden>
        <Timer size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-ink">
          上次已答 {progress.answered} / {progress.total} 题（{pct}%）
        </p>
        <p className="mt-0.5 text-[11.5px] text-ink-mute">进度存在这台设备的浏览器里，不会上传。</p>
      </div>
      <Link href="/test" className="btn-primary shrink-0 !px-4 !py-2 !text-[13px]">
        继续答题
      </Link>
    </div>
  );
}
