"use client";

import dynamic from "next/dynamic";
import type { PyramidLayerData } from "@/components/PyramidExplorer";

/**
 * 交互金字塔延迟加载：折叠在首屏之外，不参与首屏水合。
 * 占位高度与实际卡片接近，放在 section-lazy（content-visibility:auto）内不会引起可见位移。
 */
const PyramidExplorer = dynamic(() => import("@/components/PyramidExplorer"), {
  ssr: false,
  loading: () => <div className="card h-[540px]" aria-hidden />,
});

export default function PyramidLazy({ layers, className }: { layers: PyramidLayerData[]; className?: string }) {
  return <PyramidExplorer layers={layers} className={className} />;
}
