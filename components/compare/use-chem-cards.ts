"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chemistryReport, type ChemistryReport } from "@/lib/chemistry";

/**
 * 双人合盘卡 · 批量生成
 *
 * 【为什么是 Blob 而不是 dataUrl】
 * 一张 1080×1440 的卡转成 PNG dataUrl 约 1.3MB 的字符串，
 * 一次生成几十张会把 JS 堆撑爆。Blob + objectURL 由浏览器文件句柄托底，
 * 内存占用小得多，下载时还能直接复用。
 *
 * 【为什么逐张生成】
 * 同时渲染 64 张会瞬间吃掉几百 MB 的画布内存。
 * 这里串行生成 + 逐张出图，用户看到一张就多一张。
 */
export interface ChemCard {
  /** 对方型别编码 */
  partnerCode: string;
  /** 对方型别名 */
  partnerName: string;
  /** 关系象限 */
  quadrant: ChemistryReport["quadrant"];
  /** 象限标签 */
  quadrantLabel: string;
  /** 可展示 / 可下载的 PNG（objectURL） */
  blobUrl: string;
  /** 原始 Blob */
  blob: Blob;
}

export type CardGenStatus = "idle" | "running" | "done" | "error";

export interface UseChemCardsResult {
  cards: ChemCard[];
  status: CardGenStatus;
  /** 已完成 / 总数 */
  progress: { done: number; total: number };
  error: string | null;
  /** 生成一批：我自己的编码 × 一组对方编码 */
  generate: (myCode: string, partners: string[]) => Promise<void>;
  /** 释放已生成的 objectURL */
  reset: () => void;
}

/** 取当前站点地址（客户端才有 window） */
function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

export function useChemCards(): UseChemCardsResult {
  const [cards, setCards] = useState<ChemCard[]>([]);
  const [status, setStatus] = useState<CardGenStatus>("idle");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);
  const runningRef = useRef(false);

  /** 释放上一批的 objectURL，避免内存泄漏 */
  const reset = useCallback(() => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current = [];
    setCards([]);
    setDone(0);
    setTotal(0);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => reset, [reset]);

  const generate = useCallback(
    async (myCode: string, partners: string[]) => {
      if (runningRef.current || partners.length === 0) return;
      runningRef.current = true;
      reset();
      setStatus("running");
      setTotal(partners.length);

      try {
        const { renderChemPoster } = await import("@/lib/compare-poster");
        const { canvasToBlob } = await import("@/lib/poster");
        const origin = siteOrigin();

        for (let i = 0; i < partners.length; i += 1) {
          const partnerCode = partners[i];
          const report = chemistryReport({ code: myCode }, { code: partnerCode });
          const canvas = await renderChemPoster({
            report,
            url: `${origin}?a=${myCode}&b=${partnerCode}`,
          });
          const blob = await canvasToBlob(canvas);
          if (!blob) throw new Error(`第 ${i + 1} 张生成失败`);
          const blobUrl = URL.createObjectURL(blob);
          urlsRef.current.push(blobUrl);
          setCards((prev) => [
            ...prev,
            {
              partnerCode,
              partnerName: report.b.name,
              quadrant: report.quadrant,
              quadrantLabel: report.quadrantLabel,
              blobUrl,
              blob,
            },
          ]);
          setDone(i + 1);
        }
        setStatus("done");
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "生成失败");
        setStatus("error");
      } finally {
        runningRef.current = false;
      }
    },
    [reset],
  );

  return { cards, status, progress: { done, total }, error, generate, reset };
}
