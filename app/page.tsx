import Link from "next/link";
import type { PyramidLayerData } from "@/components/PyramidExplorer";
import {
  ArrowRight,
  Brain,
  ChartPolar,
  Clock,
  Compass,
  Leaf,
  ListChecks,
  LockKey,
  ShieldCheck,
  SquaresFour,
  Triangle,
} from "@phosphor-icons/react/dist/ssr";
import BrandLogo from "@/components/BrandLogo";
import HomeHighlightLazy from "@/components/HomeHighlightLazy";
import ResumeBanner from "@/components/ResumeBanner";
import Faq from "@/components/Faq";
import HomeCtas from "@/components/HomeCtas";
import StartButtons from "@/components/StartButtons";
import TeachingLazy from "@/components/TeachingLazy";
import TypeCard from "@/components/TypeCard";
import RarityPyramid from "@/components/RarityPyramid";
import PyramidLazy from "@/components/PyramidLazy";
import DisclaimerBar from "@/components/DisclaimerBar";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { typesByGroup, TYPE_BY_CODE } from "@/data/types64";
import { PRIOR_TABLE, per1000Text, rarityPyramid } from "@/lib/rarity";
import { withBasePath } from "@/lib/site";
import RadarChart from "@/components/RadarChart";
import RarityBadge from "@/components/RarityBadge";
import { getType } from "@/data/types64";
import { idealResult } from "@/lib/ideal";
import { TOTAL_QUESTIONS, QUICK_QUESTIONS } from "@/data/questions";

const GROUP_ICONS = { analyst: Brain, diplomat: Leaf, guardian: ShieldCheck, adventurer: Compass } as const;

const GROUP_BLURB: Record<GroupKey, string> = {
  analyst: "理性、系统、爱拆解问题，习惯先想清楚再行动。",
  diplomat: "共情、理想、重视意义，擅长把人和人连起来。",
  guardian: "秩序、责任、可靠，把承诺和细节放在心上。",
  adventurer: "行动、灵活、好奇，喜欢在真实世界里试出新路。",
};

export default function HomePage() {
  const sample = getType("INFJ-A-O");
  const ideal = idealResult("INFJ-A-O");
  const rarest = PRIOR_TABLE.ranked.slice(0, 6);
  const rareOne = PRIOR_TABLE.ranked[0];
  const commonOne = PRIOR_TABLE.ranked[PRIOR_TABLE.ranked.length - 1];
  const groups: GroupKey[] = ["analyst", "diplomat", "guardian", "adventurer"];

  // 交互金字塔数据：每档的型别清单（预计算，客户端只负责切换）
  const pyramidLayers: PyramidLayerData[] = rarityPyramid(PRIOR_TABLE).map((l) => ({
    key: l.tier.key,
    name: l.tier.name,
    note: l.tier.note,
    count: l.count,
    share: l.share,
    types: l.codes.map((c) => {
      const t = TYPE_BY_CODE[c];
      return { code: c, name: t.name, group: t.group };
    }),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <HomeHighlightLazy />

      <ResumeBanner />

      {/* ------------------------------------------------------------ Hero：左文右图 */}
      <section className="grid items-center gap-10 overflow-x-clip pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div>
          <p className="eyebrow text-navy">64 PERSONALITIES</p>

          <h1 className="mt-3 text-[clamp(30px,7vw,44px)] font-black leading-[1.14] tracking-tight text-navy">
            你的性格，
            <br />
            在 64 型里有多稀有？
          </h1>

          <p className="mt-4 max-w-[34em] text-[14px] leading-[1.85] text-ink-soft sm:text-[15px]">
            六维倾向 × 自我姿态 × 变化偏好，探索独特的自己。{TOTAL_QUESTIONS} 道发生在职场、饭局和手机里的情景题，
            答完你会拿到：一张六维雷达、一座稀有度金字塔，以及和你最像、最互补的各 3 个型。
          </p>

          <HomeCtas className="mt-7" />

          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-ink-mute">
            <li className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden /> 精简版 {QUICK_QUESTIONS} 题约 8 分钟
            </li>
            <li className="inline-flex items-center gap-1.5">
              <LockKey size={14} aria-hidden /> 结果只存在你的浏览器
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} aria-hidden /> 不需要注册
            </li>
          </ul>

          <DisclaimerBar className="mt-5 !text-left" variant="compact" />
        </div>

        {/* 右：两张角色插画错位浮层 —— 稀有个体 vs 常见型 */}
        <div className="mx-auto w-full max-w-[420px]">
          <div className="relative mx-auto h-[340px] w-full max-w-[360px] sm:h-[390px]">
            <Link
              href={`/type/${rareOne.code}`}
              prefetch={false}
              className="group absolute left-0 top-0 z-10 w-[58%] -rotate-3 rounded-[12px] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0"
            >
              <div className="overflow-hidden rounded-[12px] border border-line bg-white shadow-card">
                <div className="relative aspect-square overflow-hidden bg-wash">
                  <img
                    src={withBasePath(`/assets/portraits-light/thumb-512/${rareOne.code}-thumb-512.webp`)}
                    alt={`${TYPE_BY_CODE[rareOne.code].name} 角色插画`}
                    width={512}
                    height={512}
                    fetchPriority="high"
                    decoding="sync"
                    className="portrait-blob"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink-mute">{rareOne.code}</p>
                  <p className="mt-0.5 truncate text-[14px] font-bold text-navy">{TYPE_BY_CODE[rareOne.code].name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <RarityBadge tier={rareOne.tier} size="sm" />
                    <span className="text-[10px] font-semibold text-ink-mute">{per1000Text(rareOne)}</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={`/type/${commonOne.code}`}
              prefetch={false}
              className="group absolute bottom-0 right-0 w-[58%] rotate-2 rounded-[12px] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0"
            >
              <div className="overflow-hidden rounded-[12px] border border-line bg-white shadow-card">
                <div className="relative aspect-square overflow-hidden bg-wash">
                  <img
                    src={withBasePath(`/assets/portraits-light/thumb-512/${commonOne.code}-thumb-512.webp`)}
                    alt={`${TYPE_BY_CODE[commonOne.code].name} 角色插画`}
                    width={512}
                    height={512}
                    fetchPriority="high"
                    decoding="sync"
                    className="portrait-blob"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink-mute">{commonOne.code}</p>
                  <p className="mt-0.5 truncate text-[14px] font-bold text-navy">{TYPE_BY_CODE[commonOne.code].name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <RarityBadge tier={commonOne.tier} size="sm" />
                    <span className="text-[10px] font-semibold text-ink-mute">{per1000Text(commonOne)}</span>
                  </div>
                </div>
              </div>
            </Link>

            <span
              aria-hidden
              className="absolute left-[46%] top-[46%] z-20 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full border border-line bg-white shadow-card"
            >
              <BrandLogo variant="icon" size={22} />
            </span>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-mute">
            左边是 64 型里最稀有的一档，右边是最常见的一档；点卡片可以直接看它的完整解读。
          </p>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {groups.map((g) => {
              const meta = GROUP_META[g];
              const Icon = GROUP_ICONS[g];
              return (
                <div key={g} className="rounded-[8px] px-1.5 py-2 text-center" style={{ background: meta.light }}>
                  <Icon size={13} className="mx-auto" style={{ color: meta.text }} aria-hidden />
                  <p className="mt-1 truncate text-[10.5px] font-bold" style={{ color: meta.text }}>
                    {meta.cn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ 数据条 */}
      <section className="section-lazy mt-12 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { icon: SquaresFour, num: "64", label: "种人格", desc: "4 族群 × 16 基础型 × 4 后缀", tint: "#F1EDFF" },
          { icon: ListChecks, num: `${TOTAL_QUESTIONS}`, label: "道情景题", desc: "含 18 道反向计分题", tint: "#EAF7EE" },
          { icon: ChartPolar, num: "6", label: "个维度", desc: "能量 / 信息 / 决策 / 节奏 / 姿态 / 变化", tint: "#EAF3FD" },
          { icon: Triangle, num: "7", label: "档稀有度", desc: "从万里挑一到无处不在", tint: "#FFF7DF" },
        ].map(({ icon: Icon, num, label, desc, tint }) => (
          <div key={label} className="card px-4 py-4">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-[8px] text-navy"
              style={{ background: tint }}
            >
              <Icon size={17} />
            </span>
            <p className="num-hero mt-2.5 text-[26px] font-black leading-none text-navy">{num}</p>
            <p className="mt-1 text-[12.5px] font-bold text-ink-soft">{label}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-ink-mute">{desc}</p>
          </div>
        ))}
      </section>

      {/* ------------------------------------------------------------ 结果预览 */}
      <section className="section-lazy mt-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">结果页长什么样</h2>
            <p className="section-sub">一张型别卡、一张六维雷达、一座稀有度金字塔，再配 3 个相近型和 3 个互补型。</p>
          </div>
          <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-mute">
            示例：INFJ-A-O
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: GROUP_META[sample.group].color }}
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-navy">{sample.name}</p>
                <p className="font-mono text-[11px] font-bold tracking-wide text-ink-mute">{sample.code}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <RarityBadge tier={PRIOR_TABLE.byCode[sample.code].tier} size="sm" />
              <span className="text-[11px] font-medium text-ink-mute">{per1000Text(PRIOR_TABLE.byCode[sample.code])}</span>
            </div>
            <p className="mt-2.5 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">{sample.tagline}</p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {sample.keywords.slice(0, 3).map((k) => (
                <span key={k} className="rounded-full bg-wash px-2 py-0.5 text-[10.5px] text-ink-mute">
                  {k}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-3">
            <p className="text-[12px] font-bold text-ink-soft">六维雷达</p>
            <RadarChart dims={ideal.dims} size={230} className="mx-auto" showLabels showScale={false} animated={false} />
          </div>

          <div className="card p-3">
            <p className="text-[12px] font-bold text-ink-soft">稀有度金字塔</p>
            <div className="mt-2">
              <RarityPyramid table={PRIOR_TABLE} current={PRIOR_TABLE.byCode[sample.code]} compact />
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
          示例为 64 型之一的典型形态，用于说明结果结构；你的结果由你的答题数据现算，不会上传服务器。
        </p>
      </section>

      {/* ------------------------------------------------------------ 六维说明 */}
      <section id="how-it-works" className="section-lazy mt-14 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">先花 1 分钟，看懂你被测什么</h2>
            <p className="section-sub">六个维度，每张卡片一个。翻完再开始，答题会准很多。</p>
          </div>
        </div>
        <TeachingLazy />
      </section>

      {/* ------------------------------------------------------------ 稀有度（交互金字塔 + 最稀有 6 型） */}
      <section className="section-lazy mt-14">
        <h2 className="section-title">稀有度金字塔</h2>
        <p className="section-sub">档位按 64 型内部排名分桶，同档型别共享一层。移到某一层，看看这一档住着谁。</p>

        <PyramidLazy layers={pyramidLayers} className="mt-5" />

        <div className="mt-8 flex items-baseline justify-between gap-2">
          <h3 className="text-[16px] font-bold tracking-tight text-navy">当前最稀有的 6 型</h3>
          <Link href="/rank" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy hover:underline">
            完整榜单
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rarest.map((r) => (
            <TypeCard key={r.code} type={r.type} rarity={r} compact />
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
          例：{rarest[0].type.name}（{rarest[0].code}）{per1000Text(rarest[0])}。按先验概率排序。
        </p>
      </section>

      {/* ------------------------------------------------------------ 四族群 */}
      <section className="section-lazy mt-14">
        <h2 className="section-title">四大族群</h2>
        <p className="section-sub">先认族群，再认具体型别。族群决定你的底色，后缀决定你的调性。</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const meta = GROUP_META[g];
            const Icon = GROUP_ICONS[g];
            const count = typesByGroup(g).filter((t) => t.ac === "A" && t.oh === "O").length;
            return (
              <div
                key={g}
                className="group relative overflow-hidden rounded-panel border border-brand-border p-5 transition-all duration-200 ease-product hover:-translate-y-0.5 hover:shadow-lift sm:p-6"
                style={{ background: meta.light, borderTopWidth: 4, borderTopColor: meta.color }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: meta.text }}>
                      {meta.en}s
                    </p>
                    <h3 className="mt-1 text-[20px] font-bold tracking-tight text-navy">{meta.cn}</h3>
                  </div>
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white/80"
                    style={{ color: meta.text }}
                  >
                    <Icon size={21} />
                  </span>
                </div>

                <p className="mt-3 max-w-[30em] text-[12.5px] leading-relaxed text-ink-soft">{GROUP_BLURB[g]}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11.5px] font-semibold text-ink-mute">
                    {count} 种基础人格 · {count * 4} 种组合
                  </p>
                  <Link
                    href={`/rank#${g}`}
                    className="inline-flex min-h-[40px] items-center gap-1 text-[12.5px] font-bold transition hover:underline"
                    style={{ color: meta.text }}
                  >
                    查看全部人格
                    <ArrowRight size={12} aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Faq />

      {/* ------------------------------------------------------------ 收尾 CTA */}
      <section className="mt-14 rounded-panel bg-navy px-6 py-10 text-center sm:px-10">
        <h2 className="text-[24px] font-black tracking-tight text-white sm:text-[30px]">
          答完 {TOTAL_QUESTIONS} 题，知道自己有多稀有
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-white/85">
          结果只用于娱乐与自我探索。人格是流动的，这个结果不该定义你，但它可以是一个重新认识自己的入口。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <StartButtons onDark />
        </div>
      </section>

      <DisclaimerBar className="mt-8" variant="compact" />
    </div>
  );
}
