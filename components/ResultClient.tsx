"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Brain, Compass, Copy, Leaf, Lock, PuzzlePiece, Shield } from "@phosphor-icons/react";
import BrandLogo from "@/components/BrandLogo";
import RarityBadge from "@/components/RarityBadge";
import DisclaimerBar from "@/components/DisclaimerBar";
import PracticeCheckin from "@/components/profile/PracticeCheckin";
import { DIMS, DIM_ORDER, GROUP_META } from "@/data/schema";
import { getType } from "@/data/types64";
import { getBaseProfile } from "@/data/typeProfiles";
import { PRIOR_TABLE, beatText, per1000Text, rankText, rarityPyramid } from "@/lib/rarity";
import { withBasePath } from "@/lib/site";
import { complementaryTypes, sameGroupTypes, similarTypes } from "@/lib/match";
import { recommendPractice } from "@/lib/practice-recommend";
import { calculateConfidenceScore } from "@/lib/answer-checks";
import { detectBorderlineArchetypes, dimensionReading } from "@/lib/scoring";
import { readAnswerQuality, type AnswerQuality } from "@/lib/quality-store";
import { useNearViewport } from "@/lib/use-lazy-mount";
import { STRENGTH_LABEL } from "@/lib/scoring";
import { computeResult, readResultSnapshot, useHydrated, useQuizStore } from "@/lib/store";
import { cn, hexA } from "@/lib/utils";

const RadarChart = dynamic(() => import("@/components/RadarChart"), {
  ssr: false,
  loading: () => <div className="mx-auto h-[340px] w-[340px] animate-pulse rounded-full bg-wash" />,
});
// 结果页的重型模块全部改为按需加载：
// 它们都在首屏之下，静态打进首屏会让 Lighthouse 的 mainthread 预算超支。
const RarityPyramid = dynamic(() => import("@/components/RarityPyramid"), {
  ssr: false,
  loading: () => <div className="h-[220px] w-full animate-pulse rounded-[10px] bg-wash" />,
});
const InterestCards = dynamic(() => import("@/components/InterestCards"), {
  ssr: false,
  loading: () => <div className="h-[180px] w-full animate-pulse rounded-[10px] bg-wash" />,
});
const Confetti = dynamic(() => import("@/components/Confetti"), { ssr: false });
const TypeCard = dynamic(() => import("@/components/TypeCard"), {
  ssr: false,
  loading: () => <div className="h-[120px] w-full animate-pulse rounded-[10px] bg-wash" />,
});
const GrowthPlan = dynamic(() => import("@/components/profile/GrowthPlan"), {
  ssr: false,
  loading: () => <div className="h-[160px] w-full animate-pulse rounded-[10px] bg-wash" />,
});
const RelationSection = dynamic(() => import("@/components/profile/RelationSection"), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full animate-pulse rounded-[10px] bg-wash" />,
});
// 书稿深度内容：数据按基础型运行时取（public/data/book/<BASE>.json），
// 组件本身也按需加载，整块不进结果页首屏包。
const BookDepthSection = dynamic(() => import("@/components/profile/BookDepthSection"), {
  ssr: false,
  loading: () => (
    <div className="section-lazy mt-4 h-[180px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]" />
  ),
});
const BookDeepSection = dynamic(() => import("@/components/profile/BookDeepSection"), {
  ssr: false,
  loading: () => (
    <div className="mt-4 h-[220px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]" />
  ),
});
const PracticeLab = dynamic(() => import("@/components/profile/PracticeLab"), {
  ssr: false,
  loading: () => (
    <div className="mt-4 h-[160px] w-full animate-pulse rounded-[var(--r-md)] bg-[var(--bg-elev)]" />
  ),
});
const QualityPanel = dynamic(() => import("@/components/profile/QualityPanel"), {
  ssr: false,
  loading: () => (
    <div className="section-lazy mt-4 h-[120px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]" />
  ),
});
const SharePoster = dynamic(() => import("@/components/SharePoster"), {
  ssr: false,
  loading: () => null,
});
const PaywallModal = dynamic(() => import("@/components/PaywallModal"), {
  ssr: false,
  loading: () => null,
});

const GROUP_ICON = {
  analyst: Brain,
  diplomat: Leaf,
  guardian: Shield,
  adventurer: Compass,
} as const;

/**
 * 结果页客户端
 *
 * 免费区（3 屏）：型别卡 → 六维雷达 → 稀有度金字塔
 * 付费区（Demo：本地解锁）：优势 / 盲区 / 成长路径 / 五张主题卡
 *
 * 为什么把「相近 & 互补」放在免费区：它是分享与二跳的主要驱动力
 * （用户会点进朋友的型别页），锁住它反而降低传播。
 */
export default function ResultClient() {
  const hydrated = useHydrated();
  const answers = useQuizStore((s) => s.answers);
  const mode = useQuizStore((s) => s.mode);
  const unlocked = useQuizStore((s) => s.unlocked);
  const unlock = useQuizStore((s) => s.unlock);
  const reset = useQuizStore((s) => s.reset);

  /**
   * 书稿深度区块的挂载闸门：
   * 这两块内容在首屏之下，用 IntersectionObserver 等用户快滚到时才挂载，
   * 免得动态 chunk 与 20KB JSON 和 LCP 图片抢带宽（实测能省回约 250ms）。
   */
  const bookGate = useNearViewport<HTMLDivElement>();
  const deepGate = useNearViewport<HTMLDivElement>();

  /** 作答质量快照：答题完成时落盘，这里读回来算清晰度指数 */
  const [quality, setQuality] = useState<AnswerQuality | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * 结果来源优先级：
   * 1. store 里还有 answers（本次会话刚答完）
   * 2. 独立结果快照 p64:result:v1（答题完成后进度已清除，刷新结果页仍可读）
   */
  const result = useMemo(() => {
    const live = computeResult({ answers, mode });
    if (live.complete) return live;
    const snap = readResultSnapshot();
    if (snap && snap.complete) return snap;
    return live;
  }, [answers, mode]);
  const type = useMemo(() => getType(result.code), [result.code]);
  const profile = useMemo(() => getBaseProfile(type.code), [type.code]);
  const rarity = PRIOR_TABLE.byCode[result.code] ?? PRIOR_TABLE.ranked[0];
  const group = GROUP_META[result.group];

  const copyCode = () => {
    const text = `MBTI64 · ${result.displayCode} ${type.name} · ${profile.englishName}`;
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => window.prompt("复制下面这行：", text));
    } else {
      window.prompt("复制下面这行：", text);
    }
  };

  /** 当前亚型后缀（如 "A-O"）：书稿罗盘与镜像导师按它定位 */
  const currentSuffix = useMemo(() => result.code.split("-").slice(1).join("-"), [result.code]);
  /** 展示用后缀（摇摆位带 ?，如 "?-O"） */
  const displaySuffix = useMemo(
    () => result.displayCode.split("-").slice(1).join("-"),
    [result.displayCode],
  );
  /** 最急需调节的那一格微动作 */
  const practiceRec = useMemo(
    () => (result.complete ? recommendPractice({ AC: result.dims.AC, OH: result.dims.OH }) : null),
    [result],
  );
  /**
   * 临界副型：前四维读数接近中位时，指出「你身上也带着隔壁那型」。
   * 只做提示，不改变 scoreTest 的主编码。
   */
  const borderlines = useMemo(
    () => (result.complete ? detectBorderlineArchetypes(result, 2) : []),
    [result],
  );
  /** 本次作答清晰度指数（只作自我参照） */
  const confidence = useMemo(() => {
    if (!quality) return null;
    const fastRatio = quality.total > 0 ? quality.fastCount / quality.total : 0;
    return calculateConfidenceScore(result, quality.issues, quality.straightlining, fastRatio);
  }, [quality, result]);
  const similar = useMemo(() => (result.complete ? similarTypes(result, 3) : []), [result]);
  const complement = useMemo(() => (result.complete ? complementaryTypes(result, 3) : []), [result]);
  const groupPeers = useMemo(() => (result.complete ? sameGroupTypes(result, 2) : []), [result]);

  useEffect(() => {
    if (result.complete) setBurst(true);
  }, [result.complete]);

  // 作答质量快照要在水合后才读（localStorage 只有客户端可用）
  useEffect(() => {
    if (!hydrated) return;
    setQuality(readAnswerQuality());
  }, [hydrated]);

  if (!hydrated) {
    // 骨架必须与真实报告保持同样的外框与页眉行，
    // 否则水合完成时整页内容会向下顶出，产生大幅 CLS。
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:pb-24 sm:pt-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <BrandLogo size={24} />
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-mute">Personality report</p>
        </div>
        <div className="card h-[420px] w-full animate-pulse" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card h-72 animate-pulse" />
          <div className="card h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!result.complete) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8">
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full border border-line bg-wash">
            <PuzzlePiece size={24} className="text-ink-mute" />
          </span>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">还没有完整的结果</h1>
          <p className="text-[13px] leading-relaxed text-ink-mute">
            已答 {result.answeredCount} / {result.totalCount} 题。答完才能算出你的 64 型与稀有度排名。
          </p>
          <Link href="/test" className="btn-primary w-full">
            继续答题
          </Link>
        </div>
      </div>
    );
  }

  const locked = !unlocked;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:pb-24 sm:pt-10">
      {burst && <Confetti count={36} duration={2400} />}

      <div className="mb-3 flex items-center justify-between gap-3">
        <BrandLogo size={24} />
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-mute">Personality report</p>
      </div>

      {/* ---------------------------------------------------------- 1. 主卡 */}
      {/* 主卡用 CSS 动画而非 framer-motion：
          结果页首屏预算紧张，motion 库会把 100KB+ 打进关键路径。 */}
      <section className="card relative overflow-hidden p-5 sm:p-8 motion-safe:animate-[card-rise_.24s_ease-out]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: group.color }} />

        <div className="relative flex flex-col items-center gap-6 pt-1 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-[180px] shrink-0 overflow-hidden rounded-[12px] border border-line bg-wash sm:w-[210px]">
            <img
              src={withBasePath(`/assets/portraits-light/thumb-512/${type.code}-thumb-512.webp`)}
              alt={`${type.name} 角色插画`}
              width={512}
              height={512}
              loading="eager"
              decoding="async"
              className="portrait-blob"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: group.soft, color: group.text }}
              >
                <GroupGlyph group={result.group} />
                {group.cn}
              </span>
              <RarityBadge tier={rarity.tier} size="md" />
              {result.swing.AC && <SwingChip name="决策姿态" />}
              {result.swing.OH && <SwingChip name="变化策略" />}
            </div>

            <p className="mt-3 font-mono text-[13px] font-bold tracking-[0.14em]" style={{ color: group.text }}>
              {result.displayCode}
            </p>
            <h1 className="mt-1 text-[26px] leading-tight font-black tracking-tight text-navy sm:text-[34px]">
              {type.name}
            </h1>
            <p className="mt-0.5 text-[12px] font-medium tracking-[0.12em] text-ink-mute">{profile.englishName}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{type.tagline}</p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:justify-start">
              <span className="text-[12.5px] font-semibold text-ink-soft">{per1000Text(rarity)}</span>
              <span aria-hidden className="h-3 w-px bg-navy/15" />
              <span className="text-[12.5px] font-semibold text-ink-soft">{rankText(rarity)}</span>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {type.keywords.slice(0, 5).map((k) => (
                <span key={k} className="rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-mute">
                  {k}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button type="button" onClick={() => setShareOpen(true)} className="btn-primary !px-5 !py-2.5 !text-[14px]">
                分享我的结果
              </button>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                className="btn-ghost !px-5 !py-2.5 !text-[14px]"
                style={unlocked ? { color: group.text } : undefined}
              >
                {unlocked ? "主题指南卡已解锁" : "解锁主题指南卡"}
              </button>
              <Link href="/rank" prefetch={false} className="btn-ghost !px-5 !py-2.5 !text-[14px]">
                看稀有度榜单
              </Link>
              <button type="button" onClick={copyCode} className="btn-ghost !px-5 !py-2.5 !text-[14px]">
                <Copy size={14} aria-hidden /> {copied ? "已复制" : "复制代码"}
              </button>
              <Link href={`/type/${type.code}`} prefetch={false} className="btn-ghost !px-5 !py-2.5 !text-[14px]">
                查看人格详情
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------- 1.5 临界副型 + 作答清晰度指数 */}
      <QualityPanel borderlines={borderlines} confidence={confidence} />

      {/* ---------------------------------------------------------- 2. 雷达 + 六维 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Section title="六维倾向" sub="图形面积 = 倾向的清晰度，不代表能力强弱">
          <RadarChart dims={result.dims} size={340} color="#0F2747" labelColor="#172B45" className="mx-auto max-w-full" />
        </Section>

        <Section title="逐维读数" sub="< 55 模糊 · 55–70 较强 · > 70 显著">
          <ul className="space-y-2.5">
            {DIM_ORDER.map((k) => {
              const d = result.dims[k];
              const meta = DIMS[k];
              const aWins = d.percentA >= 50;
              return (
                <li key={k} className="rounded-[10px] border border-line bg-wash px-3.5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-bold text-navy">{meta.name}</span>
                    <span className="text-[11.5px] font-semibold text-ink-mute">
                      {STRENGTH_LABEL[d.strength]} · {d.preferred}%
                    </span>
                  </div>

                  <div className="mt-2 flex h-2 overflow-hidden rounded-full border border-line bg-white">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${d.percentA}%`,
                        background: aWins ? hexA(group.color, 0.85) : hexA("#8B85A0", 0.35),
                      }}
                    />
                    <div
                      className="h-full transition-all duration-700"
                      style={{ width: `${d.percentB}%`, background: aWins ? hexA("#8B85A0", 0.35) : hexA(group.color, 0.85) }}
                    />
                  </div>

                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">
                    {dimensionReading(result.dims, k)}
                  </p>

                  <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
                    <span className={aWins ? "text-ink-soft" : "text-ink-mute"}>
                      {meta.poleAName} {d.percentA}%
                    </span>
                    <span className={!aWins ? "text-ink-soft" : "text-ink-mute"}>
                      {d.percentB}% {meta.poleBName}
                    </span>
                  </div>

                  {(k === "AC" || k === "OH") && d.binary && (
                    <p className="mt-1 text-[10.5px] text-ink-mute">
                      二选一投票 {d.binary.a} : {d.binary.b}（需 {d.binary.need} 票定字母）
                      {d.swing && " · 票数不足，标为摇摆型"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      {/* ---------------------------------------------------------- 3. 稀有度 */}
      <Section
        className="mt-4"
        title="你在金字塔的哪一层"
        sub={`${rarity.tier.name} · ${per1000Text(rarity)} · ${beatText(rarity)}`}
        action={
          <Link href="/rank" prefetch={false} className="text-[12px] font-semibold text-navy hover:underline">
            完整榜单 →
          </Link>
        }
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-center">
          <RarityPyramid table={PRIOR_TABLE} current={rarity} compact />
          <div>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              64 型里，你排在第 <b className="text-navy">{rarity.rankLabel}</b> 稀有
              （{rarity.rankSize > 1 ? `并列 ${rarity.rankSize} 型` : "独占一名"}），
              每 1000 人里大约有 <b className="text-navy">{rarity.per1000}</b> 人和你同型。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-mute">
              档位按先验概率排名分桶（最稀有的 {rarityPyramid(PRIOR_TABLE)[0].count} 型为「万里挑一」），
              不是绝对统计结论；六维联合概率本身只能落在 0.6%–3.2% 区间，所以「稀有」是相对 64 型内部而言的。
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rarityPyramid(PRIOR_TABLE).map((l) => (
                <span
                  key={l.tier.key}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    l.tier.key === rarity.tier.key && "ring-1 ring-inset",
                  )}
                  style={{
                    color: l.tier.text,
                    background: hexA(l.tier.color, l.tier.key === rarity.tier.key ? 0.18 : 0.08),
                    ...(l.tier.key === rarity.tier.key ? { boxShadow: `inset 0 0 0 1px ${hexA(l.tier.color, 0.5)}` } : {}),
                  }}
                >
                  {l.tier.name} · {l.count} 型
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------- 2.5 书稿深度内容（免费区） */}
      {/* 四态双环罗盘 + 功能栈认知映射：来自《千分之一的你》对应基础型的图鉴章 */}
      <div ref={bookGate.ref} className="section-lazy">
        {bookGate.near ? (
          <BookDepthSection
            base={result.base}
            currentSuffix={currentSuffix}
            swingAxes={{ AC: result.swing.AC, OH: result.swing.OH }}
            displaySuffix={displaySuffix}
          />
        ) : (
          <div className="mt-4 h-[180px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]" aria-hidden />
        )}
      </div>

      {/* ---------------------------------------------------------- 3. 人格分析 */}
      <Section className="section-lazy mt-4" title="人格分析" sub="优势、局限、行为表现与成长空间并列呈现">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileBlock title="优势" text={profile.analysis.advantages} />
          <ProfileBlock title="局限" text={profile.analysis.limitations} />
          <ProfileBlock title="行为表现" text={profile.analysis.behavior} />
          <ProfileBlock title="成长空间" text={profile.analysis.growthSpace} />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-mute">
          以上是倾向性描述，不代表能力上限，也不构成任何诊断。人格会随经历与环境变化。
        </p>
      </Section>

      {/* ---------------------------------------------------------- 4. 生活与工作 */}
      <Section className="section-lazy mt-4" title="生活与工作" sub="同一套倾向，在不同场景会有不同表现">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileBlock title="工作方式" text={type.workStyle} />
          <ProfileBlock title="关系中的你" text={profile.relationship} />
          <ProfileBlock title="压力下的反应" text={profile.stressResponse} />
          <ProfileBlock title="沟通风格" text={profile.communication} />
        </div>
      </Section>

      {/* ---------------------------------------------------------- 5. 成长建议 */}
      <Section className="section-lazy mt-4" title="成长建议" sub="3 个方向 · 30 天计划 · 反思问题">
        <GrowthPlan advice={profile.growthAdvice} questions={profile.reflectionQuestions} summary={type.growth} />
        <div className="mt-3">
          <PracticeCheckin
            allowCustom
            actions={{
              c2a: profile.growthAdvice.slice(0, 1),
              a2c: profile.growthAdvice.slice(1, 2),
              o2h: profile.growthAdvice.slice(2, 3),
              h2o: [],
            }}
          />
        </div>

        {/* 书稿第六卷的 30 天行为实验：打卡 + 复盘导出 */}
        <div className="mt-4 rounded-[var(--r-md)] border border-[var(--line)] p-4">
          <h3 className="text-[14px] font-bold tracking-tight text-navy">
            30 天行为实验实验室
          </h3>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
            来自《千分之一的你》第六卷：每天一个具体微动作、一句晚间回顾提问，
            外加 20 组吵架潜台词翻译与职场四象限自检。打卡只存在你的浏览器里。
          </p>
          <PracticeLab />
        </div>
      </Section>

      {/* ---------------------------------------------------------- 6. 人格关系 */}
      <Section className="section-lazy mt-4" title="人格关系" sub="最相似 3 型 · 最互补 3 型 · 差异对比 · 沟通建议">
        <RelationSection
          dims={result.dims}
          myCode={result.code}
          similar={similar}
          complement={complement}
          communication={profile.communication}
          socialGuide={type.socialGuide}
        />

        {/* 双人合盘入口：把链接发给朋友，看看我们合不合 */}
        <div className="mt-3 rounded-[12px] border border-line bg-wash p-4">
          <p className="text-[13px] font-bold text-navy">双人合盘实验室</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            填上对方的 64 型编码，看看你们在六个维度上怎么撞、怎么合，
            以及那些没说出口的话。全部在浏览器里算，不上传任何数据。
          </p>
          <Link
            href={`/compare?a=${result.code}`}
            prefetch={false}
            className="btn-ghost mt-2.5 inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[13px]"
          >
            用我的编码开一局
          </Link>
        </div>
      </Section>

      {/* ---------------------------------------------------------- 主题指南卡（Demo 解锁） */}
      <Section className="section-lazy mt-4" title="四张主题指南卡" sub="恋爱 · 职场 · 副业 · 社交（Demo 解锁项）">
        {!locked ? (
          <InterestCards type={type} />
        ) : (
          <div className="rounded-panel bg-navy p-5 text-center text-white sm:p-6">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] bg-white/10">
              <Lock size={20} weight="bold" className="text-white" aria-hidden />
            </span>
            <p className="mt-2.5 text-[16.5px] font-bold text-white">主题指南卡未解锁</p>
            <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-white/70">
              人格分析、生活与工作、成长建议、人格关系已全部免费开放。解锁仅用于恋爱 / 职场 / 副业 / 社交四张延伸指南卡。
            </p>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="btn mt-4 w-full !bg-white !py-3 !text-[14.5px] !text-navy hover:!bg-navy-soft"
            >
              解锁主题指南卡
            </button>
            <p className="mt-2 text-[10.5px] text-white/60">Demo：点击不会产生任何费用，仅在本地标记</p>
          </div>
        )}
      </Section>

      {/* ------------------------------------------- 书稿实战包（Demo 解锁） */}
      <Section
        className="section-lazy mt-4"
        title="书稿实战包"
        sub="中国式生存切片 · 镜像导师三步实验 · 刻意练习实验室（Demo 解锁项）"
      >
        {!locked ? (
          <div ref={deepGate.ref}>
            {deepGate.near ? (
              <BookDeepSection
                base={result.base}
                currentSuffix={currentSuffix}
                recommended={practiceRec?.direction}
                recommendedReason={practiceRec?.reason}
              />
            ) : (
              <div className="mt-4 h-[220px] w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-elev)]" aria-hidden />
            )}
          </div>
        ) : (
          <div className="rounded-panel bg-navy p-5 text-center text-white sm:p-6">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] bg-white/10">
              <Lock size={20} weight="bold" className="text-white" aria-hidden />
            </span>
            <p className="mt-2.5 text-[16.5px] font-bold text-white">书稿实战包未解锁</p>
            <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-white/70">
              你的四态罗盘与认知功能栈已经免费开放。解锁后追加三个现场级工具：中国式生存切片、
              镜像导师的「借假修真」三步实验、以及按你的六维读数定制的刻意练习实验室。
            </p>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="btn mt-4 w-full !bg-white !py-3 !text-[14.5px] !text-navy hover:!bg-navy-soft"
            >
              解锁书稿实战包
            </button>
            <p className="mt-2 text-[10.5px] text-white/60">Demo：点击不会产生任何费用，仅在本地标记</p>
          </div>
        )}
      </Section>

      {/* ---------------------------------------------------------- 6. 同族 & 操作 */}
      <Section className="section-lazy mt-4" title="你所在族群的其他型" sub={`${group.cn} · 共 16 型`}>
        <div className="grid gap-2 sm:grid-cols-3">
          {[type].concat(groupPeers.map((m) => m.type)).map((t, i) => (
            <TypeCard key={`${t.code}-${i}`} type={t} rarity={PRIOR_TABLE.byCode[t.code]} compact highlight={i === 0} />
          ))}
        </div>
      </Section>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => setShareOpen(true)} className="btn-primary">
          生成分享海报
        </button>
        <Link href="/test" className="btn-ghost" onClick={() => reset()}>
          再测一次
        </Link>
        <Link href="/" className="btn-ghost">
          回到首页
        </Link>
      </div>

      <DisclaimerBar className="mt-6" variant="compact" />

      {/* 移动端常驻分享条：结果页最高频的动作是「截图/分享」，别让用户滚到底部找按钮 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShareOpen(true)} className="btn-primary flex-1 !py-2.5 !text-[14px]">
            分享我的结果
          </button>
          <Link href="/rank" prefetch={false} className="btn-ghost flex-1 !py-2.5 !text-[14px]">
            看榜单
          </Link>
        </div>
      </div>

      {shareOpen && (
        <SharePoster
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          code={type.code}
          displayCode={result.displayCode}
          typeName={type.name}
          group={type.group}
          tagline={type.tagline}
          essence={type.essence}
          keywords={type.keywords}
          dims={result.dims}
          rarity={rarity}
        />
      )}

      {payOpen && (
        <PaywallModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onUnlock={() => {
            unlock();
            setPayOpen(false);
            setBurst(true);
          }}
          lockedCount={4}
          priceLabel="¥ 9.9"
        />
      )}
    </div>
  );
}

function GroupGlyph({ group }: { group: keyof typeof GROUP_ICON }) {
  const Icon = GROUP_ICON[group];
  return <Icon size={13} weight="bold" aria-hidden />;
}

function SwingChip({ name }: { name: string }) {
  return (
    <span
      className="rounded-full border border-line bg-wash px-2.5 py-1 text-[11px] font-bold text-ink-soft"
      title={`${name}维度的二选一票数不足 2/3，因此标为摇摆型`}
    >
      摇摆 · {name}
    </span>
  );
}

function ProfileBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-wash p-3.5">
      <h3 className="text-[13px] font-bold text-navy">{title}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

function Section({
  title,
  sub,
  action,
  className,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card p-4 sm:p-6", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight text-navy sm:text-[17px]">{title}</h2>
          {sub && <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-mute">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
