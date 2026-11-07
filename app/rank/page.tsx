import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Compass, Leaf, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import MyRankBar from "@/components/MyRankBar";
import RankExplorer, { type RankRow } from "@/components/RankExplorer";
import DisclaimerBar from "@/components/DisclaimerBar";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { PRIOR_TABLE, per1000Text, rarityPyramid } from "@/lib/rarity";
import { typesByGroup } from "@/data/types64";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "64 型稀有度榜单",
  alternates: { canonical: absoluteUrl("/rank/") },
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

  const rows: RankRow[] = PRIOR_TABLE.ranked.map((r) => ({
    code: r.code,
    base: r.type.base,
    name: r.type.name,
    tagline: r.type.tagline,
    group: r.type.group,
    tierKey: r.tier.key,
    tierName: r.tier.name,
    tierColor: r.tier.color,
    rankLabel: r.rankLabel,
    per1000: r.per1000,
    percent: Math.round(r.probability * 1000) / 10,
  }));

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

      {/* 三种口径并列说明：相对等级 / 理论概率 / 真实样本 */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {[
          { t: "相对稀有等级", d: "七档名称只表示在这 64 型内部的相对名次，不是人口比例。" },
          { t: "模型理论概率", d: "由六维先验概率相乘得到，每个型约 0.6%–3.2%，仅代表模型假设。" },
          { t: "真实样本分布", d: "本站没有真实用户采样，因此不提供真实分布结论。" },
        ].map((item) => (
          <div key={item.t} className="rounded-card border border-line bg-white p-3.5">
            <p className="text-[12.5px] font-bold text-navy">{item.t}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{item.d}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-[16px] font-bold tracking-tight text-navy">查找 64 型</h2>
        <p className="mt-0.5 text-[11.5px] text-ink-mute">
          可按代码、中文名、族群或档位筛选；点击卡片进入型别详情。
        </p>
        <div className="mt-3">
          <RankExplorer rows={rows} />
        </div>
      </section>

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
