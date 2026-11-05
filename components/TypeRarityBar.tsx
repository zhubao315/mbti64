import Link from "next/link";
import { Triangle } from "@phosphor-icons/react/dist/ssr";
import type { RankedType } from "@/lib/rarity";
import { GROUP_META } from "@/data/schema";
import { TYPE_BY_CODE } from "@/data/types64";
import { per1000Text } from "@/lib/rarity";
import { withBasePath } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 稀有度条：16P 式「你在金字塔第几层 + 每 1000 人约 X 人 + 同档其他型」
 */
export default function TypeRarityBar({
  current,
  peers,
}: {
  current: RankedType;
  /** 同档其他型（不含自己） */
  peers: RankedType[];
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Triangle aria-hidden size={16} className="text-navy" />
        <h3 className="text-[15px] font-bold tracking-tight text-navy">稀有度</h3>
      </div>

      <div className="mt-3 rounded-[10px] border border-line bg-wash px-4 py-3">
        <p className="text-[13.5px] text-ink-soft">
          你属于 <strong className="text-navy">{current.tier.name}</strong>
          这一档（64 型中第 <strong className="text-navy">{current.rankLabel}</strong> 位，
          <strong className="text-navy">{per1000Text(current)}</strong>）。
        </p>
      </div>

      {peers.length > 0 && (
        <div className="mt-4">
          <p className="text-[11.5px] font-semibold tracking-wide text-ink-mute">同档其他型</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {peers.map((p) => {
              const g = GROUP_META[TYPE_BY_CODE[p.code].group];
              return (
                <li key={p.code}>
                  <Link
                    href={`/type/${p.code}`}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition hover:bg-wash",
                    )}
                  >
                    <span
                      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[8px] border"
                      style={{ borderColor: "#E8E8E8", background: g.soft }}
                    >
                      <img
                        src={withBasePath(`/assets/portraits-light/thumb-512/${p.code}-thumb-512.webp`)}
                        alt={`${p.type.name} 角色头像`}
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="portrait-blob"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-soft">
                      {p.type.name}
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-mute">{p.code}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
