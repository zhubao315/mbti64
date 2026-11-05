import type { Type64 } from "@/data/types64";
import type { MatchItem } from "@/lib/match";
import { compatibilityLabel, loveCompatibility } from "@/lib/match";
import { getType } from "@/data/types64";
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
  partners,
  className,
}: {
  type: Type64;
  /** 互补型（用于恋爱兼容打分） */
  partners: MatchItem[];
  className?: string;
}) {
  const loveTargets = partners.slice(0, 3).map((p) => {
    const t = getType(p.type.code);
    return { type: t, score: loveCompatibility(type.code, t.code) };
  });

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {/* 1 恋爱兼容 */}
      <Card Icon={Heart} title="恋爱兼容" wide>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{type.loveStyle}</p>
        <div className="mt-3 space-y-1.5">
          {loveTargets.map(({ type: t, score }) => (
            <Link
              key={t.code}
              href={`/type/${t.code}`}
              className="flex min-h-[40px] items-center gap-2 rounded-[8px] border border-line bg-white px-2.5 py-2 transition hover:bg-wash"
            >
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{t.name}</span>
              <span className="shrink-0 text-[11px] font-bold text-ink tabular-nums">{score}</span>
              <span className="shrink-0 rounded-full border border-line bg-wash px-2 py-0.5 text-[10px] font-semibold text-ink-mute">
                {compatibilityLabel(score)}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] text-ink-mute">兼容度按六维距离计算，仅供娱乐参考。</p>
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
