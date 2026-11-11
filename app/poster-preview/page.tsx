"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MODE_PRESETS, posterDataUrl, renderModePoster, type ModePosterInput } from "@/lib/poster";
import { chemPosterDataUrl, renderChemPoster } from "@/lib/compare-poster";
import { chemistryReport } from "@/lib/chemistry";
import { absoluteUrl } from "@/lib/site";

/**
 * 模式海报预览页
 * 访问 /poster-preview 可同时看到 Quick 和 Full 两张海报，点击按钮下载 PNG。
 */

type Mode = "quick" | "full";

function ModePosterCard({ mode }: { mode: Mode }) {
  const preset = MODE_PRESETS[mode];
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 二维码指向测试页
  const url = absoluteUrl(`/test?mode=${mode}`);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const input: ModePosterInput = { ...preset, url };
        const canvas = await renderModePoster(input);
        if (cancelled) return;
        canvasRef.current = canvas;
        setDataUrl(posterDataUrl(canvas));
      } catch (e) {
        console.error(e);
        if (!cancelled) setDataUrl(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, url]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `MBTI64-mode-${mode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [mode]);

  const label = mode === "quick" ? "快速测评 · 60 题" : "完整测评 · 120 题";
  const accent = mode === "quick" ? "#F6C343" : "#7B61FF";

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex w-full items-center justify-between">
        <h3 className="text-[16px] font-bold text-navy">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: accent }} />
          {label}
        </h3>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="rounded-full bg-navy px-3.5 py-1.5 text-[12.5px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          下载 PNG
        </button>
      </div>

      <div
        className="w-full overflow-hidden rounded-[16px] border border-[#E4E9F0] bg-white shadow-sm"
        style={{ aspectRatio: "3 / 4" }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`${label} 模式海报`} className="block h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-[#5B6B80]">
            {busy ? "海报生成中…" : "生成失败"}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-[#5B6B80]">
        二维码指向：{url}
      </p>
    </div>
  );
}

/** 双人合盘卡预览（样例对：INFJ-A-O × ESTP-C-H） */
function ChemPosterCard() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const url = absoluteUrl("/compare?a=INFJ-A-O&b=ESTP-C-H");

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const report = chemistryReport({ code: "INFJ-A-O" }, { code: "ESTP-C-H" });
        const canvas = await renderChemPoster({ report, url });
        if (cancelled) return;
        canvasRef.current = canvas;
        setDataUrl(chemPosterDataUrl(canvas));
      } catch (e) {
        console.error(e);
        if (!cancelled) setDataUrl(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "MBTI64-chemistry.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex w-full items-center justify-between">
        <h3 className="text-[16px] font-bold text-navy">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle bg-[#7B61FF]" />
          双人合盘卡 · INFJ-A-O × ESTP-C-H
        </h3>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="rounded-full bg-navy px-3.5 py-1.5 text-[12.5px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          下载 PNG
        </button>
      </div>

      <div
        className="w-full overflow-hidden rounded-[16px] border border-[#E4E9F0] bg-white shadow-sm"
        style={{ aspectRatio: "3 / 4" }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="双人合盘卡预览" className="block h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-[#5B6B80]">
            {busy ? "合盘卡生成中…" : "生成失败"}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-[#5B6B80]">二维码指向：{url}</p>
    </div>
  );
}

export default function PosterPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-[28px] font-black tracking-tight text-[#0F2747] sm:text-[34px]">
          MBTI64 · 模式海报预览
        </h1>
        <p className="mt-2 text-[13px] text-[#5B6B80]">
          1080 × 1440 · 3:4 · Canvas 2D 实时渲染 · 点击右上角「下载 PNG」保存
        </p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2">
        <ModePosterCard mode="quick" />
        <ModePosterCard mode="full" />
      </div>

      <div className="mt-10">
        <ChemPosterCard />
      </div>

      <footer className="mt-12 rounded-[12px] border border-[#E4E9F0] bg-[#FAFBFD] p-4 text-[12px] leading-relaxed text-[#5B6B80]">
        <p>
          <strong className="text-[#0F2747]">版式说明：</strong>
          与结果海报共用同一套 Canvas 2D 渲染引擎，底部 CTA / 二维码 / 免责声明位置完全一致；
          视觉核心区改为六维雷达占位图 + 四象限族群色块，无外部插画依赖。
        </p>
        <p className="mt-1.5">
          <strong className="text-[#0F2747]">模式差异：</strong>
          Quick 用冒险家黄（#F6C343）突出轻盈快速，Full 用分析师紫（#7B61FF）突出专业深度；
          进度条 fill 比例分别为 50% vs 100%，直观体现精简 vs 完整。
        </p>
      </footer>
    </div>
  );
}
