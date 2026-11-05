import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Compass, Leaf, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import TypeCard from "@/components/TypeCard";
import MyRankBar from "@/components/MyRankBar";
import DisclaimerBar from "@/components/DisclaimerBar";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { PRIOR_TABLE, RARITY_TIERS, per1000Text, rarityPyramid } from "@/lib/rarity";
import { typesByGroup } from "@/data/types64";

export const metadata: Metadata = {
  title: "64 型稀有度榜单",
  description:
    "64 型人格按稀有度排名：从最稀有的几型到最常见的一档，附每 1000 人中的大致人数与名次。含 4 大族群索引，可直接跳到你关心的型别。",
  keywords: ["人格稀有度排名", "64型榜单", "最稀有人格", "常见人格类型"],
};

const GROUPS: GroupKey[] = ["analyst", "adventurer", "diplomat", "guardian"];
const GROUP_ICONS = { analyst: Brain, diplomat: Leaf, guardian: ShieldCheck, adventurer: Compass } as const;

export default function RankPage() {
  const layers = rarityPyramid(PRIOR_TABLE);
  const topCount = layers[0].count;
  const bottomCount = layers[layers.length - 1].count;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header>
        <p className="eyebrow text-navy">RARITY LEADERBOARD</p>
        <h1 className="mt-2 text-[clamp(26px,5vw,38px)] font-black tracking-tight text-navy">64 型稀有度榜单</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
          从最稀有的 {topCount} 型到最常见的 {bottomCount} 型。档位由「六维先验概率」排名分桶得到，
          「每 1000 人约 X 人」才是概率换算值 —— 两者一个是相对名次，一个是绝对估算，别混着看。
          档位名（如「万里挑一」）是体感标签，不是绝对统计结论。
        </p>
      </header>

      <MyRankBar />

      {/* 档位索引 */}
      <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="稀有度档位">
        {RARITY_TIERS.map((t) => (
          <a
            key={t.key}
            href={`#tier-${t.key}`}
            className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-brand-border bg-white px-3.5 text-[12px] font-semibold text-ink-soft transition hover:border-navy/30 hover:bg-surface-hover hover:text-navy"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
            {t.name}
          </a>
        ))}
      </nav>

      {/* 按档位 */}
      <div className="mt-6 space-y-6">
        {RARITY_TIERS.map((tier) => {
          const list = PRIOR_TABLE.ranked.filter((r) => r.tier.key === tier.key);
          if (list.length === 0) return null;
          return (
            <section key={tier.key} id={`tier-${tier.key}`} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-brand-border pb-2">
                <h2 className="flex items-center gap-2 text-[18px] font-bold tracking-tight text-navy">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tier.color }} />
                  {tier.name}
                  <span className="text-[12px] font-semibold text-ink-mute">{list.length} 型</span>
                </h2>
                <p className="text-[11.5px] text-ink-mute">{tier.note}</p>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => (
                  <TypeCard key={r.code} type={r.type} rarity={r} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 按族群 */}
      <section id="groups" className="mt-12 scroll-mt-24">
        <h2 className="section-title">按族群查找</h2>
        <p className="section-sub">四个族群 × 16 个基础型 × 4 种后缀组合。</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GROUPS.map((g) => {
            const meta = GROUP_META[g];
            const Icon = GROUP_ICONS[g];
            return (
              <div key={g} id={g} className="scroll-mt-24 rounded-panel border border-brand-border bg-white p-5">
                <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-navy">
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-[10px]"
                    style={{ background: meta.soft, color: meta.text }}
                  >
                    <Icon size={17} />
                  </span>
                  <span style={{ color: meta.text }}>{meta.cn}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-mute">{meta.en}</span>
                </h3>
                <ul className="mt-3 grid grid-cols-2 gap-y-1.5">
                  {typesByGroup(g)
                    .filter((t) => t.ac === "A" && t.oh === "O")
                    .map((t) => {
                      const r = PRIOR_TABLE.byCode[t.code];
                      return (
                        <li key={t.code}>
                          <Link
                            href={`/type/${t.code}`}
                            className="flex min-h-[40px] items-center gap-1.5 text-[12.5px] text-ink-soft transition hover:text-navy"
                          >
                            <span className="font-mono text-[11px] font-bold text-ink-mute">{t.base}</span>
                            <span className="truncate">{t.name.split(" · ")[0]}</span>
                            {r && (
                              <span className="ml-auto shrink-0 text-[10px] text-ink-mute">
                                {per1000Text(r).replace("每 1000 人约 ", "").replace(" 人", "")}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
                <p className="mt-2 text-[10.5px] text-ink-mute">每个基础型还有 A/C × O/H 三种变体，点进去可看。</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/test" className="btn-primary">
          测测我是哪一型
        </Link>
        <Link href="/" className="btn-ghost">
          回到首页
        </Link>
      </div>

      <DisclaimerBar className="mt-8" variant="compact" />
    </div>
  );
}
