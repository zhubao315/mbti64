import type { Metadata } from "next";
import ResultClient from "@/components/ResultClient";

export const metadata: Metadata = {
  title: "我的结果",
  description: "你的 64 型人格结果、六维雷达图、稀有度金字塔与分享海报。",
  // 结果完全由本机答题数据生成，没有独立可索引的内容
  robots: { index: false, follow: false },
};

/**
 * 结果页的 LCP 元素是主卡里的角色插画，而它是哪一个型别只有 JS 水合后才知道。
 * 这段内联脚本在 <body> 最前面执行，按 localStorage 里的结果快照提前发起 preload，
 * 把图片等待从「JS 下载 + 解析 + 水合之后」提前到「HTML 刚解析到就发请求」。
 */
const PRELOAD_SCRIPT = `
(function(){
  try {
    var raw = localStorage.getItem("p64:result:v1");
    var code = raw ? (JSON.parse(raw).code || "") : "";
    if (!code) return;
    var m = window.location.pathname.match(/^\\/([^/]+)/);
    var base = (m && m[1] === "mbti64") ? "/mbti64" : "";
    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.type = "image/webp";
    link.href = base + "/assets/portraits-light/thumb-512/" + code + "-thumb-512.webp";
    link.fetchPriority = "high";
    document.head.appendChild(link);
  } catch (e) {}
})();
`;

export default function ResultPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
      <ResultClient />
    </>
  );
}
