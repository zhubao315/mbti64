"use client";

import { useMemo, useState } from "react";
import { DIM_ORDER, DIMS } from "@/data/schema";
import { BASE_TYPES, TYPE_BY_CODE } from "@/data/types64";
import { compatibilityLabel, loveCompatibility, l1Distance, vectorFromCode } from "@/lib/match";
import { cn } from "@/lib/utils";

type DimKey = keyof typeof DIMS;

export interface DiffBarsProps {
  /** 用户六维读数 */
  dims: Record<DimKey, { percentA: number; percentB: number }>;
  /** 对比对象的 64 编码，如 "INFJ-A-O" */
  partnerCode: string;
  partnerName: string;
  /** 我的编码，用于计算兼容度与距离 */
  myCode?: string;
  /** 快捷胶囊：最相似 / 最互补 / 朋友型号 */
  shortcuts?: { label: string; code: string }[];
  onPartnerChange?: (code: string) => void;
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

const SUFFIX_OPTIONS = [
  { suffix: "A-O", label: "坚定探索" },
  { suffix: "A-H", label: "坚定守成" },
  { suffix: "C-O", label: "审慎探索" },
  { suffix: "C-H", label: "审慎守成" },
];

/**
 * 差异对比：把用户与对比型在六个维度上的倾向并排展示。
 * 只描述倾向差异，不做优劣判断。
 */
export default function DiffBars({
  dims,
  partnerCode,
  partnerName,
  myCode,
  shortcuts = [],
  onPartnerChange,
  className = "",
}: DiffBarsProps) {
  const letters = lettersOf(partnerCode);
  const [baseCode, setBaseCode] = useState(() => partnerCode.split("-")[0] ?? "INTJ");
  const [suffix, setSuffix] = useState(() => {
    const parts = partnerCode.split("-");
    return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : "A-O";
  });

  const effectiveCode = `${baseCode}-${suffix}`;
  const effectiveName = TYPE_BY_CODE[effectiveCode]?.name ?? partnerName;

  const stats = useMemo(() => {
    if (!myCode) return null;
    const dist = l1Distance(vectorFromCode(myCode), vectorFromCode(effectiveCode));
    const love = loveCompatibility(myCode, effectiveCode);
    return { dist, love, loveLabel: compatibilityLabel(love) };
  }, [myCode, effectiveCode]);

  function pick(nextBase: string, nextSuffix?: string) {
    setBaseCode(nextBase);
    const s = nextSuffix ?? suffix;
    setSuffix(s);
    onPartnerChange?.(`${nextBase}-${s}`);
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 型号选择器 */}
      <div className="rounded-[10px] border border-line bg-white p-3">
        <p className="text-[11.5px] font-semibold text-ink-soft">选择对比型号</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <select
            aria-label="基础型"
            value={baseCode}
            onChange={(e) => pick(e.target.value)}
            className="min-h-[36px] rounded-[8px] border border-line bg-white px-2 text-[12.5px] font-semibold text-navy"
          >
            {BASE_TYPES.map((b) => (
              <option key={b.code} value={b.code}>
                {b.code} {b.cn}
              </option>
            ))}
          </select>
          <select
            aria-label="后缀状态"
            value={suffix}
            onChange={(e) => pick(baseCode, e.target.value)}
            className="min-h-[36px] rounded-[8px] border border-line bg-white px-2 text-[12.5px] font-semibold text-navy"
          >
            {SUFFIX_OPTIONS.map((s) => (
              <option key={s.suffix} value={s.suffix}>
                {s.suffix} · {s.label}
              </option>
            ))}
          </select>
        </div>

        {shortcuts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shortcuts.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => {
                  const parts = s.code.split("-");
                  pick(parts[0], parts.length >= 3 ? `${parts[1]}-${parts[2]}` : undefined);
                }}
                className={cn(
                  "min-h-[32px] rounded-full border px-2.5 text-[11.5px] font-semibold transition",
                  effectiveCode === s.code
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-wash text-ink-soft hover:border-navy/40",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-[11.5px] leading-relaxed text-ink-mute">
        你与 {effectiveName}（{effectiveCode}）的六维差异；数值为各极倾向占比，不是能力评分。
      </p>

      {stats ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-wash px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
            六维距离 L1={stats.dist}
          </span>
          <span className="rounded-full bg-wash px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
            协作/恋爱兼容度 {stats.love}% · {stats.loveLabel}
          </span>
        </div>
      ) : null}

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
