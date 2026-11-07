import type { Metadata } from "next";
import BrandLogo from "@/components/BrandLogo";
import { SITE_NAME, SITE_DESC, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `关于 · ${SITE_NAME}`,
  description: "了解 MBTI64 的设计理念、算法模型与使用边界——六维倾向 × 自我姿态 × 变化偏好，探索独特的自己。",
  alternates: { canonical: absoluteUrl("/about/") },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <div className="mb-5 inline-flex items-center gap-3">
          <BrandLogo size={36} />
          <span className="text-[11px] font-bold tracking-[0.18em] text-ink-mute">ABOUT</span>
        </div>
        <h1 className="font-sans text-3xl font-bold leading-tight text-navy sm:text-4xl">关于 MBTI64</h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">{SITE_DESC}</p>
      </header>

      <section className="prose-type">
        <h2 className="section-title mb-3 mt-10">我们的视角</h2>
        <p>
          传统 MBTI 把人格切成 16 块，每块像一个静态的类别。但人不是框里的标签——我们在不同情境下会表现出不同的自己。
          MBTI64 把人格看作六个独立维度的连续谱系：六维倾向 × 自我姿态 × 变化偏好 = 64 种独特的人格组合。
        </p>

        <h2 className="section-title mb-3 mt-10">六维模型</h2>
        <p>
          每个维度都是一条连续的光谱，两端不代表"好 / 坏"，只代表"倾向 / 另一侧"。
          我们不会把任何人归类，只会告诉你在每个光谱上的位置——以及这些位置如何与他人匹配。
        </p>
        <ul className="ml-5 list-disc space-y-1 text-[14px] text-ink-soft">
          <li><strong>EI</strong> 外向 / 内向 · 能量来源</li>
          <li><strong>SN</strong> 实感 / 直觉 · 信息接收方式</li>
          <li><strong>TF</strong> 思考 / 情感 · 判断方式</li>
          <li><strong>JP</strong> 计划 / 探索 · 生活取向</li>
          <li><strong>AC</strong> 坚定 / 内省 · 自我姿态（后缀）</li>
          <li><strong>OH</strong> 探索 / 守成 · 变化偏好（后缀）</li>
        </ul>

        <h2 className="section-title mb-3 mt-10">四大人格族群</h2>
        <p>
          16 种基础人格可以归入四大族群：分析师、外交家、守护者、冒险家。
          族群之间没有高低，只有气质与价值的不同。后缀 A/C/O/H 进一步在族群内部做细分，让 64 型模型既保持简洁又保留精度。
        </p>

        <h2 className="section-title mb-3 mt-10">关于准确度</h2>
        <p>
          MBTI64 的所有结果仅用于娱乐与自我探索，<strong>不构成心理咨询、诊断或任何医疗建议</strong>。
          人格是流动的，任何测评都不能定义一个人。
          如果你正经历持续的情绪困扰，请寻求专业心理服务。
        </p>

        <h2 className="section-title mb-3 mt-10">关于本书</h2>
        <p>
          MBTI64 同时也是一套完整的人格认知工程，包含 64 型详注、六大族群叙事、30 天微行为重塑计划等内容。
          如果你觉得这个模型有帮助，欢迎进一步探索完整版的《千分之一的你》。
        </p>
      </section>
    </article>
  );
}
