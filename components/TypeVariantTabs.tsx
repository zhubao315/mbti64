import Link from "next/link";
import { TYPE_CODES, getType } from "@/data/types64";
import { GROUP_META } from "@/data/schema";
import { cn } from "@/lib/utils";

/**
 * 后缀变体 tab：同一基础型的 4 种调性
 * 类似 16P 的「Architect / Logician / Commander / Debater」兄弟型切换
 */
export default function TypeVariantTabs({ code }: { code: string }) {
  const variants = TYPE_CODES.filter((c) => c.startsWith(`${code.slice(0, 4)}-`)).map((c) => getType(c));
  const group = GROUP_META[variants[0].group];

  return (
    <nav aria-label="同基础型后缀变体" className="card p-1.5 sm:p-2">
      <ul className="grid gap-1 sm:grid-cols-4">
        {variants.map((v) => {
          const active = v.code === code;
          return (
            <li key={v.code}>
              <Link
                href={`/type/${v.code}`}
                prefetch={false}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-[8px] px-3 py-2 text-[12.5px] font-semibold transition",
                  active
                    ? "text-white shadow-card"
                    : "text-ink-mute hover:bg-surface-hover hover:text-navy",
                )}
                style={active ? { background: group.text } : undefined}
                aria-current={active ? "page" : undefined}
              >
                <span className={cn("font-mono text-[10.5px] tracking-[0.12em]", !active && "text-ink-mute")}>{v.code.slice(5)}</span>
                <span className="truncate">{v.shortName}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
