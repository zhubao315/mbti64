import { SITE_DESC, SITE_NAME, absoluteUrl } from "@/lib/site";

/** 全站结构化数据：WebSite + Organization（帮助搜索引擎识别站点主体）。 */
export default function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: "MBTI64",
      url: absoluteUrl("/"),
      description: SITE_DESC,
      inLanguage: "zh-CN",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/assets/brand/icon-512.png"),
      description: "64 型人格 · 自我认知探索平台",
    },
  ];

  return (
    <script
      type="application/ld+json"
      // 内容为本地常量，不含用户输入
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
