import type { Metadata } from "next";
import ResultClient from "@/components/ResultClient";

export const metadata: Metadata = {
  title: "我的结果",
  description: "你的 64 型人格结果、六维雷达图、稀有度金字塔与分享海报。",
  // 结果完全由本机答题数据生成，没有独立可索引的内容
  robots: { index: false, follow: false },
};

export default function ResultPage() {
  return <ResultClient />;
}
