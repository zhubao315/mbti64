"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DimKey, DimScore, GroupKey } from "@/data/schema";
import { DIMS, DIM_ORDER } from "@/data/schema";
import type { RankedType } from "@/lib/rarity";
import { per1000Text } from "@/lib/rarity";
import { SHARE_DISCLAIMER, SHARE_TEMPLATES, copyText, fillTemplate } from "@/lib/share";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 分享面板：海报 + 文案二合一
 *
 * 海报走 lib/poster.ts（Canvas 2D，1080×1920），用动态 import 避免把 qrcode 打进首屏包。
 * 文案库 13 条，按「自嘲 / 炫耀 / 邀请 / 反差」分区，全部内置免责声明由 UI 固定展示。
 */

export interface SharePosterProps {
  open: boolean;
  onClose: () => void;
  code: string;
  typeName: string;
  group: GroupKey;
  emoji: string;
  tagline: string;
  keywords: string[];
  dims: Record<DimKey, DimScore>;
  rarity: RankedType;
}

type Tab = "poster" | "text";

export default function SharePoster(props: SharePosterProps) {
  const { open, onClose, code, typeName, group, emoji, tagline, keywords, dims, rarity } = props;
  const [tab, setTab] = useState<Tab>("poster");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [tplIndex, setTplIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const strongestKey = useRef<DimKey>(
    DIM_ORDER.reduce((best, k) => (dims[k].preferred > dims[best].preferred ? k : best), DIM_ORDER[0]),
  );

  const url = absoluteUrl(`/type/${code}`);
  const vars = {
    typeName,
    code,
    tierName: rarity.tier.name,
    per1000: per1000Text(rarity),
    rankLabel: rarity.rankLabel,
    strongest: DIMS[strongestKey.current].name,
    strongestPercent: `${dims[strongestKey.current].preferred}%`,
  };

  // 打开时生成海报（只生成一次，换 tab 不重绘）
  useEffect(() => {
    if (!open || dataUrl) return;
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const poster = await import("@/lib/poster");
        const canvas = await poster.renderPoster({
          code,
          typeName,
          group,
          emoji,
          tagline,
          dims,
          rarity,
          url,
          keywords,
        });
        if (cancelled) return;
        canvasRef.current = canvas;
        setDataUrl(poster.posterDataUrl(canvas));
      } catch {
        if (!cancelled) setDataUrl(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dataUrl, code, typeName, group, emoji, tagline, dims, rarity, url, keywords]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const flashCopied = useCallback((msg: string) => {
    setCopied(msg);
    setTimeout(() => setCopied(null), 1800);
  }, []);

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const poster = await import("@/lib/poster");
    poster.downloadPoster(canvas, `64personalities-${code}.png`);
    flashCopied("海报已下载");
  }

  async function handleNativeShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const poster = await import("@/lib/poster");
    const blob = await poster.canvasToBlob(canvas);
    if (!blob) return;
    const file = new File([blob], `64personalities-${code}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: `${typeName} · ${code}`, url });
      } else {
        await nav.share?.({ title: typeName, text: `${typeName} · ${code}`, url });
      }
    } catch {
      flashCopied("已取消或浏览器不支持直接分享");
    }
  }

  const current = SHARE_TEMPLATES[tplIndex % SHARE_TEMPLATES.length];
  const currentText = fillTemplate(current.text, vars);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
        >
          <button type="button" aria-label="关闭分享" className="absolute inset-0 bg-ink/35 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ y: 44, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1.2, 0.36, 1] }}
            className="glass-strong relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <h2 id="share-title" className="text-[16px] font-bold tracking-tight text-ink">
                分享我的结果
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-2 py-1 text-[15px] leading-none text-ink-mute hover:text-ink"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            {/* Tab 切换 */}
            <div className="mt-3 flex gap-1.5 px-5">
              {(
                [
                  ["poster", "海报"],
                  ["text", "文案"],
                ] as Array<[Tab, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[13px] font-semibold transition",
                    tab === key ? "bg-ink text-white" : "bg-white/70 text-ink-soft hover:bg-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="no-scrollbar mt-3 flex-1 overflow-y-auto px-5 pb-5">
              {tab === "poster" ? (
                <div>
                  <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-glass">
                    {dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dataUrl} alt={`${typeName} 的分享海报`} className="block h-auto w-full" />
                    ) : (
                      <div className="flex aspect-[9/16] items-center justify-center px-4 text-center text-[12px] text-ink-mute">
                        {busy ? "海报生成中…" : "海报生成失败，可改用文案分享"}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleDownload} className="btn-primary !px-4 !py-2.5 !text-[14px]" disabled={!dataUrl}>
                      下载海报
                    </button>
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="btn-ghost !px-4 !py-2.5 !text-[14px] disabled:opacity-40"
                      disabled={!dataUrl}
                    >
                      直接分享
                    </button>
                  </div>

                  <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink-mute">
                    海报底部内置免责声明；二维码指向 {code} 的型别页。
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {SHARE_TEMPLATES.map((t, i) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTplIndex(i)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition",
                          i === tplIndex ? "bg-violet text-white" : "bg-white/70 text-ink-soft hover:bg-white",
                        )}
                      >
                        {t.category} {i + 1}
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 rounded-2xl border border-white/70 bg-white/70 p-3.5 text-[13px] leading-relaxed text-ink-soft">
                    {currentText}
                  </p>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyText(`${currentText}\n${url}\n\n${SHARE_DISCLAIMER}`);
                        flashCopied(ok ? "文案已复制" : "复制失败，请手动选择");
                      }}
                      className="btn-primary !px-4 !py-2.5 !text-[14px]"
                    >
                      复制文案
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyText(url);
                        flashCopied(ok ? "链接已复制" : "复制失败");
                      }}
                      className="btn-ghost !px-4 !py-2.5 !text-[14px]"
                    >
                      复制链接
                    </button>
                  </div>

                  <p className="mt-3 text-[10.5px] leading-relaxed text-ink-mute">
                    共 {SHARE_TEMPLATES.length} 条模板 · {SHARE_DISCLAIMER}
                  </p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
                  role="status"
                  aria-live="polite"
                >
                  <span className="rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white shadow-lg">{copied}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
