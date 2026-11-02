import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CharacterArt from "@/components/CharacterArt";
import RarityBadge from "@/components/RarityBadge";
import MatchList from "@/components/MatchList";
import InterestCards from "@/components/InterestCards";
import TypeCard from "@/components/TypeCard";
import DisclaimerBar from "@/components/DisclaimerBar";
import ShareLinkButton from "@/components/ShareLinkButton";
import { DIMS, DIM_ORDER, GROUP_META } from "@/data/schema";
import { TYPE_CODES, getType, isKnownType } from "@/data/types64";
import { PRIOR_TABLE, beatText, per1000Text, rankText, rarityPyramid } from "@/lib/rarity";
import { complementaryTypes, similarTypes } from "@/lib/match";
import { idealResult } from "@/lib/ideal";
import { absoluteUrl } from "@/lib/site";

/**
 * 静态型别页（64 条，构建期全部预渲染）
 *
 * 这是本站的 SEO 主体：每个型别一个独立 URL、独立标题、独立 OG 图。
 * 内容全部来自 data/types64.ts 与 lib/rarity.ts，没有为 SEO 编造统计结论。
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return TYPE_CODES.map((code) => ({ code }));
}

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  const type = getType(params.code);
  const rarity = PRIOR_TABLE.byCode[type.code];
  const desc = `${type.name}（${type.code}）：${type.tagline}。${
    rarity ? `${per1000Text(rarity)}，64 型中第 ${rarity.rankLabel} 稀有。` : ""
  }六维倾向、优势、盲区、恋爱与职场相处方式全解析。`;

  return {
    title: `${type.name} · ${type.code}`,
    description: desc,
    keywords: [type.base, type.name, `${type.code} 人格`, "64型人格", GROUP_META[type.group].cn],
    alternates: { canonical: absoluteUrl(`/type/${type.code}`) },
    openGraph: {
      title: `${type.code} · ${type.name}`,
      description: desc,
      url: absoluteUrl(`/type/${type.code}`),
      type: "article",
    },
  };
}

export default function TypePage({ params }: { params: { code: string } }) {
  if (!isKnownType(params.code)) notFound();

  const type = getType(params.code);
  const rarity = PRIOR_TABLE.byCode[type.code];
  const group = GROUP_META[type.group];
  const ideal = idealResult(type.code);
  const similar = similarTypes(ideal, 3);
  const complement = complementaryTypes(ideal, 3);

  // 同一基础型的 4 种后缀变体
  const variants = TYPE_CODES.filter((c) => c.startsWith(`${type.base}-`)).map((c) => getType(c));

  const selected: Record<string, string> = {
    EI: type.code[0],
    SN: type.code[1],
    TF: type.code[2],
    JP: type.code[3],
    AC: type.ac,
    OH: type.oh,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex flex-wrap items-center gap-1 text-[11.5px] text-ink-mute">
        <Link href="/" className="inline-flex min-h-[34px] items-center px-1 hover:text-violet-deep">
          首页
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/rank#${type.group}`} className="inline-flex min-h-[34px] items-center px-1 hover:text-violet-deep">
          {group.cn}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-ink-soft">{type.name}</span>
      </nav>

      {/* 主卡 */}
      <section className="glass-strong relative mt-3 overflow-hidden p-5 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full blur-3xl"
          style={{ background: `${group.color}33` }}
        />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <CharacterArt group={type.group} ac={type.ac} oh={type.oh} size={190} />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-mute">
                {group.emoji} {group.cn}
              </span>
              {rarity && <RarityBadge tier={rarity.tier} size="md" />}
            </div>

            <p className="mt-3 font-mono text-[13px] font-bold tracking-[0.14em] text-violet-deep">{type.code}</p>
            <h1 className="mt-1 text-[26px] leading-tight font-black tracking-tight text-ink sm:text-[34px]">{type.name}</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{type.tagline}</p>

            {rarity && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:justify-start">
                <span className="text-[12.5px] font-semibold text-ink-soft">{per1000Text(rarity)}</span>
                <span className="h-3 w-px bg-ink/15" />
                <span className="text-[12.5px] font-semibold text-ink-soft">{rankText(rarity)}</span>
                <span className="h-3 w-px bg-ink/15" />
                <span className="text-[12.5px] font-semibold text-ink-soft">{beatText(rarity)}</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {type.keywords.slice(0, 6).map((k) => (
                <span key={k} className="rounded-full bg-white/70 px-2.5 py-1 text-[11.5px] font-medium text-ink-mute">
                  {k}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href="/test" className="btn-primary !px-5 !py-2.5 !text-[14px]">
                测测我是不是这一型
              </Link>
              <ShareLinkButton url={absoluteUrl(`/type/${type.code}`)} />
              <Link href="/rank" className="btn-ghost !px-5 !py-2.5 !text-[14px]">
                看完整榜单
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 六维对照 */}
      <section className="glass mt-4 p-5 sm:p-6">
        <h2 className="text-[17px] font-bold tracking-tight text-ink">六维对照</h2>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">
          下面列出的是这一型最典型的形态（每个维度取满值），不代表所有该型用户的平均分。
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DIM_ORDER.map((k) => {
            const meta = DIMS[k];
            const chosen = selected[k];
            const isA = chosen === meta.poleA;
            const label = isA ? meta.poleAName : meta.poleBName;
            return (
              <li key={k} className="rounded-2xl border border-white/70 bg-white/55 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink-mute">{meta.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ color: group.text, background: `${group.color}1A` }}
                  >
                    {label}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{meta.summary}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 主体叙事 */}
      <section className="glass mt-4 p-5 sm:p-6">
        <h2 className="text-[17px] font-bold tracking-tight text-ink">你是哪一种「{type.base}」</h2>
        <div className="mt-2 space-y-3">
          {type.description.split("\n\n").map((p, i) => (
            <p key={i} className="text-[13.5px] leading-[1.85] text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* 优势 / 盲区 */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="glass p-5 sm:p-6">
          <h2 className="text-[16px] font-bold text-ink">优势</h2>
          <ul className="mt-2.5 space-y-2">
            {type.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-0.5 shrink-0 text-[12px] text-avocado-deep">
                  ✓
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass p-5 sm:p-6">
          <h2 className="text-[16px] font-bold text-ink">盲区</h2>
          <ul className="mt-2.5 space-y-2">
            {type.blindspots.map((s) => (
              <li key={s} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-0.5 shrink-0 text-[12px] text-coral-deep">
                  !
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 成长路径 */}
      <section className="glass mt-4 p-5 sm:p-6">
        <h2 className="text-[16px] font-bold text-ink">成长路径</h2>
        <p className="mt-2 text-[13.5px] leading-[1.85] text-ink-soft">{type.growth}</p>
      </section>

      {/* 主题卡 */}
      <section className="mt-4">
        <h2 className="section-title">关系 / 工作 / 副业 / 社交</h2>
        <p className="section-sub">按这一型的常见模式给建议，不是命运说明书。</p>
        <InterestCards type={type} partners={complement} className="mt-3" />
      </section>

      {/* 相近 / 互补 */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="glass p-5 sm:p-6">
          <h2 className="text-[16px] font-bold text-ink">和你最像的 3 型</h2>
          <p className="mt-1 text-[11.5px] text-ink-mute">六维倾向距离最近，通常只在后缀上不同。</p>
          <MatchList items={similar} kind="similar" className="mt-3" />
        </section>
        <section className="glass p-5 sm:p-6">
          <h2 className="text-[16px] font-bold text-ink">最能补你盲区的 3 型</h2>
          <p className="mt-1 text-[11.5px] text-ink-mute">倾向几乎镜像，沟通成本高但互补性最强。</p>
          <MatchList items={complement} kind="complement" className="mt-3" />
        </section>
      </div>

      {/* 同基础型变体 */}
      <section className="mt-4 glass p-5 sm:p-6">
        <h2 className="text-[16px] font-bold text-ink">同一个「{type.base}」的另外 3 种调性</h2>
        <p className="mt-1 text-[11.5px] text-ink-mute">
          基础型相同，后缀不同：坚定/内省决定压力下的姿态，探索/守成决定你对待变化的方式。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {variants.map((v) => (
            <TypeCard key={v.code} type={v} rarity={PRIOR_TABLE.byCode[v.code]} compact highlight={v.code === type.code} />
          ))}
        </div>
      </section>

      {/* 金字塔尾注 */}
      {rarity && (
        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-mute">
          {type.code} 位于「{rarity.tier.name}」档（第 {rarity.rankLabel} / 共 64 型），
          该档共 {rarityPyramid(PRIOR_TABLE).find((l) => l.tier.key === rarity.tier.key)?.count ?? 0} 种型别。
          档位为相对排名，概率为六维先验估算，均不构成统计结论。
        </p>
      )}

      <DisclaimerBar className="mt-6" variant="compact" />
    </div>
  );
}
