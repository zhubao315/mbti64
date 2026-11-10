import type { BookNeuroBase } from "@/data/bookEnriched";

interface NeuroStackCardProps {
  neuroBase: BookNeuroBase;
  base: string;
}

const FUNCTION_LABELS = [
  { key: "dominant" as const, label: "主导功能", color: "var(--chart-3)" },
  { key: "auxiliary" as const, label: "辅助功能", color: "var(--chart-2)" },
  { key: "tertiary" as const, label: "第三功能", color: "var(--chart-4)" },
  { key: "inferior" as const, label: "劣势功能", color: "var(--chart-6)" },
];

const EVIDENCE_COLOR: Record<string, string> = {
  相关研究启发: "var(--chart-2)",
  理论类比: "var(--chart-4)",
  尚无直接验证: "var(--chart-6)",
};

export default function NeuroStackCard({ neuroBase, base }: NeuroStackCardProps) {
  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">COGNITIVE MAPPING</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">功能栈与认知过程映射</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{base} 的功能栈 · 解释性类比</p>
      </div>

      {/* 功能栈 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {FUNCTION_LABELS.map(({ key, label, color }) => {
          const fn = neuroBase.stack[key];
          return (
            <div key={key} className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
              <p className="text-[10px] tracking-wider text-[var(--text-tertiary)]">{label}</p>
              <p className="mt-1 text-sm font-semibold" style={{ color }}>{fn}</p>
            </div>
          );
        })}
      </div>

      {/* 解释性映射（不是脑区测量） */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-[var(--text-tertiary)]">可能涉及的认知过程</p>
        <ul className="space-y-2">
          {neuroBase.explanatoryNetworks.map((item) => (
            <li
              key={item.label}
              className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</span>
                <span
                  className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: EVIDENCE_COLOR[item.evidenceLevel] ?? "var(--text-tertiary)" }}
                >
                  {item.evidenceLevel}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* 双层失衡 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
          <p className="text-[10px] tracking-wider text-[var(--text-tertiary)]">慢性死循环（Loop）</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{neuroBase.loopState}</p>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
          <p className="text-[10px] tracking-wider text-[var(--text-tertiary)]">急性劣势爆发（Grip）</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{neuroBase.gripState}</p>
        </div>
      </div>

      <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
        {neuroBase.disclaimer ||
          "神经机制部分用于通俗解释人格模型与认知过程之间的可能联系，不是个人脑成像结果，也不构成诊断结论。"}
      </p>
    </section>
  );
}
