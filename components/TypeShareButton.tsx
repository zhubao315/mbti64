"use client";

import { ShareFat } from "@phosphor-icons/react";

/**
 * 型别详情页的分享按钮（navigator.share / clipboard）
 * 必须是 client 组件，否则 Next.js 在静态导出时会拒绝把 event handler 序列化到 client boundary。
 */
export default function TypeShareButton({ url }: { url: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof navigator === "undefined") return;
        if (navigator.share) navigator.share({ url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
      }}
      className="btn-ghost !px-5 !py-2.5 !text-[14px]"
    >
      <ShareFat size={14} aria-hidden />
      分享
    </button>
  );
}
