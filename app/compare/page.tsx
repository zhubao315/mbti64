import type { Metadata } from "next";
import CompareClient from "@/components/compare/CompareClient";

export const metadata: Metadata = {
  title: "双人合盘",
  description:
    "输入两个人的 64 型编码，看看你们在六个维度上怎么撞、怎么合，以及那些没说出口的话。全部计算在浏览器端完成。",
  // 结果取决于用户输入的组合，没有可索引的独立内容
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return <CompareClient />;
}
