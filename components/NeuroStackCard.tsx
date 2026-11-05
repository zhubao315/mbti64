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

export default function NeuroStackCard({ neuroBase, base }: NeuroStackCardProps) {
  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">NEURAL ARCHITECTURE</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">神经底盘与功能栈</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{base} 的八维功能与脑区映射</p>
      </div>

      {/* 功能栈 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {FUNCTION_LABELS.map(({ key, label, color }) => {
          const fn = neuroBase.stack[key];
          const fnCode = fn.split(" ")[0];
          return (
            <div key={key} className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-3">
              <p className="text-[10px] tracking-wider text-[var(--text-tertiary)]">{label}</p>
              <p className="mt-1 text-sm font-semibold" style={{ color }}>{fn}</p>
            </div>
          );
        })}
      </div>

      {/* 脑区标签 */}
      <div className="mt-4">
        <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">核心激活脑区</p>
        <div className="flex flex-wrap gap-1.5">
          {neuroBase.brainRegions.slice(0, 6).map((region) => (
            <span
              key={region}
              className="rounded-full border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
            >
              {region}
            </span>
          ))}
        </div>
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
    </section>
  );
}
