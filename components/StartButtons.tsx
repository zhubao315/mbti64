"use client";

import { useRouter } from "next/navigation";
import { useQuizStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * 首页的两个开始按钮
 *
 * 用 client 组件而不是 <Link href="/test?mode=quick">：
 * 静态导出（output: export）下页面不带运行时 searchParams，
 * 直接写入 store 再跳转最稳，也顺便把 index 重置到第一道未答题。
 */
export default function StartButtons({ className, solidGhost = false }: { className?: string; solidGhost?: boolean }) {
  const router = useRouter();
  const setMode = useQuizStore((s) => s.setMode);

  function start(mode: "quick" | "full") {
    setMode(mode);
    router.push("/test");
  }

  return (
    <div className={cn("flex flex-col gap-2.5 sm:flex-row", className)}>
      <button type="button" onClick={() => start("full")} className="btn-primary !px-7 !py-3.5 !text-[15px]">
        开始 120 题完整测评
      </button>
      <button
        type="button"
        onClick={() => start("quick")}
        className={cn("btn-ghost !px-7 !py-3.5 !text-[15px]", solidGhost && "!bg-white")}
      >
        先做 60 题精简版
      </button>
    </div>
  );
}
