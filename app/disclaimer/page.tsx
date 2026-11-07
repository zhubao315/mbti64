import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `免责声明 · ${SITE_NAME}`,
  description: `${SITE_NAME} 免责声明：所有测评结果仅用于自我探索参考，不构成临床诊断，也不代表经验证的人口统计结论。`,
  alternates: { canonical: absoluteUrl("/disclaimer/") },
};

const ITEMS = [
  {
    title: "自我探索参考，不是临床诊断",
    body: "本站测评基于自陈式问卷，用于帮助你整理对自己的观察与语言。它不是心理评估工具，不能用于诊断任何心理或精神健康问题，也不能替代专业咨询、治疗或医疗建议。",
  },
  {
    title: "不是经验证的人口统计结论",
    body: "64 型分布、稀有度档位与「每 1000 人约 X 人」均来自模型的理论先验概率，当前站点没有真实样本统计。档位名称（如「万里挑一」）只是 64 型内部的相对等级，不代表真实人口比例。",
  },
  {
    title: "不是职业适合性的唯一依据",
    body: "人格倾向与职业表现有关，但不是决定因素。请勿仅凭测评结果选择专业、职业或评估他人；能力、兴趣、经验、环境与机会同样重要。",
  },
  {
    title: "人格是流动的，不是宿命",
    body: "结果反映你在作答当下的倾向，会随经历、环境与状态变化。任何类型都没有优劣之分，也不存在「最好的人格」。请避免用结果给自己或他人贴固定标签。",
  },
  {
    title: "关于数据与隐私",
    body: "答题数据默认只保存在你的浏览器本地（localStorage，键 p64:v1），不会上传。分享海报与链接只包含人格编码与名称，不包含答案。清除浏览器数据即可删除本机记录。",
  },
  {
    title: "需要帮助时",
    body: "如果你正经历持续的情绪困扰、危机或伤害自己的想法，请立即联系当地急救电话或专业心理援助机构。本站无法提供紧急支持。",
  },
];

export default function DisclaimerPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <span className="eyebrow">DISCLAIMER</span>
        <h1 className="mt-2 font-sans text-3xl font-bold leading-tight text-navy sm:text-4xl">免责声明</h1>
        <p className="mt-4 text-[13px] text-ink-mute">最后更新：2026 年 11 月</p>
      </header>

      <section className="space-y-8">
        {ITEMS.map((item) => (
          <div key={item.title}>
            <h2 className="text-[18px] font-bold text-navy sm:text-[20px]">{item.title}</h2>
            <p className="prose-type mt-2 text-[14.5px]">{item.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-12 rounded-card border border-line bg-white p-5 text-[13.5px] leading-relaxed text-ink-soft">
        <p>
          继续使用本站即表示你理解并接受以上说明。你也可以查看
          <Link href="/privacy" className="mx-1 font-semibold text-navy underline underline-offset-4">
            隐私政策
          </Link>
          与
          <Link href="/about" className="mx-1 font-semibold text-navy underline underline-offset-4">
            关于本站
          </Link>
          。
        </p>
      </footer>
    </article>
  );
}
