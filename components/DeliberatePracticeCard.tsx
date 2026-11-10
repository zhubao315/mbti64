import type { BookDeliberatePractice } from "@/data/bookEnriched";
import PracticeCheckin from "@/components/profile/PracticeCheckin";
import type { PracticeDirection } from "@/lib/practice-store";

interface DeliberatePracticeCardProps {
  practice: BookDeliberatePractice;
}

const DIRECTIONS = [
  { key: "c2a", label: "C → A", desc: "从审慎校准到清晰主张" },
  { key: "a2c", label: "A → C", desc: "从果断主张回到审慎校准" },
  { key: "o2h", label: "O → H", desc: "从求新探索到守成沉淀" },
  { key: "h2o", label: "H → O", desc: "从守成维护到重新求新" },
] as const;

export default function DeliberatePracticeCard({ practice }: DeliberatePracticeCardProps) {
  return (
    <section className="mt-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-xs tracking-[0.24em] text-[var(--text-tertiary)]">DELIBERATE PRACTICE</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            刻意练习：一阶同源微调
          </h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">不换人格，只调旋钮</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DIRECTIONS.map((dir) => {
          const items = practice[dir.key] ?? [];
          if (items.length === 0) return null;
          return (
            <div
              key={dir.key}
              className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-soft)] p-4"
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {dir.label}
                <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">
                  {dir.desc}
                </span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="text-[13px] leading-6 text-[var(--text-secondary)]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <PracticeCheckin
          actions={{
            c2a: practice.c2a ?? [],
            a2c: practice.a2c ?? [],
            o2h: practice.o2h ?? [],
            h2o: practice.h2o ?? [],
          } as Record<PracticeDirection, string[]>}
        />
      </div>
    </section>
  );
}
