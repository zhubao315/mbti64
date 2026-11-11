"use client";

import { useEffect, useState } from "react";
import ChinaSliceCard from "@/components/ChinaSliceCard";
import MirrorMentorCard from "@/components/MirrorMentorCard";
import DeliberatePracticeCard from "@/components/DeliberatePracticeCard";
import { loadBookLite, type BookLite } from "@/lib/book-client";
import type { PracticeDirection } from "@/lib/practice-store";

/**
 * 结果页解锁区 · 书稿实战包
 *
 * 三块内容都来自《千分之一的你》对应基础型的图鉴章：
 *   - 中国式生存切片 + 亲密关系隐形契约（职场 / 饭局 / 微信三个现场）
 *   - 镜像导师的「借假修真」三步实验（L1=1200 的绝对互补型）
 *   - 刻意练习实验室（四组一阶微动作 + 7 天打卡器）
 *
 * 数据同样按基础型运行时取，不进首屏包；取不到时静默降级。
 */
export default function BookDeepSection({
  base,
  currentSuffix,
  recommended,
  recommendedReason,
}: {
  base: string;
  /** 当前亚型后缀，如 "A-O" */
  currentSuffix: string | null;
  /** 建议优先的微动作方向 */
  recommended?: PracticeDirection;
  /** 建议理由（一句话） */
  recommendedReason?: string;
}) {
  const [book, setBook] = useState<BookLite | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadBookLite(base).then((data) => {
      if (!alive) return;
      if (data) setBook(data);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [base]);

  if (failed) return null;

  if (!book) {
    return (
      <div
        className="mt-4 h-[220px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]"
        aria-hidden
      />
    );
  }

  return (
    <div>
      {recommended && recommendedReason ? (
        <p className="mb-3 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">给你的优先建议：</span>
          {recommendedReason}
        </p>
      ) : null}

      <ChinaSliceCard
        chinaSlices={book.chinaSlices}
        intimacyContract={book.intimacyContract}
        currentSuffix={currentSuffix}
      />
      <MirrorMentorCard mentor={book.mirrorMentor} base={book.base} currentSuffix={currentSuffix} />
      <DeliberatePracticeCard practice={book.deliberatePractice} recommended={recommended} />
    </div>
  );
}
