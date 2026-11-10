"use client";

import dynamic from "next/dynamic";

/**
 * 教学轮播延迟加载：折叠在首屏之外，不参与首屏水合。
 */
const TeachingCarousel = dynamic(() => import("@/components/TeachingCarousel"), {
  ssr: false,
  loading: () => <div className="card h-[300px]" aria-hidden />,
});

export default function TeachingLazy() {
  return <TeachingCarousel />;
}
