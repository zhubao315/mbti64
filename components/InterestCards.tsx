"use client";

import { useMemo } from "react";
import type { Type64 } from "@/data/types64";
import { compatibilityLabel, romanticMatches, romanticMirror } from "@/lib/match";
import { Briefcase, FilmStrip, ForkKnife, Heart, Plant } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 五张主题卡：恋爱兼容 / 职场相处 / 副业 / 饭局微信指南 / 名人组合
 *
 * 内容全部来自 data/types64.ts 的型别文案，不额外编造数据。
 * 名人组合必须显式标注「娱乐猜测」——这是平台合规要求，也是不误导用户的底线。
 */

export default function InterestCards({
  type,
  className,
}: {
  type: Type64;
  className?: string;
}) {
  /**
   * 恋爱兼容推荐。
   *
   * 旧实现把「互补盲区型」（六维几乎全反）直接喂给 loveCompatibility，
   * 而 loveCompatibility 的理想距离又取不到（理想化向量的 L1 只有 200 的倍数），
   * 于是整屏都是「35 差异较大」。现在改用 lib/match 的 romanticMatches：
   * 只返回兼容度 ≥ 80 的合拍型，理由由逐维同极 / 异极推导。
   */
  const loveTargets = useMemo(() => romanticMatches(type.code, 3), [type.code]);
  const tensionPartner = useMemo(() => romanticMirror(type.code), [type.code]);

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {/* 1 恋爱兼容 */}
      <Card Icon={Heart} title="恋爱兼容" wide>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{type.loveStyle}</p>
        <div className="mt-3 space-y-1.5">
          {loveTargets.map(({ type: t, score, reason }) => (
            <Link
              key={t.code}
              href={`/type/${t.code}`}
              prefetch={false}
              className="flex min-h-[40px] items-center gap-2 rounded-[8px] border border-line bg-white px-2.5 py-2 transition hover:bg-wash"
              title={reason}
            >
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{t.name}</span>
              <span className="shrink-0 text-[11px] font-bold text-ink tabular-nums">{score}</span>
              <span className="shrink-0 rounded-full border border-line bg-wash px-2 py-0.5 text-[10px] font-semibold text-ink-mute">
                {compatibilityLabel(score)}
              </span>
            </Link>
          ))}
        </div>
        {tensionPartner && (
          <div className="mt-2 flex items-start gap-2 rounded-[8px] border border-line bg-wash px-2.5 py-2">
            <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink-soft">
              <b className="text-ink">高张力成长伴侣（需磨合）</b>
              <Link
                href={`/type/${tensionPartner.type.code}`}
                prefetch={false}
                className="ml-1 font-semibold text-navy underline underline-offset-2"
              >
                {tensionPartner.type.name}
              </Link>
              <span className="block text-[11px] text-ink-mute">
                六维几乎全反，正是你缺的那一维；相处要磨合，成长也最快。
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-bold text-ink tabular-nums">
              {tensionPartner.score}
            </span>
          </div>
        )}
        <p className="mt-2 text-[10.5px] text-ink-mute">
          兼容度按六维同极 / 异极加权计算，仅供娱乐参考，不是关系预测。
        </p>
      </Card>

      {/* 2 职场相处 */}
      <Card Icon={Briefcase} title="职场相处">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{type.workStyle}</p>
      </Card>

      {/* 3 副业灵感 */}
      <Card Icon={Plant} title="副业灵感">
        <ul className="space-y-1.5">
          {type.sideHustles.map((s) => (
            <li key={s} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy" />
              {s}
            </li>
          ))}
        </ul>
      </Card>

      {/* 4 饭局 / 微信指南 */}
      <Card Icon={ForkKnife} title="饭局与微信指南">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{type.socialGuide}</p>
      </Card>

      {/* 5 名人组合 */}
      <Card Icon={FilmStrip} title="名人组合" wide>
        <div className="flex flex-wrap gap-1.5">
          {type.celebrities.map((c) => (
            <span
              key={c.name}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-soft"
              title={c.note}
            >
              {c.name}
              <span className="ml-1 text-[10px] text-ink-mute">{c.note}</span>
            </span>
          ))}
        </div>
        <p className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-line bg-wash px-2 py-1 text-[10.5px] font-semibold text-ink-mute">
          娱乐猜测：仅按公开访谈的零散印象归类，无任何实证依据
        </p>
      </Card>
    </div>
  );
}

function Card({
  Icon,
  title,
  wide = false,
  children,
}: {
  Icon: typeof Heart;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card p-4 sm:p-5", wide && "sm:col-span-2")}>
      <h3 className="flex items-center gap-2 text-[14px] font-bold tracking-tight text-navy">
        <Icon size={16} aria-hidden />
        {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}
