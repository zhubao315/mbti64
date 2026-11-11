"use client";

import Link from "next/link";
import { Gauge, Warning } from "@phosphor-icons/react";
import { getType } from "@/data/types64";
import { DIMS, type DimKey } from "@/data/schema";
import type { BorderlineArchetype } from "@/lib/scoring";
import type { ConfidenceReport } from "@/lib/answer-checks";

/**
 * 结果页 · 作答质量面板
 *
 * 两块内容：
 * 1. 临界副型提示：某个前四维读数接近中位时，指出「你身上也带着隔壁那型」
 * 2. 本次作答清晰度指数：只作自我参照，不改变任何计分结果
 */
export default function QualityPanel({
  borderlines,
  confidence,
}: {
  borderlines: BorderlineArchetype[];
  confidence: ConfidenceReport | null;
}) {
  if (borderlines.length === 0 && !confidence) return null;

  return (
    <div className="section-lazy mt-4 space-y-3">
      {borderlines.length > 0 ? (
        <section className="card p-4 sm:p-5">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-bold tracking-tight text-navy">
              你的临界副型
            </h2>
            <p className="text-[11px] text-ink-mute">读数接近中位的维度</p>
          </div>
          <ul className="space-y-2.5">
            {borderlines.map((b) => {
              const t = getType(b.code);
              return (
                <li
                  key={b.code}
                  className="rounded-[10px] border border-line bg-wash px-3.5 py-3"
                >
                  <p className="text-[12.5px] leading-relaxed text-ink-soft">{b.note}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/type/${b.code}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-semibold text-navy transition hover:bg-white"
                    >
                      <Warning size={12} aria-hidden />
                      {t.name}
                      <span className="font-mono text-[10.5px] text-ink-mute">{b.code}</span>
                    </Link>
                    <span className="text-[11px] text-ink-mute">
                      {DIMS[b.flipped].name} 离中位 {b.margin} 个百分点
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink-mute">
            临界不等于摇摆：摇摆指二选一票数没到 2/3 门槛，这里指读数本身接近中位。
            两者都会让你「不太像」单一标签。
          </p>
        </section>
      ) : null}

      {confidence ? (
        <section className="card p-4 sm:p-5">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-navy">
              <Gauge size={16} aria-hidden />
              本次作答清晰度指数
            </h2>
            <p className="text-[11px] text-ink-mute">仅供自我参照，不影响结果</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[30px] font-black leading-none tabular-nums text-navy">
              {confidence.score}
            </span>
            <span className="text-[13px] font-semibold text-ink-soft">
              / 100 · {confidence.label}
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-wash">
            <div
              className="h-full rounded-full bg-navy transition-[width] duration-700"
              style={{ width: `${confidence.score}%` }}
            />
          </div>

          <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">{confidence.summary}</p>

          {confidence.factors.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {confidence.factors.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-mute">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-mute" />
                  {f}
                </li>
              ))}
            </ul>
          ) : null}

          {confidence.suggestRetest.length > 0 ? (
            <p className="mt-2.5 rounded-[10px] border border-line bg-wash px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
              建议静心重测的维度：
              {confidence.suggestRetest.map((k: DimKey) => DIMS[k].name).join("、")}。
              重测前先想想这些场景里你真实的默认反应，而不是「应该怎样」。
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
