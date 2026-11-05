import { GROUP_META } from "@/data/schema";
import type { Type64 } from "@/data/types64";

/**
 * 四字母逐词释义行：E=外向 / I=内向 …
 * 每字母一个小胶囊，白底 1px 边 + 字母语义 + 中文释义
 */
const LABELS: Record<string, { short: string; full: string }> = {
  E: { short: "外向", full: "从人群取能" },
  I: { short: "内向", full: "从独处取能" },
  S: { short: "实感", full: "信具体经验" },
  N: { short: "直觉", full: "信模式联想" },
  T: { short: "理性", full: "先算账" },
  F: { short: "情感", full: "先看人" },
  J: { short: "计划", full: "靠确定感安心" },
  P: { short: "灵活", full: "靠选择权安心" },
};

export default function TypeLetterRow({ type }: { type: Type64 }) {
  const group = GROUP_META[type.group];
  const letters = [
    { letter: type.code[0], key: "EI" },
    { letter: type.code[1], key: "SN" },
    { letter: type.code[2], key: "TF" },
    { letter: type.code[3], key: "JP" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {letters.map(({ letter, key }) => {
        const label = LABELS[letter];
        return (
          <div key={key} className="rounded-[10px] border border-line bg-white px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] font-mono text-[15px] font-black text-white"
                style={{ background: group.color }}
              >
                {letter}
              </span>
              <span className="text-[13px] font-bold text-navy">{label.short}</span>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{label.full}</p>
          </div>
        );
      })}
    </div>
  );
}
