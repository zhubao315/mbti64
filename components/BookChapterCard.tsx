import type { BookTypeData } from "@/data/bookEnriched";

interface BookChapterCardProps {
  data: BookTypeData;
  /** 当前亚型后缀，用于展示对应状态的章节预览 */
  currentSuffix?: string | null;
}

export default function BookChapterCard({ data, currentSuffix }: BookChapterCardProps) {
  const { bookChapter, cn, spiralStage } = data;
  const variant = (currentSuffix && spiralStage[currentSuffix]) || spiralStage["C-O"] || null;
  if (!variant) return null;

  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">FROM THE BOOK</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">原书章节导读</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{bookChapter.replace(/\.md$/, "")}</p>
      </div>

      <p className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
        {variant.bodyPreview.replace(/\*\*/g, "")}
      </p>

      <p className="mt-3 border-t border-[var(--line)] pt-3 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
        以上为「{cn}」章节中 {variant.label} 开头的预览。完整章节收录于《千分之一的你：64 型人格认知模型与脑神经亚型全书》，
        约 9,000~12,000 字，含完整叙事、场景切片与练习。
        <span className="mt-1 block">
          书稿中的神经机制表述属于通俗解释性类比，不是个人脑成像结果，也不构成诊断结论。
        </span>
      </p>
    </section>
  );
}
