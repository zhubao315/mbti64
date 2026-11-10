import Link from "next/link";
import type { BookMirrorMentor } from "@/data/bookEnriched";

interface MirrorMentorCardProps {
  mentor: BookMirrorMentor;
  base: string;
  /** 当前亚型后缀：镜像型在六维上全部翻转，后缀同样翻转（A↔C、O↔H） */
  currentSuffix?: string | null;
}

/** 由当前后缀推导镜像亚型后缀 */
function mirrorSuffix(suffix?: string | null): string | null {
  if (!suffix || suffix.length !== 3) return null;
  const ac = suffix[0] === "A" ? "C" : "A";
  const oh = suffix[2] === "O" ? "H" : "O";
  return `${ac}-${oh}`;
}

export default function MirrorMentorCard({ mentor, base, currentSuffix }: MirrorMentorCardProps) {
  const target = mirrorSuffix(currentSuffix);
  const href = `/type/${encodeURIComponent(target ? `${mentor.base}-${target}` : mentor.base)}`;

  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">MIRROR MENTOR · L1=1200</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">向你的盲区导师借一副盔甲</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">跨族镜像 · 绝对互补</p>
      </div>

      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {mentor.base} {mentor.cn}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {base} ↔ {mentor.base} 在六维空间中相距 L1={mentor.l1Distance}，是几乎完全镜像的绝对互补型
            </p>
          </div>
          <Link
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-[var(--line)] px-3 text-xs text-[var(--text-secondary)] transition hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
            href={href}
          >
            查看导师 →
          </Link>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{mentor.reason}</p>

        {mentor.experimentSteps.length > 0 && (
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">「借假修真」三步实验</p>
            <ol className="space-y-2">
              {mentor.experimentSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elev)] text-[10px] text-[var(--text-tertiary)]">
                    {i + 1}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{step.title}</strong>
                    {step.body}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
