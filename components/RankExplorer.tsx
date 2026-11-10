"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export interface RankRow {
  code: string;
  base: string;
  name: string;
  tagline: string;
  group: "analyst" | "diplomat" | "guardian" | "adventurer";
  tierKey: string;
  tierName: string;
  tierColor: string;
  rankLabel: string;
  /** 每 1000 人约几人 */
  per1000: number;
  /** 理论先验概率（%），如 2.9 */
  percent: number;
}

const GROUPS = [
  { key: "all", label: "全部族群" },
  { key: "analyst", label: "分析师" },
  { key: "diplomat", label: "外交家" },
  { key: "guardian", label: "守护者" },
  { key: "adventurer", label: "冒险家" },
] as const;

const TIER_OPTIONS = [
  { key: "all", label: "全部档位" },
  { key: "oneInTenThousand", label: "万里挑一" },
  { key: "extremelyRare", label: "极稀有" },
  { key: "rare", label: "稀有" },
  { key: "oneInThousand", label: "千分之一" },
  { key: "oneInHundred", label: "百分之一" },
  { key: "common", label: "常见型" },
  { key: "everywhere", label: "无处不在" },
] as const;

/** 64 型稀有度探索：搜索 + 族群筛选 + 档位筛选，数据全部来自 PRIOR_TABLE。 */
export default function RankExplorer({ rows }: { rows: RankRow[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]["key"]>("all");
  const [tier, setTier] = useState<(typeof TIER_OPTIONS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (group !== "all" && r.group !== group) return false;
      if (tier !== "all" && r.tierKey !== tier) return false;
      if (!q) return true;
      return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.base.toLowerCase().includes(q);
    });
  }, [rows, query, group, tier]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">搜索人格代码或名称</span>
          <MagnifyingGlass size={15} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索代码 / 中文名，例如 INFJ、调停者"
            className="min-h-[44px] w-full rounded-[10px] border border-brand-border bg-white pl-9 pr-3.5 text-[13.5px] text-ink placeholder:text-ink-mute/80 focus:border-navy focus:outline-none"
          />
        </label>
        <p className="text-[11.5px] text-ink-mute sm:w-28 sm:text-right">共 {filtered.length} 型</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="族群筛选">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            aria-pressed={group === g.key}
            className={`min-h-[38px] rounded-full border px-3.5 text-[12px] font-semibold transition ${
              group === g.key
                ? "border-navy bg-navy text-white"
                : "border-brand-border bg-white text-ink-soft hover:border-navy/30 hover:text-navy"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="档位筛选">
        {TIER_OPTIONS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTier(t.key)}
            aria-pressed={tier === t.key}
            className={`min-h-[36px] rounded-full border px-3 text-[11.5px] font-semibold transition ${
              tier === t.key
                ? "border-navy bg-navy-soft text-navy"
                : "border-brand-border bg-white text-ink-mute hover:border-navy/30 hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-panel border border-line bg-wash p-8 text-center">
          <p className="text-[14px] font-semibold text-navy">没有匹配的型别</p>
          <p className="mt-1 text-[12.5px] text-ink-mute">试试只搜代码（如 INFJ）或清空筛选。</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <li key={r.code}>
              <Link
                href={`/type/${r.code}`}
                prefetch={false}
                className="flex h-full flex-col rounded-card border border-line bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-bold text-navy">{r.code}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                    style={{ background: `${r.tierColor}14`, color: r.tierColor }}
                  >
                    {r.tierName}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13.5px] font-bold text-ink">{r.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-mute">{r.tagline}</p>
                <dl className="mt-2 grid grid-cols-3 gap-1 border-t border-line pt-2 text-[10.5px]">
                  <div>
                    <dt className="text-ink-mute">名次</dt>
                    <dd className="font-semibold text-ink">第 {r.rankLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-mute">先验</dt>
                    <dd className="font-semibold text-ink">{r.percent}%</dd>
                  </div>
                  <div>
                    <dt className="text-ink-mute">每千人</dt>
                    <dd className="font-semibold text-ink">{r.per1000}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
