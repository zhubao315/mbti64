"use client";

import { useEffect, useState } from "react";
import LifecycleCompass from "@/components/LifecycleCompass";
import NeuroStackCard from "@/components/NeuroStackCard";
import { loadBookLite, type BookLite } from "@/lib/book-client";

/**
 * 结果页免费区 · 书稿深度内容（四态罗盘 + 认知底盘）
 *
 * 【为什么单独一个组件】
 * 结果页首屏预算紧张，整份 bookEnriched.json（475KB）绝对不能进首屏包。
 * 这里用 lib/book-client 在运行时按基础型取那一份（约 8KB），
 * 取不到就静默降级为「不展示」，不影响结果页其余部分。
 *
 * 【摆���态】
 * 二选一票数没到 2/3 门槛时（swing），该轴两个状态都算「当前」，
 * 罗盘会同时点亮，并说明这是情境切换的临界态而不是缺陷。
 */
export default function BookDepthSection({
  base,
  currentSuffix,
  swingAxes,
  displaySuffix,
}: {
  base: string;
  /** 当前亚型后缀，如 "A-O" */
  currentSuffix: string | null;
  /** 摇摆轴标记 */
  swingAxes?: { AC?: boolean; OH?: boolean };
  /** 展示用后缀（含 ?），如 "?-O" */
  displaySuffix?: string | null;
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
        className="section-lazy mt-4 h-[180px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]"
        aria-hidden
      />
    );
  }

  return (
    <div className="section-lazy">
      <LifecycleCompass
        base={book.base}
        spiralStage={book.spiralStage}
        currentSuffix={currentSuffix}
        swingAxes={swingAxes}
        displaySuffix={displaySuffix}
      />
      <NeuroStackCard neuroBase={book.neuroBase} base={book.base} />
    </div>
  );
}
