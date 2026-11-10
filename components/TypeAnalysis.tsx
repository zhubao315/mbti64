import { SUFFIX_MODIFIERS, type SuffixLetter, type Type64 } from "@/data/types64";

/**
 * 5 节长文解读：对标 16P 的核心叙事结构
 * 节序号是装饰（墨色圆点 01/02/03/04/05），不写"优势/盲点"标签
 *
 * 后缀调性只在开头展示一次。旧实现把同一句「（后缀调性：…）」追加到每一节末尾，
 * 同一页会重复 5 次，读起来像内部批注泄漏。
 */
export default function TypeAnalysis({ type }: { type: Type64 }) {
  const num = (i: number) => String(i + 1).padStart(2, "0");
  return (
    <div>
      <SuffixTone ac={type.ac} oh={type.oh} />
      <div className="space-y-8">
        {type.analysis.map((section, i) => (
          <article key={i}>
            <header className="flex items-baseline gap-3">
              <span className="font-mono text-[13px] font-bold tracking-widest text-ink-mute">{num(i)}</span>
              <h3 className="text-[17px] font-bold tracking-tight text-navy sm:text-[19px]">{section.heading}</h3>
            </header>
            <div className="prose-type mt-3">
              {section.body.split("\n\n").map((p, pi) => (
                <p key={pi} className="mb-3 last:mb-0 whitespace-pre-wrap">
                  {p}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** 后缀调性摘要：两个后缀各一行，只出现一次 */
function SuffixTone({ ac, oh }: { ac: "A" | "C"; oh: "O" | "H" }) {
  return (
    <div className="mb-8 rounded-[12px] border border-line bg-wash p-4 sm:p-5">
      <p className="text-[11px] font-bold tracking-[0.18em] text-ink-mute">后缀调性</p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <SuffixItem letter={ac} />
        <SuffixItem letter={oh} />
      </div>
    </div>
  );
}

function SuffixItem({ letter }: { letter: SuffixLetter }) {
  const modifier = SUFFIX_MODIFIERS[letter];
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-navy font-mono text-[11px] font-bold text-white"
      >
        {letter}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold text-navy">
          {modifier.name}
          <span className="ml-2 font-normal text-ink-mute">{modifier.tagline}</span>
        </p>
      </div>
    </div>
  );
}
