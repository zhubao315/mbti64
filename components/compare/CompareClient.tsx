"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowsLeftRight, Share, X } from "@phosphor-icons/react";
import { BASE_TYPES, getType } from "@/data/types64";
import { DIMS } from "@/data/schema";
import { chemistryReport, QUADRANT_META, type ChemistryReport } from "@/lib/chemistry";
import { readResultSnapshot } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * 双人合盘实验室（客户端）
 *
 * URL 深链：/compare?a=INFJ-C-O&b=ESTP-A-H
 * 静态导出站没有服务端路由，查询参数只能在客户端解析，
 * 所以用 useEffect 读 window.location.search（不用 useSearchParams，
 * 免得静态导出时要求 Suspense 边界）。
 */

const SUFFIX_OPTIONS = [
  { suffix: "A-O", label: "坚定探索" },
  { suffix: "A-H", label: "坚定守成" },
  { suffix: "C-O", label: "审慎探索" },
  { suffix: "C-H", label: "审慎守成" },
];

interface Picker {
  code: string;
  onChange: (code: string) => void;
  label: string;
}

function PickerRow({ picker }: { picker: Picker }) {
  const [base, suffix] = picker.code.split("-");
  const type = getType(picker.code);

  const setBase = (nextBase: string) => {
    picker.onChange(`${nextBase}-${suffix ?? "A-O"}`);
  };
  const setSuffix = (nextSuffix: string) => {
    picker.onChange(`${base ?? "INTJ"}-${nextSuffix}`);
  };

  return (
    <div className="rounded-[12px] border border-line bg-wash p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] font-bold tracking-[0.14em] text-ink-mute">{picker.label}</span>
        <span className="text-[13px] font-bold text-navy">{type.name}</span>
        <span className="font-mono text-[11.5px] text-ink-mute">{type.code}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <select
          aria-label={`${picker.label}基础型`}
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="min-h-[36px] rounded-[8px] border border-line bg-white px-2 text-[12.5px] font-semibold text-navy"
        >
          {BASE_TYPES.map((b) => (
            <option key={b.code} value={b.code}>
              {b.code} {b.cn}
            </option>
          ))}
        </select>
        <select
          aria-label={`${picker.label}后缀状态`}
          value={suffix}
          onChange={(e) => setSuffix(e.target.value)}
          className="min-h-[36px] rounded-[8px] border border-line bg-white px-2 text-[12.5px] font-semibold text-navy"
        >
          {SUFFIX_OPTIONS.map((s) => (
            <option key={s.suffix} value={s.suffix}>
              {s.suffix} · {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function CompareClient() {
  const [a, setA] = useState("INFJ-A-O");
  const [b, setB] = useState("ESTP-C-H");
  const [myCode, setMyCode] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // 深链参数 + 我自己的结果（用于快捷胶囊）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qa = params.get("a");
    const qb = params.get("b");
    if (qa && /^([A-Z]{4})-(A|C)-(O|H)$/.test(qa)) setA(qa);
    if (qb && /^([A-Z]{4})-(A|C)-(O|H)$/.test(qb)) setB(qb);

    const snap = readResultSnapshot();
    if (snap?.code) setMyCode(snap.code);
  }, []);

  const report = useMemo(() => {
    try {
      return chemistryReport({ code: a }, { code: b });
    } catch {
      return null;
    }
  }, [a, b]);

  /**
   * 分享链接：静态导出站没有服务端路由，origin 只能在客户端取，
   * 所以放 state 而不是 useMemo（useMemo 会在预渲染时跑，直接抛 window is not defined）。
   */
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    setShareUrl(`${base}?a=${a}&b=${b}`);
  }, [a, b]);

  const presets = useMemo(() => {
    const out: Array<{ code: string; label: string }> = [];
    if (myCode) {
      out.push({ code: myCode, label: "我" });
      // 我的镜像型：六维全反
      const [base, ac, oh] = myCode.split("-");
      const flip: Record<string, string> = { E: "I", I: "E", S: "N", N: "S", T: "F", F: "T", J: "P", P: "J" };
      const letters = base.split("").map((ch) => flip[ch]).join("");
      out.push({
        code: `${letters}-${ac === "A" ? "C" : "A"}-${oh === "O" ? "H" : "O"}`,
        label: "我的镜像型",
      });
    }
    out.push({ code: "INFJ-A-O", label: "INFJ 坚定探索" });
    out.push({ code: "ESTP-C-H", label: "ESTP 审慎守成" });
    return out;
  }, [myCode]);

  const applyPreset = useCallback(
    (code: string, target: "a" | "b") => {
      if (target === "a") setA(code);
      else setB(code);
    },
    [],
  );

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-mute">
        <p>编码无效，请从下面重新选择两位参与者。</p>
      </div>
    );
  }

  const color = QUADRANT_META[report.quadrant].color;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:pt-10">
      <header className="mb-5">
        <p className="text-[11.5px] font-bold tracking-[0.18em] text-ink-mute">MBTI64 · RELATIONSHIP LAB</p>
        <h1 className="mt-1.5 text-[26px] font-black leading-tight tracking-tight text-navy sm:text-[32px]">
          双人合盘实验室
        </h1>
        <p className="mt-2 max-w-[46em] text-[13px] leading-relaxed text-ink-soft">
          输入两个人的 64 型编码，看看你们在六个维度上怎么撞、怎么合，
          以及那些没说出口的话。全部计算在你的浏览器里完成，不上传任何数据。
        </p>
      </header>

      {/* 选择器 */}
      <section className="card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <PickerRow picker={{ code: a, onChange: setA, label: "参与者 A" }} />
          <PickerRow picker={{ code: b, onChange: setB, label: "参与者 B" }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-ink-mute">快捷：</span>
          {presets.map((p) => (
            <button
              key={`${p.label}-${p.code}`}
              type="button"
              onClick={() => applyPreset(p.code, "a")}
              className="min-h-[32px] rounded-full border border-line bg-wash px-2.5 text-[11.5px] font-semibold text-ink-soft transition hover:border-navy/40"
            >
              {p.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" aria-hidden />
          <button
            type="button"
            onClick={() => {
              setA(b);
              setB(a);
            }}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-wash px-2.5 text-[11.5px] font-semibold text-ink-soft transition hover:border-navy/40"
          >
            <ArrowsLeftRight size={13} aria-hidden />
            交换 A / B
          </button>
        </div>
      </section>

      {/* 关系象限 */}
      <section className="mt-4 card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-black tracking-tight" style={{ color }}>
            {report.quadrantLabel}
          </h2>
          <span className="text-[11.5px] text-ink-mute">
            六维 L1 距离 {report.distance} · {report.a.code} ↔ {report.b.code}
          </span>
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{report.quadrantNote}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Meter label="契合度" value={report.score} hint="越高压根越省力" color="#4CAF6B" />
          <Meter label="张力指数" value={report.tension} hint="越高越容易吵，也越有势能" color="#C97A2B" />
        </div>

        <p className="mt-3 rounded-[10px] border border-line bg-wash px-3.5 py-3 text-[13px] font-medium leading-relaxed text-navy">
          {report.headline}
        </p>
      </section>

      {/* 六维对撞 */}
      <section className="mt-4 card p-4 sm:p-5">
        <h2 className="text-[15px] font-bold tracking-tight text-navy">六维逐项对撞</h2>
        <p className="mt-0.5 text-[11.5px] text-ink-mute">
          同侧是最省力的地方，对撞是最容易互相误读的地方。
        </p>
        <ul className="mt-3 space-y-2.5">
          {report.dims.map((row) => (
            <li key={row.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-bold text-navy">{row.name}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
                    row.sameSide
                      ? "border-line bg-wash text-ink-mute"
                      : "border-[#F0D9A8] bg-[#FFF8E8] text-[#7A5600]",
                  )}
                >
                  {row.sameSide ? "同侧" : "对撞"}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                <DimBar label={`A ${report.a.code.split("-")[0]}`} value={row.aStrength} color="#4A90E2" />
                <DimBar label={`B ${report.b.code.split("-")[0]}`} value={row.bStrength} color="#C97A2B" />
              </div>
              <p className="mt-1 text-[11px] text-ink-mute">{row.note}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[10px] border border-line bg-wash px-3 py-2.5">
            <p className="text-[11px] font-semibold text-ink-mute">最默契</p>
            <p className="mt-0.5 text-[13px] font-bold text-navy">
              {report.allies.length ? report.allies.map((k) => DIMS[k].name).join("、") : "—"}
            </p>
          </div>
          <div className="rounded-[10px] border border-line bg-wash px-3 py-2.5">
            <p className="text-[11px] font-semibold text-ink-mute">最容易误读</p>
            <p className="mt-0.5 text-[13px] font-bold text-navy">
              {report.frictions.length ? report.frictions.map((k) => DIMS[k].name).join("、") : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* 潜台词翻译器 */}
      <section className="mt-4 card p-4 sm:p-5">
        <h2 className="text-[15px] font-bold tracking-tight text-navy">吵架潜台词翻译器</h2>
        <p className="mt-0.5 text-[11.5px] text-ink-mute">
          把刺耳的原话翻成「对方真正在怕什么」，再给出可以直接照着念的接话。
        </p>
        <div className="mt-3 space-y-3">
          {report.scripts.map((s) => (
            <div key={s.scene} className="rounded-[12px] border border-line bg-wash p-3.5">
              <p className="text-[13px] font-bold text-navy">{s.scene}</p>

              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[8px] border border-line bg-white p-2.5">
                  <p className="text-[11px] font-semibold text-ink-mute">
                    A（{report.a.code}）说
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink">「{s.aSays}」</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">{s.aMeans}</p>
                </div>
                <div className="rounded-[8px] border border-line bg-white p-2.5">
                  <p className="text-[11px] font-semibold text-ink-mute">
                    B（{report.b.code}）说
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink">「{s.bSays}」</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">{s.bMeans}</p>
                </div>
              </div>

              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <p className="rounded-[8px] border border-line bg-white p-2.5 text-[12px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-navy">A 可以这样接：</span>
                  {s.aReply}
                </p>
                <p className="rounded-[8px] border border-line bg-white p-2.5 text-[12px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-navy">B 可以这样接：</span>
                  {s.bReply}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="btn-primary inline-flex items-center gap-1.5 !px-5 !py-2.5 !text-[14px]"
        >
          <Share size={14} aria-hidden />
          生成双人合盘卡
        </button>
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}?a=${a}&b=${b}`;
            void navigator.clipboard?.writeText(url);
          }}
          className="btn-ghost !px-5 !py-2.5 !text-[14px]"
        >
          复制这条合盘链接
        </button>
        <Link href="/result" className="btn-ghost !px-5 !py-2.5 !text-[14px]">
          回到我的结果
        </Link>
      </div>

      {shareOpen ? (
        <ChemShareModal report={report} url={shareUrl} onClose={() => setShareOpen(false)} />
      ) : null}
    </div>
  );
}

function Meter({ label, value, hint, color }: { label: string; value: number; hint: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-wash px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-bold text-navy">{label}</span>
        <span className="text-[18px] font-black tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10.5px] text-ink-mute">{hint}</p>
    </div>
  );
}

function DimBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10.5px] text-ink-mute">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[10.5px] tabular-nums text-ink-mute">{value}%</span>
    </div>
  );
}

/** 双人合盘分享卡弹层 */
function ChemShareModal({
  report,
  url,
  onClose,
}: {
  report: ChemistryReport;
  url: string;
  onClose: () => void;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { renderChemPoster } = await import("@/lib/compare-poster");
      const c = await renderChemPoster({ report, url });
      if (alive) {
        setCanvas(c);
        setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [report, url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4" role="dialog" aria-modal="true" aria-label="双人合盘分享卡">
      <button type="button" aria-label="关闭" className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-full w-full max-w-md overflow-y-auto rounded-[14px] bg-white p-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-wash text-ink-soft"
          aria-label="关闭"
        >
          <X size={15} aria-hidden />
        </button>
        {busy ? (
          <div className="grid h-[520px] place-items-center text-[13px] text-ink-mute">正在绘制…</div>
        ) : canvas ? (
          <>
            <canvas ref={setCanvas} width={canvas.width} height={canvas.height} className="w-full rounded-[10px] border border-line" />
            <button
              type="button"
              onClick={async () => {
                const { downloadChemPoster } = await import("@/lib/compare-poster");
                downloadChemPoster(canvas);
              }}
              className="btn-primary mt-3 w-full !py-2.5 !text-[14px]"
            >
              保存图片
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
