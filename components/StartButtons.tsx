import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 收尾 CTA 的两个开始按钮（普通链接，首页不加载答题状态机）
 */
export default function StartButtons({
  className,
  onDark = false,
}: {
  className?: string;
  /** 深色底板上：主按钮反白 */
  onDark?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5 sm:flex-row", className)}>
      <Link
        href="/test?mode=full"
        prefetch={false}
        className={cn("btn-primary !px-7 !py-3.5 !text-[15px]", onDark && "!bg-white !text-navy hover:!bg-navy-soft")}
      >
        立即开始
      </Link>
      <Link
        href="/test?mode=quick"
        prefetch={false}
        className={cn("btn-ghost !px-7 !py-3.5 !text-[15px]", onDark && "!border-white/30 !bg-transparent !text-white hover:!bg-white/10")}
      >
        先做 60 题精简版
      </Link>
    </div>
  );
}
