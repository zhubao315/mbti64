"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Check, Compass, Leaf, Lock, PuzzlePiece, Shield, X } from "@phosphor-icons/react";
import BrandLogo from "@/components/BrandLogo";
import RadarChart from "@/components/RadarChart";
import RarityBadge from "@/components/RarityBadge";
import RarityPyramid from "@/components/RarityPyramid";
import MatchList from "@/components/MatchList";
import InterestCards from "@/components/InterestCards";
import SharePoster from "@/components/SharePoster";
import PaywallModal from "@/components/PaywallModal";
import Confetti from "@/components/Confetti";
import DisclaimerBar from "@/components/DisclaimerBar";
import TypeCard from "@/components/TypeCard";
import { DIMS, DIM_ORDER, GROUP_META } from "@/data/schema";
import { getType } from "@/data/types64";
import { PRIOR_TABLE, beatText, per1000Text, rankText, rarityPyramid } from "@/lib/rarity";
import { withBasePath } from "@/lib/site";
import { complementaryTypes, similarTypes } from "@/lib/match";
import { STRENGTH_LABEL } from "@/lib/scoring";
import { computeResult, useHydrated, useQuizStore } from "@/lib/store";
import { cn, hexA } from "@/lib/utils";

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

  const [shareOpen, setShareOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [burst, setBurst] = useState(false);

  const result = useMemo(() => computeResult({ answers, mode }), [answers, mode]);
  const type = useMemo(() => getType(result.code), [result.code]);
  const rarity = PRIOR_TABLE.byCode[result.code] ?? PRIOR_TABLE.ranked[0];
  const group = GROUP_META[result.group];

  const similar = useMemo(() => (result.complete ? similarTypes(result, 3) : []), [result]);
  const complement = useMemo(() => (result.complete ? complementaryTypes(result, 3) : []), [result]);

  useEffect(() => {
    if (result.complete) setBurst(true);
  }, [result.complete]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="card h-56 w-full animate-pulse" />
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
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
        className="card relative overflow-hidden p-5 sm:p-8"
      >
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
              {result.swing.AC && <SwingChip name="自我姿态" />}
              {result.swing.OH && <SwingChip name="变化偏好" />}
            </div>

            <p className="mt-3 font-mono text-[13px] font-bold tracking-[0.14em]" style={{ color: group.text }}>
              {result.displayCode}
            </p>
            <h1 className="mt-1 text-[26px] leading-tight font-black tracking-tight text-navy sm:text-[34px]">
              {type.name}
            </h1>
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
                {unlocked ? "完整报告已解锁" : "解锁完整报告"}
              </button>
              <Link href="/rank" className="btn-ghost !px-5 !py-2.5 !text-[14px]">
                看稀有度榜单
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

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
          <Link href="/rank" className="text-[12px] font-semibold text-navy hover:underline">
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

      {/* ---------------------------------------------------------- 4. 相近 / 互补 */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Section title="和你最像的 3 型" sub="六维倾向距离最近">
          <MatchList items={similar} kind="similar" />
        </Section>
        <Section title="最能补你盲区的 3 型" sub="六维倾向几乎镜像">
          <MatchList items={complement} kind="complement" />
        </Section>
      </div>

      {/* ---------------------------------------------------------- 5. 付费区 */}
      <section className="relative mt-4">
        {/* 锁定态：只露出前 520px，用渐变收尾，避免「一大片模糊墙」把 CTA 冲到屏幕外 */}
        <div
          className={cn("relative", locked && "pointer-events-none max-h-[400px] select-none overflow-hidden")}
          aria-hidden={locked}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="你的优势" sub="在什么场景下最该用">
              <ul className="space-y-2">
                {type.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                    <Check size={13} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-navy" />
                    {s}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="你的盲区" sub="不是缺点，是默认忽略的角度">
              <ul className="space-y-2">
                {type.blindspots.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                    <X size={13} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-ink-mute" />
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section className="mt-4" title="30 天成长路径" sub="一次只改一件事">
            <p className="text-[13px] leading-relaxed text-ink-soft">{type.growth}</p>
            <p className="mt-3 rounded-[10px] border border-line bg-wash p-3.5 text-[12.5px] leading-relaxed text-ink-mute">
              完整版型别解读：{type.description.slice(0, 120)}…
            </p>
          </Section>

          {locked && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-white/85 to-white"
            />
          )}
        </div>

        {/* 主题卡里全是链接：解锁后才渲染，避免 aria-hidden 容器里出现可聚焦元素 */}
        {!locked && (
          <div className="mt-4">
            <InterestCards type={type} partners={complement} />
          </div>
        )}

        {locked && (
          <>
            <div className="relative -mt-12 mx-auto max-w-md px-2">
              <div className="rounded-panel bg-navy p-5 text-center text-white sm:p-6">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] bg-white/10">
                  <Lock size={20} weight="bold" className="text-white" />
                </span>
                <p className="mt-2.5 text-[16.5px] font-bold text-white">完整报告未解锁</p>
                <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-white/70">
                  优势清单、盲区提醒、30 天成长路径，以及恋爱 / 职场 / 副业 / 饭局微信四张指南卡。
                </p>
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="btn mt-4 w-full !bg-white !py-3 !text-[14.5px] !text-navy hover:!bg-navy-soft"
                >
                  解锁完整报告
                </button>
                <p className="mt-2 text-[10.5px] text-white/60">Demo：点击不会产生任何费用，仅在本地标记</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------- 6. 同族 & 操作 */}
      <Section className="mt-4" title="你所在族群的其他型" sub={`${group.cn} · 共 16 种基础型`}>
        <div className="grid gap-2 sm:grid-cols-3">
          {[type].concat(
            similar.map((m) => m.type).slice(0, 2),
          ).map((t, i) => (
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
          <Link href="/rank" className="btn-ghost flex-1 !py-2.5 !text-[14px]">
            看榜单
          </Link>
        </div>
      </div>

      <SharePoster
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        code={type.code}
        typeName={type.name}
        group={type.group}
        tagline={type.tagline}
        essence={type.essence}
        keywords={type.keywords}
        dims={result.dims}
        rarity={rarity}
      />

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
