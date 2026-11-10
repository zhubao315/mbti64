"use client";

import { DIM_ORDER, DIMS } from "@/data/schema";

type DimKey = keyof typeof DIMS;

export interface DiffBarsProps {
  /** 用户六维读数 */
  dims: Record<DimKey, { percentA: number; percentB: number }>;
  /** 对比对象的 64 编码，如 "INFJ-A-O" */
  partnerCode: string;
  partnerName: string;
  className?: string;
}

function lettersOf(code: string): Record<DimKey, string> {
  const [base = "", ac = "", oh = ""] = code.split("-");
  return {
    EI: base[0] ?? "",
    SN: base[1] ?? "",
    TF: base[2] ?? "",
    JP: base[3] ?? "",
    AC: ac[0] ?? "",
    OH: oh[0] ?? "",
  };
}

/**
 * 差异对比：把用户与对比型在六个维度上的倾向并排展示。
 * 只描述倾向差异，不做优劣判断。
 */
export default function DiffBars({ dims, partnerCode, partnerName, className = "" }: DiffBarsProps) {
  const letters = lettersOf(partnerCode);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <p className="text-[11.5px] leading-relaxed text-ink-mute">
        你与 {partnerName}（{partnerCode}）的六维差异；数值为各极倾向占比，不是能力评分。
      </p>
      {DIM_ORDER.map((k) => {
        const meta = DIMS[k];
        const userA = Math.round(dims[k].percentA);
        const partnerA = letters[k] === meta.poleA ? 100 : 0;
        const delta = Math.round(userA - partnerA);
        return (
          <div key={k}>
            <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
              <span className="font-semibold text-ink">{meta.name}</span>
              <span className="text-ink-mute">
                你 {userA}% {userA >= 50 ? meta.poleAName : meta.poleBName} · 对方 {partnerA}%{" "}
                {partnerA >= 50 ? meta.poleAName : meta.poleBName}
              </span>
            </div>
            <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-navy/30" style={{ width: `${userA}%` }} />
              <div className="h-full bg-navy/10" style={{ width: `${100 - userA}%` }} />
            </div>
            <p className="mt-0.5 text-[10.5px] text-ink-mute">
              {Math.abs(delta) === 0
                ? "倾向接近，容易互相理解"
                : delta > 0
                  ? `你更偏 ${meta.poleAName}，对方更偏 ${meta.poleBName}`
                  : `你更偏 ${meta.poleBName}，对方更偏 ${meta.poleAName}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
