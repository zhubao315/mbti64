import Link from "next/link";
import type { Metadata } from "next";
import type { PyramidLayerData } from "@/components/PyramidExplorer";
import {
  ArrowRight,
  Brain,
  Clock,
  Compass,
  Leaf,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import BrandLogo from "@/components/BrandLogo";
import HomeHighlightLazy from "@/components/HomeHighlightLazy";
import ResumeBanner from "@/components/ResumeBanner";
import Faq from "@/components/Faq";
import HomeCtas from "@/components/HomeCtas";
import StartButtons from "@/components/StartButtons";
import TypeCard from "@/components/TypeCard";
import RarityPyramid from "@/components/RarityPyramid";
import PyramidLazy from "@/components/PyramidLazy";
import DisclaimerBar from "@/components/DisclaimerBar";
import TypeMatrix from "@/components/TypeMatrix";
import { DIMS, DIM_ORDER, GROUP_META, type DimKey, type GroupKey } from "@/data/schema";
import {
  ALL_TYPES,
  BASE_TYPES,
  SUFFIX_MODIFIERS,
  TYPE_BY_CODE,
  getType,
  typesByGroup,
} from "@/data/types64";
import { PRIOR_TABLE, per1000Text, rarityPyramid } from "@/lib/rarity";
import { absoluteUrl, withBasePath } from "@/lib/site";
import RadarChart from "@/components/RadarChart";
import RarityBadge from "@/components/RarityBadge";
import { idealResult } from "@/lib/ideal";
import { TOTAL_QUESTIONS, QUICK_QUESTIONS } from "@/data/questions";

const GROUP_ICONS = { analyst: Brain, diplomat: Leaf, guardian: ShieldCheck, adventurer: Compass } as const;

const GROUP_BLURB: Record<GroupKey, string> = {
  analyst: "理性、系统、爱拆解问题，习惯先想清楚再行动。",
  diplomat: "共情、理想、重视意义，擅长把人和人连起来。",
  guardian: "秩序、责任、可靠，把承诺和细节放在心上。",
  adventurer: "行动、灵活、好奇，喜欢在真实世界里试出新路。",
};

/** 六维在首页的短名（完整解释由 DIMS 提供） */
const DIM_BRIEF: Record<DimKey, { label: string; code: string }> = {
  EI: { label: "能量", code: "E / I" },
  SN: { label: "信息", code: "S / N" },
  TF: { label: "决策", code: "T / F" },
  JP: { label: "节奏", code: "J / P" },
  AC: { label: "姿态", code: "A / C" },
  OH: { label: "变化", code: "O / H" },
};

/** 四种个性状态：后缀二维的笛卡尔积 */
const SUFFIX_COMBOS = [
  { key: "A-O", ac: SUFFIX_MODIFIERS.A.name, oh: SUFFIX_MODIFIERS.O.name },
  { key: "A-H", ac: SUFFIX_MODIFIERS.A.name, oh: SUFFIX_MODIFIERS.H.name },
  { key: "C-O", ac: SUFFIX_MODIFIERS.C.name, oh: SUFFIX_MODIFIERS.O.name },
  { key: "C-H", ac: SUFFIX_MODIFIERS.C.name, oh: SUFFIX_MODIFIERS.H.name },
] as const;

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
};

export default function HomePage() {
  const sample = getType("INFJ-A-O");
  const ideal = idealResult("INFJ-A-O");
  const rarest = PRIOR_TABLE.ranked.slice(0, 6);
  const rareOne = PRIOR_TABLE.ranked[0];
  const commonOne = PRIOR_TABLE.ranked[PRIOR_TABLE.ranked.length - 1];
  const groups: GroupKey[] = ["analyst", "diplomat", "guardian", "adventurer"];

  // 矩阵只把轻量索引传给客户端，64 份长文详情不进首页 JS
  const matrixItems = ALL_TYPES.map((t) => ({
    code: t.code,
    name: t.name,
    base: t.base,
    group: t.group,
    tagline: t.tagline,
  }));
  const baseOptions = BASE_TYPES.map((b) => ({ code: b.code, cn: b.cn }));

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

      {/* ============================================================ 01 · Hero */}
      <section className="grid items-center gap-10 overflow-x-clip pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div>
          <p className="eyebrow text-navy">64 PERSONALITIES · ONE UNIQUE YOU</p>

          <h1 className="mt-3 text-[clamp(30px,7vw,44px)] font-black leading-[1.14] tracking-tight text-navy">
            发现 64 种人格中的
            <br />
            独特自己
          </h1>

          <p className="mt-4 max-w-[34em] text-[14px] leading-[1.85] text-ink-soft sm:text-[15px]">
            16 种基础人格，叠加 4 种个性状态。通过六个维度，探索你的思维方式、行为倾向与成长可能。
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
                <div key={g} className="rounded-[8px] px-1.5 py-2 text-center" style={{ background: meta.soft }}>
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

      {/* ============================================================ 02 · 认识 MBTI64 */}
      <section id="model" className="section-lazy mt-16 scroll-mt-24">
        <h2 className="section-title">认识 MBTI64</h2>
        <p className="section-sub">一个乘法，解释 64 型从哪里来：16 种基础人格 × 4 种个性状态。</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,0.9fr)_auto_minmax(0,0.75fr)] sm:items-center">
          <div className="card p-4">
            <p className="eyebrow">01 · 基础人格</p>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {BASE_TYPES.map((b) => (
                <span
                  key={b.code}
                  title={b.cn}
                  className="rounded-[6px] bg-wash px-1 py-1.5 text-center font-mono text-[10px] font-bold tracking-[0.04em] text-navy"
                >
                  {b.code}
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] font-semibold text-ink-soft">16 种基础人格</p>
          </div>

          <div aria-hidden className="py-1 text-center text-[22px] font-black text-ink-mute sm:px-1">
            ×
          </div>

          <div className="card p-4">
            <p className="eyebrow">02 · 个性状态</p>
            <div className="mt-2.5 grid gap-1.5">
              {SUFFIX_COMBOS.map((s) => (
                <div key={s.key} className="flex items-center justify-between rounded-[6px] bg-wash px-2.5 py-1.5">
                  <span className="font-mono text-[11.5px] font-bold text-navy">{s.key}</span>
                  <span className="text-[11px] text-ink-mute">
                    {s.ac} · {s.oh}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] font-semibold text-ink-soft">4 种个性状态</p>
          </div>

          <div aria-hidden className="py-1 text-center text-[22px] font-black text-ink-mute sm:px-1">
            =
          </div>

          <div className="card flex flex-col items-center justify-center bg-navy p-5 text-center text-white">
            <p className="num-hero text-[42px] font-black leading-none">64</p>
            <p className="mt-1 text-[12.5px] font-bold">种人格组合</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-white/70">每个基础型 × 每种状态，都有自己的名字与解读</p>
          </div>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-mute">
          16 个基础型来自传统四维组合；4 种个性状态指后缀 A/C × O/H。两者相乘得到 64 个不重复的人格编码。
        </p>
      </section>

      {/* ============================================================ 03 · 开始测评 */}
      <section id="start" className="section-lazy mt-16 scroll-mt-24">
        <h2 className="section-title">开始测评</h2>
        <p className="section-sub">同一套题库与算法，两种长度。第一次来，建议先做精简版。</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="card flex flex-col p-5 sm:p-6">
            <p className="eyebrow">快速测评</p>
            <h3 className="mt-1.5 text-[20px] font-bold tracking-tight text-navy">
              {QUICK_QUESTIONS} 题 · 约 8 分钟
            </h3>
            <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-ink-soft">
              适合初次探索。覆盖六个维度各 10 题，先拿到一张完整的六维雷达与人格编码。
            </p>
            <Link href="/test?mode=quick" prefetch={false} className="btn-ghost mt-5 w-full">
              开始快速测评
            </Link>
          </div>

          <div className="card flex flex-col border-navy/25 p-5 sm:p-6">
            <p className="eyebrow">完整测评</p>
            <h3 className="mt-1.5 text-[20px] font-bold tracking-tight text-navy">
              {TOTAL_QUESTIONS} 题 · 约 15–20 分钟
            </h3>
            <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-ink-soft">
              适合更深入地了解人格倾向。每维追加 10 题，后缀维度的投票也更稳，摇摆型概率更低。
            </p>
            <Link href="/test?mode=full" prefetch={false} className="btn-primary mt-5 w-full !text-[15px]">
              开始完整测评
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ 04 · 六维人格模型 */}
      <section id="six-dims" className="section-lazy mt-16 scroll-mt-24">
        <h2 className="section-title">六维人格模型</h2>
        <p className="section-sub">六个维度，每维两端。没有好坏，只有你更常用哪一边。</p>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {DIM_ORDER.map((key, idx) => {
            const dim = DIMS[key];
            const brief = DIM_BRIEF[key];
            const isSuffix = key === "AC" || key === "OH";
            return (
              <div key={key} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-navy">
                    <span className="mr-1.5 text-[10px] font-bold text-ink-mute">{String(idx + 1).padStart(2, "0")}</span>
                    {brief.label}
                  </p>
                  <span className="rounded-full bg-wash px-2 py-0.5 font-mono text-[11px] font-bold text-ink-soft">
                    {brief.code}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] font-semibold text-ink-mute">{dim.name}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{dim.question}</p>
                <p className="mt-2.5 text-[11px] leading-relaxed text-ink-mute">
                  {dim.poleAName} ⇄ {dim.poleBName}
                </p>
                {isSuffix && (
                  <span className="mt-2 inline-block rounded-full bg-navy-soft px-2 py-0.5 text-[10px] font-bold text-navy">
                    MBTI64 扩展维度
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 max-w-[46em] text-[11.5px] leading-relaxed text-ink-mute">
          前四个维度构成传统 16 型的基础框架；A/C（坚定 / 审慎）与 O/H（求新 / 守成）是 MBTI64 自主扩展的两个维度，
          不属于传统 MBTI 官方体系。
        </p>
      </section>

      {/* ============================================================ 05 · 四大人格阵营 */}
      <section id="groups" className="section-lazy mt-16 scroll-mt-24">
        <h2 className="section-title">四大人格阵营</h2>
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
                style={{ background: meta.soft, borderTopWidth: 4, borderTopColor: meta.color }}
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
                    className="inline-flex min-h-[44px] items-center gap-1 text-[12.5px] font-bold transition hover:underline"
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

      {/* ============================================================ 06 · 探索 64 型人格 */}
      <section id="types" className="section-lazy mt-16 scroll-mt-24">
        <h2 className="section-title">探索 64 型人格</h2>
        <p className="section-sub">按阵营、基础型、完整代码或名称筛选。默认先看一小部分，需要时再展开。</p>

        <TypeMatrix items={matrixItems} baseOptions={baseOptions} />
      </section>

      {/* ============================================================ 07 · 人格结果示例 */}
      <section id="sample" className="section-lazy mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">人格结果示例</h2>
            <p className="section-sub">答完之后，你会拿到这样一份结构：型别、六维雷达、稀有度，以及优势与成长方向。</p>
          </div>
          <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-mute">
            演示数据 · 示例 INFJ-A-O
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="card flex flex-col p-4">
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
              <span className="text-[11px] font-medium text-ink-mute">
                {per1000Text(PRIOR_TABLE.byCode[sample.code])}
              </span>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">{sample.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {sample.keywords.slice(0, 4).map((k) => (
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

          <div className="card p-4">
            <div>
              <p className="text-[12px] font-bold text-navy">优势</p>
              <ul className="mt-1.5 space-y-1">
                {sample.strengths.slice(0, 3).map((s) => (
                  <li key={s} className="flex gap-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3">
              <p className="text-[12px] font-bold text-navy">盲区</p>
              <ul className="mt-1.5 space-y-1">
                {sample.blindspots.slice(0, 3).map((s) => (
                  <li key={s} className="flex gap-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3">
              <p className="text-[12px] font-bold text-navy">成长方向</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">{sample.growth}</p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
          以上为演示数据，用来展示结果页的信息结构，不是真实用户样本。你的结果由你的答题数据在本机现算，不会上传服务器。
        </p>
      </section>

      {/* ============================================================ 08 · 稀有度探索 */}
      <section id="rarity" className="section-lazy mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">稀有度探索</h2>
            <p className="section-sub">档位按 64 型内部排名分桶，同档型别共享一层。移到某一层，看看这一档住着谁。</p>
          </div>
          <Link href="/rank" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy hover:underline">
            完整稀有度榜
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

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

        <p className="mt-3 max-w-[46em] text-[11px] leading-relaxed text-ink-mute">
          稀有度是按六维独立先验相乘得到的理论概率，不是真实用户样本统计；站点目前没有收集答题数据，真实分布需要上线采样后才能校准。
          例：{rarest[0].type.name}（{rarest[0].code}）{per1000Text(rarest[0])}。
        </p>
      </section>

      {/* ============================================================ 09 · FAQ */}
      <Faq />

      {/* ============================================================ 10 · 最终 CTA */}
      <section id="final-cta" className="mt-16 rounded-panel bg-navy px-6 py-10 text-center sm:px-10">
        <h2 className="text-[24px] font-black tracking-tight text-white sm:text-[30px]">认识自己，是探索世界的开始。</h2>
        <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-white/85">
          开始发现你的独特人格。结果只用于娱乐与自我探索，人格是流动的，这个结果不该定义你。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <StartButtons onDark />
        </div>
      </section>

      <DisclaimerBar className="mt-8" variant="compact" />
    </div>
  );
}
