import type { Type64 } from "@/data/types64";

/**
 * 5 节长文解读：对标 16P 的核心叙事结构
 * 节序号是装饰（墨色圆点 01/02/03/04/05），不写"优势/盲点"标签
 */
export default function TypeAnalysis({ type }: { type: Type64 }) {
  const num = (i: number) => String(i + 1).padStart(2, "0");
  return (
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
  );
}
