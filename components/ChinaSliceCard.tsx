import type { BookChinaSlices, BookIntimacyContract } from "@/data/bookEnriched";

interface ChinaSliceCardProps {
  chinaSlices: BookChinaSlices;
  intimacyContract: BookIntimacyContract;
}

const SLICE_META = [
  { key: "career", label: "职场切片", desc: "会议、汇报与晋升现场" },
  { key: "dinner", label: "饭局切片", desc: "敬酒、座次与客套话" },
  { key: "wechat", label: "微信切片", desc: "群聊、私聊与已读不回" },
] as const;

export default function ChinaSliceCard({ chinaSlices, intimacyContract }: ChinaSliceCardProps) {
  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">CHINA SLICES</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">中国式生存切片</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">三个最具体的本土现场</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SLICE_META.map((meta) => (
          <div
            key={meta.key}
            className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4"
          >
            <p className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{meta.desc}</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              {chinaSlices[meta.key]}
            </p>
          </div>
        ))}
      </div>

      {chinaSlices.defenseLines.length > 0 && (
        <div className="mt-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">低耗能防御话术</p>
          <ul className="mt-2 space-y-1.5">
            {chinaSlices.defenseLines.map((line, i) => (
              <li key={i} className="text-[13px] leading-6 text-[var(--text-secondary)]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">亲密关系契约</p>
        <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
          {intimacyContract.contract}
        </p>
        {intimacyContract.wearScripts.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3">
            {intimacyContract.wearScripts.map((line, i) => (
              <li key={i} className="text-[13px] leading-6 text-[var(--text-secondary)]">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
