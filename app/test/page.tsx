import type { Metadata } from "next";
import TestClient from "@/components/TestClient";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "开始测评",
  alternates: { canonical: absoluteUrl("/test/") },
  description:
    "120 道本土化情景题（60 题精简版），六维计分，答完立刻得到你的 64 型人格与稀有度排名。进度自动保存在本机，可随时中断续答。",
  robots: { index: true, follow: true },
};

export default function TestPage() {
  return <TestClient />;
}
