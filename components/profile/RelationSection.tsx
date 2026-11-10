"use client";

import { useState } from "react";
import MatchList from "@/components/MatchList";
import DiffBars from "@/components/profile/DiffBars";
import type { MatchItem } from "@/lib/match";

export interface RelationSectionProps {
  dims: Record<string, { percentA: number; percentB: number }>;
  myCode: string;
  similar: MatchItem[];
  complement: MatchItem[];
  communication: string;
  socialGuide: string;
}

/**
 * 人格关系区：最相似 / 最互补列表 + 可自选型号的六维差异对比 + 沟通建议。
 */
export default function RelationSection({
  dims,
  myCode,
  similar,
  complement,
  communication,
  socialGuide,
}: RelationSectionProps) {
  const [partnerCode, setPartnerCode] = useState<string>(similar[0]?.type.code ?? complement[0]?.type.code ?? "INTJ-A-O");
  const partner = similar.find((s) => s.type.code === partnerCode) ?? complement.find((c) => c.type.code === partnerCode);
  const partnerName = partner?.type.name ?? "未知型号";

  const shortcuts = [
    ...(similar[0] ? [{ label: "我的最相似型", code: similar[0].type.code }] : []),
    ...(complement[0] ? [{ label: "盲区导师", code: complement[0].type.code }] : []),
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-[14px] font-bold text-navy">和你最像的 3 型</h3>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">六维倾向距离最近</p>
          <div className="mt-2">
            <MatchList items={similar} kind="similar" />
          </div>
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-navy">最能补你盲区的 3 型</h3>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">六维倾向几乎镜像</p>
          <div className="mt-2">
            <MatchList items={complement} kind="complement" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-line bg-wash p-4">
          <h3 className="text-[14px] font-bold text-navy">差异对比</h3>
          <div className="mt-2">
            <DiffBars
              dims={dims as never}
              partnerCode={partnerCode}
              partnerName={partnerName}
              myCode={myCode}
              shortcuts={shortcuts}
              onPartnerChange={setPartnerCode}
            />
          </div>
        </div>
        <div className="rounded-card border border-line bg-wash p-4">
          <h3 className="text-[14px] font-bold text-navy">沟通建议</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{communication}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{socialGuide}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-mute">
            和 {partnerName} 相处时，先对齐目标与节奏，再讨论分歧；相似型容易默认「对方自然懂」，反而要说得更具体。
          </p>
        </div>
      </div>
    </>
  );
}
