"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TYPE_BY_CODE } from "@/data/types64";
import { PRIOR_TABLE, per1000Text } from "@/lib/rarity";
import RarityBadge from "@/components/RarityBadge";

/**
 * 分享链接高亮：/?type=INFJ-A-O 会把对应型别卡顶到首屏
 *
 * 静态导出没有运行时 searchParams，这里直接在客户端读 location.search，
 * 不走 useSearchParams，避免为这个低频功能引入路由订阅与 Suspense 水合。
 */
export default function HomeHighlight() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("type");
    setCode(v && TYPE_BY_CODE[v] ? v : null);
  }, []);

  if (!code) return null;
  const type = TYPE_BY_CODE[code];
  const rarity = PRIOR_TABLE.byCode[code];

  return (
    <div className="mx-auto mb-6 w-full max-w-5xl px-4 sm:px-6">
      <div className="card flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <span className="text-[12px] font-bold text-ink">分享链接</span>
        <span className="min-w-0 flex-1 text-[13.5px] text-ink-soft">
          有人给你分享了 <b className="text-ink">{type.name}</b>（{type.code}）
          {rarity && <span className="text-ink-mute"> · {per1000Text(rarity)}</span>}
        </span>
        {rarity && <RarityBadge tier={rarity.tier} size="sm" />}
        <Link href={`/type/${type.code}`} prefetch={false} className="btn-primary !px-4 !py-2 !text-[13px]">
          查看这一型
        </Link>
      </div>
    </div>
  );
}
