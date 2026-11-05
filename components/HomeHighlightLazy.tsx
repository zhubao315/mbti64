"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * 分享链接高亮入口（?type=CODE）。
 *
 * 只有 URL 带 ?type= 时才把真正的卡片组件（含 64 型数据表）拉下来，
 * 普通访问零额外请求、零额外求值——64 型数据不进首包 JS。
 */
const HomeHighlight = dynamic(() => import("@/components/HomeHighlight"), { ssr: false });

export default function HomeHighlightLazy() {
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("type");
    setWanted(Boolean(v));
  }, []);

  if (!wanted) return null;
  return <HomeHighlight />;
}
