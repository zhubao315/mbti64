import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Ruler, ChartLine, CaretRight } from "@phosphor-icons/react/dist/ssr";
import RarityBadge from "@/components/RarityBadge";
import DisclaimerBar from "@/components/DisclaimerBar";
import TypeVariantTabs from "@/components/TypeVariantTabs";
import TypeLetterRow from "@/components/TypeLetterRow";
import TypeQuote from "@/components/TypeQuote";
import TypeAnalysis from "@/components/TypeAnalysis";
import TypeRarityBar from "@/components/TypeRarityBar";
import TypeShareButton from "@/components/TypeShareButton";
import RarityPyramid from "@/components/RarityPyramid";
import LifecycleCompass from "@/components/LifecycleCompass";
import MirrorMentorCard from "@/components/MirrorMentorCard";
import NeuroStackCard from "@/components/NeuroStackCard";
import ChinaSliceCard from "@/components/ChinaSliceCard";
import DeliberatePracticeCard from "@/components/DeliberatePracticeCard";
import TypeSubNav from "@/components/profile/TypeSubNav";
import BookChapterCard from "@/components/BookChapterCard";
import { GROUP_META } from "@/data/schema";
import { TYPE_CODES, getType, isKnownType, TYPE_BY_CODE } from "@/data/types64";
import { getBaseProfile } from "@/data/typeProfiles";
import { PRIOR_TABLE, beatText, per1000Text, rankText, rarityPyramid } from "@/lib/rarity";
import { similarTypes, complementaryTypes } from "@/lib/match";
import { idealResult } from "@/lib/ideal";
import { SITE_NAME, absoluteUrl, withBasePath } from "@/lib/site";
import bookEnriched from "@/data/bookEnriched.json";

/**
 * 型别详情页
 *
 * 固定模板：
 * 1. 头图横幅：角色插画 + 族群色带 + 后缀 tab
 * 2. 四字母逐词释义行
 * 3. 中文经典引语
 * 4. 长文解读 5 节（精神底色 → 优势 → 盲点 → 关系 → 反差萌）
 * 5. 相近 3 型 / 互补 3 型
 * 6. 稀有度条 + 同档其他型
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
      // OG 图为预生成静态 PNG（next/og 在 Windows 构建机上无法运行，见 README）
      images: [{ url: absoluteUrl(`/og/${type.code}.png`), width: 1200, height: 630 }],
      type: "article",
    },
  };
}

export default function TypePage({ params }: { params: { code: string } }) {
  if (!isKnownType(params.code)) notFound();

  const type = getType(params.code);
  const profile = getBaseProfile(type.code);
  const rarity = PRIOR_TABLE.byCode[type.code];
  const group = GROUP_META[type.group];
  const ideal = idealResult(type.code);
  // 相似 / 互补型在 page 里只需要 code 列表，渲染用客户端组件 MatchList。
  // Collecting page data 阶段不能 import client 组件的 server bundle。
  const similarCodes = similarTypes(ideal, 3).map((r) => r.type.code);
  const complementCodes = complementaryTypes(ideal, 3).map((r) => r.type.code);

  // 同档其他型（不含自己）
  const tierPeers = rarity
    ? (rarityPyramid(PRIOR_TABLE).find((l) => l.tier.key === rarity.tier.key)?.codes ?? [])
        .filter((c) => c !== rarity.code)
        .map((c) => PRIOR_TABLE.byCode[c])
        .filter(Boolean)
    : [];

  // 书稿深度数据（16 原型图鉴卷）
  const bookData = (bookEnriched as unknown as { types: Record<string, import("@/data/bookEnriched").BookTypeData> }).types[type.base] ?? null;
  // 编码形如 INFJ-A-O：后缀是第 2、3 段，必须拼回 "A-O"
  const currentSuffix = type.code.split("-").slice(1).join("-") || null;

  // 罗盘是客户端组件：只传渲染字段，避免把四段整章正文序列化到浏览器
  const compassStage = bookData
    ? Object.fromEntries(
        Object.entries(bookData.spiralStage).map(([suffix, v]) => {
          const { body, ...rest } = v;
          void body;
          return [suffix, rest];
        }),
      )
    : {};

  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${type.name} ${type.code} · ${SITE_NAME}`,
    url: absoluteUrl(`/type/${type.code}/`),
    description: type.description.slice(0, 150),
    inLanguage: "zh-CN",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    mainEntity: {
      "@type": "DefinedTerm",
      name: type.name,
      termCode: type.code,
      inDefinedTermSet: { "@type": "DefinedTermSet", name: "MBTI64 64 型人格体系" },
    },
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex flex-wrap items-center gap-1 text-[11.5px] text-ink-mute">
        <Link href="/" className="inline-flex min-h-[44px] items-center px-1 hover:text-navy">
          首页
        </Link>
        <CaretRight size={12} aria-hidden />
        <Link href={`/rank#${type.group}`} className="inline-flex min-h-[44px] items-center px-1 hover:text-navy">
          {group.cn}
        </Link>
        <CaretRight size={12} aria-hidden />
        <span className="font-semibold text-ink-soft">{type.name}</span>
      </nav>

      {/* ---------------------------------------------------------- 1. 头图横幅 */}
      <section
        className="relative mt-3 overflow-hidden rounded-panel border border-brand-border"
        style={{ background: group.soft }}
      >
        <div className="grid items-center gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* 左：角色插画 */}
          <div className="flex justify-center md:justify-start">
            <div className="relative aspect-[3/4] w-[180px] shrink-0 overflow-hidden rounded-[12px] border border-line bg-white shadow-card sm:w-[210px] md:w-[240px]">
              <img
                src={withBasePath(`/assets/portraits-light/hero-480x640/${type.code}-hero-480x640.webp`)}
                srcSet={`${withBasePath(`/assets/portraits-light/hero-480x640/${type.code}-hero-480x640.webp`)} 480w, ${withBasePath(`/assets/portraits-light/hero-1200x1600/${type.code}-hero-1200x1600.webp`)} 1200w`}
                sizes="(max-width: 768px) 240px, 240px"
                alt={`${type.name} 角色插画`}
                width={1200}
                height={1600}
                fetchPriority="high"
                decoding="sync"
                className="portrait-blob"
              />
            </div>
          </div>

          {/* 右：型别信息 + CTA */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ background: group.soft, color: group.text }}
              >
                {group.cn}
              </span>
              {rarity && <RarityBadge tier={rarity.tier} size="sm" />}
            </div>

            <p className="mt-3 font-mono text-[12px] font-bold tracking-[0.16em] text-navy">{type.code}</p>
            <h1 className="mt-1 text-[28px] font-black leading-[1.1] tracking-tight text-navy sm:text-[36px]">
              {type.name}
            </h1>
            <p className="mt-1 text-[12px] font-medium tracking-[0.1em] text-ink-mute">{profile.englishName}</p>
            <p className="mt-3 max-w-[28em] text-[14px] leading-[1.85] text-ink-soft sm:text-[15px]">{type.tagline}</p>

            {rarity && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-ink-soft">
                <span>{per1000Text(rarity)}</span>
                <span aria-hidden className="h-3 w-px bg-navy/15" />
                <span>{rankText(rarity)}</span>
                <span aria-hidden className="h-3 w-px bg-navy/15" />
                <span>{beatText(rarity)}</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {type.keywords.slice(0, 6).map((k) => (
                <span key={k} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-mute ring-1 ring-line">
                  {k}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/test" className="btn-primary !px-5 !py-2.5 !text-[14px]">
                测测我是不是这一型
                <ArrowRight size={15} aria-hidden />
              </Link>
              <TypeShareButton url={absoluteUrl(`/type/${type.code}`)} />
            </div>
          </div>
        </div>

        {/* 族群色条 */}
        <div aria-hidden className="h-1" style={{ background: group.color }} />
      </section>

      {/* ---------------------------------------------------------- 移动端吸顶锚点导航 */}
      <TypeSubNav
        items={[
          { id: "sec-overview", label: "概览" },
          { id: "sec-analysis", label: "深度解读" },
          ...(bookData
            ? [
                { id: "sec-compass", label: "四态罗盘" },
                { id: "sec-slices", label: "生存切片" },
                { id: "sec-mentor", label: "镜像导师" },
                { id: "sec-practice", label: "刻意练习" },
              ]
            : []),
          { id: "sec-relations", label: "相似互补" },
        ]}
      />

      {/* ---------------------------------------------------------- 后缀 tab */}
      <section className="mt-5">
        <TypeVariantTabs code={type.code} />
      </section>

      {/* ---------------------------------------------------------- 2. 四字母释义 */}
      <section className="mt-6" id="sec-overview">
        <TypeLetterRow type={type} />
      </section>

      {/* ---------------------------------------------------------- 3. 中文引语 */}
      <section className="mt-8">
        <TypeQuote type={type} />
      </section>

      {/* ---------------------------------------------------------- 4. 长文解读 */}
      <section className="section-lazy mt-10" id="sec-analysis">
        <div className="mb-6 flex items-center gap-2">
          <Ruler aria-hidden size={15} className="text-navy" />
          <h2 className="text-[18px] font-bold tracking-tight text-navy sm:text-[20px]">深入了解「{type.name}」</h2>
        </div>
        <TypeAnalysis type={type} />
      </section>

      {/* ---------------------------------------------------------- 4.5 相处与成长档案 */}
      <section className="section-lazy mt-10">
        <div className="mb-4">
          <h2 className="text-[18px] font-bold tracking-tight text-navy sm:text-[20px]">相处与成长档案</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
            以下是对同一类倾向常见表现的观察性描述，不是对你的定义；换场景、换阶段，表现都可能不同。
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {profile.traits.map((t) => (
            <span key={t} className="rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-mute">
              {t}
            </span>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <h3 className="text-[14.5px] font-bold tracking-tight text-navy">沟通方式</h3>
            <p className="mt-2 text-[13px] leading-[1.85] text-ink-soft">{profile.communication}</p>
          </div>
          <div className="card p-5 sm:p-6">
            <h3 className="text-[14.5px] font-bold tracking-tight text-navy">关系里的样子</h3>
            <p className="mt-2 text-[13px] leading-[1.85] text-ink-soft">{profile.relationship}</p>
          </div>
          <div className="card p-5 sm:p-6">
            <h3 className="text-[14.5px] font-bold tracking-tight text-navy">压力下的反应</h3>
            <p className="mt-2 text-[13px] leading-[1.85] text-ink-soft">{profile.stressResponse}</p>
          </div>
          <div className="card p-5 sm:p-6">
            <h3 className="text-[14.5px] font-bold tracking-tight text-navy">成长建议</h3>
            <ol className="mt-2 space-y-1.5 text-[13px] leading-[1.8] text-ink-soft">
              {profile.growthAdvice.map((g, i) => (
                <li key={g} className="flex gap-2">
                  <span aria-hidden className="font-mono text-[11px] font-bold text-navy/60">{String(i + 1).padStart(2, "0")}</span>
                  <span>{g}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="card mt-4 p-5 sm:p-6">
          <h3 className="text-[14.5px] font-bold tracking-tight text-navy">留给自己反思的三个问题</h3>
          <ul className="mt-2 grid gap-2 text-[13px] leading-[1.8] text-ink-soft sm:grid-cols-3">
            {profile.reflectionQuestions.map((q) => (
              <li key={q} className="rounded-[10px] border border-line bg-white px-3 py-2.5">
                {q}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- 5. 书稿深度组件
          阅读路径：我是谁 → 我如何运作 → 我可以如何变化 → 在哪些场景 →
                    向谁学习 → 如何行动 → 去哪里继续深读 */}
      {bookData && (
        <>
          <div id="sec-compass">
            <LifecycleCompass base={type.base} spiralStage={compassStage} currentSuffix={currentSuffix} />
          </div>
          <NeuroStackCard neuroBase={bookData.neuroBase} base={type.base} />
          <div id="sec-slices">
            <ChinaSliceCard
              chinaSlices={bookData.chinaSlices}
              intimacyContract={bookData.intimacyContract}
              currentSuffix={currentSuffix}
            />
          </div>
          <div id="sec-mentor">
            <MirrorMentorCard mentor={bookData.mirrorMentor} base={type.base} currentSuffix={currentSuffix} />
          </div>
          <div id="sec-practice">
            <DeliberatePracticeCard practice={bookData.deliberatePractice} />
          </div>
          <BookChapterCard
            data={{
              bookChapter: bookData.bookChapter,
              cn: bookData.cn,
              // 只带当前后缀的预览，不把四态整章正文序列化进 RSC payload
              spiralStage: Object.fromEntries(
                Object.entries(bookData.spiralStage).map(([s, v]) => [
                  s,
                  { label: v.label, bodyPreview: v.bodyPreview },
                ]),
              ),
            }}
            currentSuffix={currentSuffix}
          />
        </>
      )}

      {/* ---------------------------------------------------------- 6. 相近 / 互补 */}
      {/* 双人合盘入口 */}
      <section className="section-lazy mt-10">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-bold tracking-tight text-navy">双人合盘实验室</h3>
            <p className="text-[11.5px] text-ink-mute">把你和对方的编码放在一起看</p>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            输入两个人的 64 型编码，看看你们在六个维度上怎么撞、怎么合，
            以及那些没说出口的话。全部计算在你的浏览器里完成，不上传任何数据。
          </p>
          <Link
            href={`/compare?a=${type.code}`}
            className="btn-ghost mt-3 inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[13px]"
          >
            用 {type.code} 开一局
          </Link>
        </div>
      </section>

      <section className="section-lazy mt-10 grid gap-4 md:grid-cols-2" id="sec-relations">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ChartLine aria-hidden size={15} className="text-navy" />
            <h3 className="text-[15px] font-bold tracking-tight text-navy">和你最像的 3 型</h3>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-mute">六维倾向距离最近，通常只在后缀上不同。</p>
          <ul className="mt-3 space-y-1.5">
            {similarCodes.map((c) => {
              const t = TYPE_BY_CODE[c];
              const g = GROUP_META[t.group];
              return (
                <li key={c}>
                  <Link
                    href={`/type/${c}`}
                    className="group flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition hover:bg-wash"
                  >
                    <span
                      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[8px] border"
                      style={{ borderColor: "#E8E8E8", background: g.soft }}
                    >
                      <img
                        src={withBasePath(`/assets/portraits-light/thumb-512/${c}-thumb-512.webp`)}
                        alt={`${t.name} 角色头像`}
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="portrait-blob"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-soft">{t.name}</span>
                    <span className="font-mono text-[10.5px] text-ink-mute">{c}</span>
                    <ArrowRight size={11} aria-hidden className="shrink-0 text-ink-mute opacity-0 transition group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ChartLine aria-hidden size={15} className="text-navy" />
            <h3 className="text-[15px] font-bold tracking-tight text-navy">最能补你盲区的 3 型</h3>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-mute">倾向几乎镜像，沟通成本高但互补性最强。</p>
          <ul className="mt-3 space-y-1.5">
            {complementCodes.map((c) => {
              const t = TYPE_BY_CODE[c];
              const g = GROUP_META[t.group];
              return (
                <li key={c}>
                  <Link
                    href={`/type/${c}`}
                    className="group flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition hover:bg-wash"
                  >
                    <span
                      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[8px] border"
                      style={{ borderColor: "#E8E8E8", background: g.soft }}
                    >
                      <img
                        src={withBasePath(`/assets/portraits-light/thumb-512/${c}-thumb-512.webp`)}
                        alt={`${t.name} 角色头像`}
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="portrait-blob"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-soft">{t.name}</span>
                    <span className="font-mono text-[10.5px] text-ink-mute">{c}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- 7. 稀有度条 */}
      <section className="section-lazy mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {rarity && <TypeRarityBar current={rarity} peers={tierPeers} />}
        <div className="card p-5 sm:p-6">
          <h3 className="text-[15px] font-bold tracking-tight text-navy">你在金字塔里的位置</h3>
          <p className="mt-1 text-[11.5px] text-ink-mute">档位为 64 型内部相对排名，概率为六维先验估算。</p>
          <div className="mt-3">
            <RarityPyramid table={PRIOR_TABLE} current={rarity} compact />
          </div>
          <Link href="/rank" className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[12px] font-semibold text-navy hover:underline">
            看完整榜单
            <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      </section>

      <DisclaimerBar className="mt-10" variant="compact" />
    </div>
  );
}
