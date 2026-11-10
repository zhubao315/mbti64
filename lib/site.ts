/**
 * 站点常量（同时兼容「根域名部署」与「GitHub Pages 子路径部署」）
 *
 * GitHub Pages 的项目站点地址形如 https://<user>.github.io/<repo>/，
 * 因此构建时注入 NEXT_PUBLIC_BASE_PATH=/<repo>，Next 的 <Link> 会自动加前缀。
 * 但二维码 / 分享链接 / OG 图这些「拼出来的绝对地址」必须自己拼，
 * 所以统一走 absoluteUrl()，避免出现 /mbti64/mbti64/... 这种双前缀。
 */

export const SITE_NAME = "MBTI64";
export const SITE_NAME_EN = "64 Personalities";

export const SITE_DESC =
  "MBTI64 用六维倾向 × 决策姿态 × 变化策略，组合出 64 型人格。120 道本土化情景题，给出六维雷达、稀有度排名与分享海报。娱乐与自我探索为目的，不构成心理咨询或诊断。";

/** 纯 origin，无结尾斜杠，例如 https://zhubao315.github.io */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://zhubao315.github.io").replace(/\/$/, "");

/** Next basePath，必须以 / 开头且无结尾斜杠；根路径部署时为空串 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "").replace(/\/$/, "");

/** 带 basePath 的站内绝对路径："/type/INFJ-A-O" → "/mbti64/type/INFJ-A-O" */
export function withBasePath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}

/** 完整可分享 URL（用于二维码、复制链接、OG） */
export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${withBasePath(path)}`;
}

/** metadataBase：让 Next 自动生成绝对 OG 地址 */
export const METADATA_BASE = new URL(`${SITE_ORIGIN}${BASE_PATH || "/"}`);
