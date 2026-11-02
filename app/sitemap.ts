import type { MetadataRoute } from "next";
import { TYPE_CODES } from "@/data/types64";
import { absoluteUrl } from "@/lib/site";

/**
 * 站点地图（构建期静态生成 sitemap.xml）
 * 结果页是本地数据渲染的，不收录；型别页是 SEO 主体，全部列出。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/rank/"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/test/"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  const types: MetadataRoute.Sitemap = TYPE_CODES.map((code) => ({
    url: absoluteUrl(`/type/${code}/`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...core, ...types];
}
