import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * 首屏双 CTA：开始测评（主）/ 认识 64 型（次）
 *
 * 用普通链接直达 /test?mode=full，由答题页自己在挂载时读取参数，
 * 首页因此不必加载答题状态机（也就不会把 120 道题的数据打进首屏 JS）。
 */
export default function HomeCtas({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5 sm:flex-row", className)}>
      <Link href="/test?mode=full" prefetch={false} className="btn-primary !px-7 !py-3.5 !text-[15px]">
        开始人格测评
        <ArrowRight size={17} weight="bold" aria-hidden />
      </Link>
      <Link href="#types" className="btn-ghost !px-7 !py-3.5 !text-[15px]">
        认识 64 种人格
      </Link>
    </div>
  );
}
