import type { Metadata } from "next";
import type { ReactNode } from "react";

/** 海报预览是内部设计工具，不进入搜索索引；同时由 robots.ts 屏蔽抓取。 */
export const metadata: Metadata = {
  title: "海报预览 · 内部工具",
  robots: { index: false, follow: false },
};

export default function PosterPreviewLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
