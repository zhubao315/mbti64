/**
 * 分享文案库
 *
 * 每条模板带 {placeholders}，由 fillTemplate 注入结果数据。
 * 分四类：自嘲 / 炫耀 / 邀请 / 反差，覆盖不同人格的分享语气。
 * 所有文案都内含免责声明（或由 UI 固定展示），不承诺任何「权威结论」。
 */

export interface ShareTemplate {
  id: string;
  category: "自嘲" | "炫耀" | "邀请" | "反差";
  text: string;
}

export interface ShareVars {
  typeName: string;
  code: string;
  tierName: string;
  per1000: string;
  rankLabel: string;
  strongest: string;
  strongestPercent: string;
}

export const SHARE_DISCLAIMER =
  "娱乐与自我探索为目的，不构成心理咨询或诊断。";

export const SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: "t1",
    category: "自嘲",
    text: "测出来我是「{typeName}」{code}，稀有度{tierName}，{per1000}。行吧，我确实不太像一个正常人。",
  },
  {
    id: "t2",
    category: "自嘲",
    text: "别人都在找自己的人生答案，我测出来是「{typeName}」，全国排名第 {rankLabel} 稀有。原来我的问题不是没答案，是答案太冷门。",
  },
  {
    id: "t3",
    category: "自嘲",
    text: "我的 {strongest} 高达 {strongestPercent}，难怪我每次都觉得自己是对的——数据支持我。😂",
  },
  {
    id: "t4",
    category: "炫耀",
    text: "64 型里排第 {rankLabel} 稀有：「{typeName}」{code}，{per1000}。万里挑一不至于，但确实不多见。",
  },
  {
    id: "t5",
    category: "炫耀",
    text: "测了 30 分钟，得到一个 {tierName} 的结果：{typeName}（{code}）。{per1000} 的人和我一样。",
  },
  {
    id: "t6",
    category: "炫耀",
    text: "我的稀有度是 {tierName} · {per1000}。别问我为什么这么少见，我从小就知道自己不好归类。",
  },
  {
    id: "t7",
    category: "邀请",
    text: "120 道题，测出你是 64 型里的哪一种，还有稀有度排名。我的是 {typeName}，你呢？",
  },
  {
    id: "t8",
    category: "邀请",
    text: "来做这个测一下，我们可能不是同一个型——据说是 {tierName} 级别的分歧。我的结果是 {code}。",
  },
  {
    id: "t9",
    category: "邀请",
    text: "60 题精简版十分钟搞定。我测出「{typeName}」，{per1000}。想看看你的是哪一种稀有。",
  },
  {
    id: "t10",
    category: "反差",
    text: "朋友一直觉得我很好相处。测出来我是「{typeName}」+ {tierName}，{per1000}。所以他大概一直在跟一个错觉交往。",
  },
  {
    id: "t11",
    category: "反差",
    text: "我以为自己是标准款，结果 {per1000}。原来我不是普通，我是小众。",
  },
  {
    id: "t12",
    category: "反差",
    text: "上班的时候我是另外一个人，测出来才发现：真正的我是「{typeName}」，稀有度{tierName}。",
  },
  {
    id: "t13",
    category: "邀请",
    text: "6 个维度、64 种结果、7 档稀有度。我在「{typeName}」这一格，稀有度 {tierName}。来对一下表？",
  },
];

export function fillTemplate(text: string, vars: ShareVars): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = (vars as unknown as Record<string, string>)[key];
    return value ?? match;
  });
}

export function templatesByCategory(): Record<ShareTemplate["category"], ShareTemplate[]> {
  const out = { 自嘲: [], 炫耀: [], 邀请: [], 反差: [] } as Record<ShareTemplate["category"], ShareTemplate[]>;
  for (const t of SHARE_TEMPLATES) out[t.category].push(t);
  return out;
}

/** 分享落地 URL（Demo：站内型别页 + utm） */
export function shareUrl(code: string, origin = ""): string {
  const path = `/type/${code}?utm_source=share&utm_medium=poster`;
  return origin ? `${origin}${path}` : path;
}

/** 复制到剪贴板的兼容实现 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落到下面的兜底 */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
