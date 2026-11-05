"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { GROUP_META, type GroupKey } from "@/data/schema";
import { withBasePath } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 64 型人格矩阵（首页 Section 06）
 *
 * 数据由服务端以轻量索引传入，客户端只负责筛选与搜索，
 * 不把 64 份长文详情打进首页 JS。
 */
export interface MatrixItem {
  code: string;
  name: string;
  base: string;
  group: GroupKey;
  tagline: string;
}

export interface MatrixBaseOption {
  code: string;
  cn: string;
}

const GROUP_TABS: Array<{ key: GroupKey | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "analyst", label: "分析师" },
  { key: "diplomat", label: "外交家" },
  { key: "guardian", label: "守护者" },
  { key: "adventurer", label: "冒险家" },
];

const PREVIEW_COUNT = 12;

export default function TypeMatrix({
  items,
  baseOptions,
}: {
  items: MatrixItem[];
  baseOptions: MatrixBaseOption[];
}) {
  const [group, setGroup] = useState<GroupKey | "all">("all");
  const [base, setBase] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const hasFilter = group !== "all" || base !== "all" || query.trim() !== "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (group !== "all" && item.group !== group) return false;
      if (base !== "all" && item.base !== base) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.base.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
      );
    });
  }, [items, group, base, query]);

  const visible = hasFilter || expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);

  function reset() {
    setGroup("all");
    setBase("all");
    setQuery("");
    setExpanded(false);
  }

  return (
    <div className="mt-5">
      {/* ---------------------------------------------------------- 筛选栏 */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {GROUP_TABS.map((tab) => {
            const active = group === tab.key;
            const meta = tab.key === "all" ? null : GROUP_META[tab.key];
            const count =
              tab.key === "all" ? items.length : items.filter((item) => item.group === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setGroup(tab.key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition",
                  active ? "border-transparent" : "border-line bg-white text-ink-soft hover:bg-surface-hover",
                )}
                style={active && meta ? { background: meta.soft, color: meta.text } : undefined}
              >
                {active && tab.key === "all" && <span className="h-2 w-2 rounded-full bg-navy" aria-hidden />}
                {meta && (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: meta.color }}
                  />
                )}
                {tab.label}
                <span className="text-[10.5px] font-medium opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">搜索人格代码或名称</span>
            <MagnifyingGlass
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索完整代码或名称，如 INFJ-A-O、点灯人"
              className="h-11 w-full rounded-[10px] border border-line bg-white pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-mute focus:border-navy focus:outline-none"
            />
          </label>

          <select
            aria-label="按基础人格筛选"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="h-11 rounded-[10px] border border-line bg-white px-3 text-[13px] font-medium text-ink-soft focus:border-navy focus:outline-none sm:w-44"
          >
            <option value="all">全部基础型</option>
            {baseOptions.map((b) => (
              <option key={b.code} value={b.code}>
                {b.code} · {b.cn}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-mute">
          <p>
            共 {items.length} 型
            {hasFilter && `，匹配 ${filtered.length} 型`}
          </p>
          {hasFilter && (
            <button type="button" onClick={reset} className="font-semibold text-navy hover:underline">
              清空筛选
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- 矩阵 */}
      {visible.length === 0 ? (
        <p className="mt-6 rounded-panel border border-dashed border-line bg-white px-5 py-10 text-center text-[13px] text-ink-mute">
          没有匹配的人格，换个关键词或清空筛选试试。
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => {
            const meta = GROUP_META[item.group];
            return (
              <Link
                key={item.code}
                href={`/type/${item.code}`}
                prefetch={false}
                className="card card-hover group flex items-center gap-2.5 p-2.5"
              >
                <span
                  aria-hidden
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] border border-line"
                  style={{ background: meta.soft }}
                >
                  <img
                    src={withBasePath(`/assets/portraits-light/thumb-512/${item.code}-thumb-512.webp`)}
                    alt=""
                    width={44}
                    height={44}
                    loading="lazy"
                    decoding="async"
                    className="portrait-blob"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <span className="font-mono text-[10.5px] font-bold tracking-[0.04em] text-ink-mute">
                      {item.code}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-bold text-navy">{item.name}</span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-ink-mute">{item.tagline}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {!hasFilter && filtered.length > PREVIEW_COUNT && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="btn-ghost !px-5 !py-2.5 !text-[13px]"
          >
            {expanded ? "收起，只看前 12 型" : `展开全部 ${filtered.length} 型`}
          </button>
        </div>
      )}
    </div>
  );
}
