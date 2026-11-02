import Link from "next/link";
import { Suspense } from "react";
import HomeHighlight from "@/components/HomeHighlight";
import StartButtons from "@/components/StartButtons";
import TeachingCarousel from "@/components/TeachingCarousel";
import TypeCard from "@/components/TypeCard";
import RarityPyramid from "@/components/RarityPyramid";
import DisclaimerBar from "@/components/DisclaimerBar";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { typesByGroup, TYPE_CODES } from "@/data/types64";
import { PRIOR_TABLE, per1000Text } from "@/lib/rarity";
import { TOTAL_QUESTIONS, QUICK_QUESTIONS } from "@/data/questions";

export default function HomePage() {
  const rarest = PRIOR_TABLE.ranked.slice(0, 6);
  const groups: GroupKey[] = ["analyst", "adventurer", "diplomat", "guardian"];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <Suspense fallback={null}>
        <HomeHighlight />
      </Suspense>

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/45 px-5 py-10 backdrop-blur-xl sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-coral/20 blur-3xl"
        />

        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-violet/20 bg-violet/10 px-3 py-1 text-[11.5px] font-bold tracking-wide text-violet">
            <span aria-hidden>✦</span> 64 型人格 · 稀有度测评
          </p>

          <h1 className="mt-4 text-[clamp(30px,7vw,52px)] font-black leading-[1.08] tracking-tight text-ink">
            你的性格，
            <br className="sm:hidden" />
            在 64 型里
            <span className="bg-gradient-to-r from-violet via-coral to-avocado bg-clip-text text-transparent"> 有多稀有</span>
            ？
          </h1>

          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-ink-soft sm:text-[15.5px]">
            六维倾向 × 坚定/内省 × 探索/守成，组合出 {TYPE_CODES.length} 种人格。
            {TOTAL_QUESTIONS} 道本土化情景题（职场、社交、消费、生活方式、数字生活），
            答完给你一张六维雷达、一座稀有度金字塔，和一张能发朋友圈的海报。
          </p>

          <StartButtons className="mt-6" />

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] font-medium text-ink-mute">
            <span>✓ {QUICK_QUESTIONS} 题精简版约 8 分钟</span>
            <span>✓ 结果只存在你的浏览器</span>
            <span>✓ 不需要注册</span>
          </div>

          <DisclaimerBar className="mt-4 !text-left" variant="compact" />
        </div>
      </section>

      {/* ------------------------------------------------------------ 数据条 */}
      <section className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["64", "种人格", "4 族群 × 16 基础型 × 4 后缀"],
          [`${TOTAL_QUESTIONS}`, "道情景题", "含 18 道反向计分题"],
          ["6", "个维度", "能量 / 信息 / 决策 / 节奏 / 姿态 / 变化"],
          ["7", "档稀有度", "从万里挑一到无处不在"],
        ].map(([num, label, desc]) => (
          <div key={label} className="glass px-4 py-3.5">
            <p className="num-hero text-[26px] font-black leading-none text-ink">{num}</p>
            <p className="mt-1 text-[12.5px] font-bold text-ink-soft">{label}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-ink-mute">{desc}</p>
          </div>
        ))}
      </section>

      {/* ------------------------------------------------------------ 六维说明 */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">先花 1 分钟，看懂你被测什么</h2>
            <p className="section-sub">六个维度，每张卡片一个。翻完再开始，答题会准很多。</p>
          </div>
          <span className="text-[11.5px] font-semibold text-ink-mute">← 左右滑动 →</span>
        </div>
        <TeachingCarousel />
      </section>

      {/* ------------------------------------------------------------ 稀有度 */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="glass p-5 sm:p-6">
          <h2 className="text-[18px] font-bold tracking-tight text-ink">稀有度金字塔</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
            顶部最窄 = 越稀有。档位按 64 型内部排名分桶，同档型别共享一层。
          </p>
          <div className="mt-4">
            <RarityPyramid table={PRIOR_TABLE} compact />
          </div>
          <Link href="/rank" className="btn-ghost mt-4 w-full !text-[13px]">
            看完整 64 型榜单
          </Link>
        </div>

        <div className="glass p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-bold tracking-tight text-ink">当前最稀有的 6 型</h2>
            <span className="text-[11px] font-semibold text-ink-mute">按先验概率</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {rarest.map((r) => (
              <TypeCard key={r.code} type={r.type} rarity={r} compact />
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
            例：{rarest[0].type.name}（{rarest[0].code}）{per1000Text(rarest[0])}。
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ 四族群 */}
      <section className="mt-10">
        <h2 className="section-title">四大族群</h2>
        <p className="section-sub">先认族群，再认具体型别。族群决定你的底色，后缀决定你的调性。</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const meta = GROUP_META[g];
            const list = typesByGroup(g).slice(0, 4);
            return (
              <div key={g} className="glass p-5">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-2xl text-[18px]"
                    style={{ background: `${meta.color}1F` }}
                  >
                    {meta.emoji}
                  </span>
                  <div>
                    <h3 className="text-[15.5px] font-bold tracking-tight text-ink">
                      {meta.cn} <span className="text-[11px] font-semibold text-ink-mute">{meta.en}</span>
                    </h3>
                    <p className="text-[11px] text-ink-mute">16 种基础型 · 64 种组合</p>
                  </div>
                </div>

                <Link href={`/rank#${g}`} className="mt-3 block text-[12px] font-semibold" style={{ color: meta.color }}>
                  查看本族全部型别 →
                </Link>

                <div className="mt-3 grid gap-2">
                  {list.map((t) => (
                    <TypeCard key={t.code} type={t} rarity={PRIOR_TABLE.byCode[t.code]} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ 收尾 CTA */}
      <section className="mt-10 overflow-hidden rounded-[32px] bg-ink px-6 py-10 text-center sm:px-10">
        <h2 className="text-[24px] font-black tracking-tight text-white sm:text-[30px]">
          120 题之后，你会知道自己有多少见
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-white/65">
          结果只用于娱乐与自我探索。人格是流动的，这个结果不该定义你，但它可以是一个重新认识自己的入口。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <StartButtons />
        </div>
      </section>

      <DisclaimerBar className="mt-8" variant="compact" />
    </div>
  );
}
