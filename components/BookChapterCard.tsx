import Link from "next/link";
import type { BookTypeData } from "@/data/bookEnriched";

interface BookChapterCardProps {
  data: BookTypeData;
}

export default function BookChapterCard({ data }: BookChapterCardProps) {
  const { bookChapter, bookChapterPath, chinaSlices, intimacyContract, deliberatePractice } = data;

  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">FROM THE BOOK</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">《千分之一的你》原书章节</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{bookChapter}</p>
      </div>

      <div className="space-y-4">
        {/* 中国式生存切片 */}
        {chinaSlices.career && (
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">职场生态位</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{chinaSlices.career}</p>
          </div>
        )}
        {chinaSlices.dinner && (
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">饭局与微信</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{chinaSlices.dinner}</p>
          </div>
        )}

        {/* 亲密关系契约 */}
        {intimacyContract.contract && (
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">亲密关系中的隐形契约</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{intimacyContract.contract}</p>
          </div>
        )}

        {/* 今日最低可执行微动作 */}
        {Object.values(deliberatePractice).some((arr) => arr.length > 0) && (
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">今日最低可执行微动作</p>
            <div className="space-y-2">
              {Object.entries(deliberatePractice).map(([key, arr]) => {
                if (arr.length === 0) return null;
                const labels = { c2a: "C→A 坚定化", a2c: "A→C 内省化", o2h: "O→H 守成化", h2o: "H→O 探索化" };
                return (
                  <div key={key}>
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)]">{labels[key as keyof typeof labels]}</p>
                    <ul className="mt-1 space-y-1">
                      {(arr as string[]).slice(0, 2).map((item: string, i: number) => (
                        <li key={i} className="text-sm leading-6 text-[var(--text-secondary)]">
                          · {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <p className="text-xs text-[var(--text-tertiary)]">
          以上内容摘自《千分之一的你：64型人格认知模型与脑神经亚型全书》{bookChapter.replace(/\.md$/, "")}。
          完整章节包含约 9,000~12,000 字深度叙事、神经科学机制与场景化练习。
        </p>
      </div>
    </section>
  );
}
