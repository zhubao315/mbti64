"use client";

import { CheckCircle, Path } from "@phosphor-icons/react";

export interface GrowthPlanProps {
  /** 3 条成长方向 */
  advice: string[];
  /** 3 个反思问题 */
  questions: string[];
  /** 已有的成长说明（来自人格档案） */
  summary: string;
}

const WEEKS = [
  { label: "第 1 周", action: "观察与记录：每天用一句话记下相关场景，不做改变。" },
  { label: "第 2 周", action: "小步试验：挑一个低风险场景，尝试一种新的回应方式。" },
  { label: "第 3 周", action: "复盘调整：回看记录，找出有效与无效的做法，保留一个。" },
  { label: "第 4 周", action: "固化动作：把有效做法变成固定习惯，并设定下一次观察点。" },
];

/** 成长建议：3 个方向 + 30 天计划 + 反思问题；只给方法，不给宿命论结论。 */
export default function GrowthPlan({ advice, questions, summary }: GrowthPlanProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-bold text-navy">3 个成长方向</h3>
        <ul className="mt-2 space-y-2">
          {advice.map((item, i) => (
            <li key={item} className="flex items-start gap-2.5 rounded-[10px] border border-line bg-wash p-3">
              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white"
              >
                {i + 1}
              </span>
              <p className="text-[13px] leading-relaxed text-ink-soft">{item}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-navy">
          <Path size={15} weight="bold" aria-hidden /> 30 天计划
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{summary}</p>
        <ol className="mt-2 space-y-1.5">
          {WEEKS.map((w) => (
            <li key={w.label} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
              <span className="w-[52px] shrink-0 font-bold text-navy">{w.label}</span>
              <span>{w.action}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-[14px] font-bold text-navy">留给自己的 3 个问题</h3>
        <ul className="mt-2 space-y-1.5">
          {questions.map((q) => (
            <li key={q} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-soft">
              <CheckCircle size={14} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-navy/60" />
              {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
