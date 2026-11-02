"use client";

import { useState } from "react";
import { copyText } from "@/lib/share";
import { cn } from "@/lib/utils";

/**
 * 「复制这一型的链接」
 *
 * 型别页是分享落地页：有人把链接发到群里，其他人点进来看到的是同一型。
 * 用 navigator.clipboard，失败时回落到 execCommand（见 lib/share.copyText）。
 */
export default function ShareLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handle() {
    const ok = await copyText(url);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={cn("btn-ghost !px-5 !py-2.5 !text-[14px]", copied && "!text-avocado-deep", className)}
      aria-live="polite"
    >
      {copied ? "链接已复制 ✓" : "复制这一型的链接"}
    </button>
  );
}
