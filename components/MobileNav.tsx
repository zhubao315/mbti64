"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { List, X } from "@phosphor-icons/react";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * 移动端导航
 * - 按钮而非 <details>，具备 aria-expanded / aria-controls
 * - Esc 关闭并把焦点还给按钮
 * - 选择链接后自动关闭
 */
export default function MobileNav({ links }: { links: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-[10px] text-navy transition hover:bg-surface-hover"
        aria-label={open ? "关闭导航菜单" : "打开导航菜单"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} aria-hidden /> : <List size={20} aria-hidden />}
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-panel border border-brand-border bg-white shadow-lift"
        >
          <ul className="p-2 text-[14px] font-medium text-ink-soft">
            {links.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center rounded-[10px] px-3 transition hover:bg-surface-hover hover:text-navy"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
