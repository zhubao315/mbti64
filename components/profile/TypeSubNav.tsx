"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface SubNavItem {
  id: string;
  label: string;
}

export interface TypeSubNavProps {
  items: SubNavItem[];
  /** 顶部固定栏高度（px），用于 scroll-margin 偏移 */
  offset?: number;
}

/**
 * 移动端吸顶锚点导航：型别详情页在 375px 视口下超过 3500px，
 * 没有目录会让用户连续滑动近 10 屏。
 * 使用 IntersectionObserver 做滚动高亮，遵守 prefers-reduced-motion。
 */
export default function TypeSubNav({ items, offset = 96 }: TypeSubNavProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!link) return;
      const id = link.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior });
      setActive(id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: `-${offset}px 0px -60% 0px`, threshold: 0 },
    );

    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    }
    document.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
    };
  }, [items, offset]);

  return (
    <nav
      aria-label="页面内导航"
      className="sticky top-14 z-20 -mx-4 mt-6 border-y border-line bg-white/90 px-4 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-3"
    >
      <ul className="no-scrollbar flex gap-1 overflow-x-auto py-2">
        {items.map((it) => (
          <li key={it.id} className="shrink-0">
            <a
              href={`#${it.id}`}
              aria-current={active === it.id ? "true" : undefined}
              className={cn(
                "inline-flex min-h-[36px] items-center rounded-full px-3 text-[12.5px] font-semibold transition",
                active === it.id
                  ? "bg-navy text-white"
                  : "text-ink-soft hover:bg-surface-hover",
              )}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
