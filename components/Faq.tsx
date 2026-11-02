import { TOTAL_QUESTIONS, QUICK_QUESTIONS } from "@/data/questions";
import { PRIOR_TABLE, rarityPyramid } from "@/lib/rarity";
import { DISCLAIMER_FULL } from "@/components/DisclaimerBar";

/**
 * 首页 FAQ
 *
 * 用原生 <details>：无 JS、可键盘操作、默认折叠不占屏，搜索引擎也能读到内容。
 * 顺带输出 FAQPage 结构化数据（和页面上可见答案完全一致，不做隐藏式 SEO）。
 */

const FAQS = [
  {
    q: "64 型是怎么算出来的？",
    a: `四个基础维度（能量 E/I、信息 S/N、决策 T/F、节奏 J/P）先组合出 16 个基础型；再加上两个后缀维度——自我姿态 A/C（坚定 / 内省）与变化偏好 O/H（探索 / 守成），每个基础型分 4 种调性，16 × 4 = 64 型。后缀字母由二选一题投票决定，票数不足 2/3 会标为「摇摆型」。`,
  },
  {
    q: "为什么我的结果和 MBTI 官方测试不一样？",
    a: "本站的题目、计分与型别命名都是独立设计的中文原创内容，不是任何商标测评的官方版本。四个基础字母的语义与大众熟悉的 MBTI 接近，但后缀 A/C、O/H 与稀有度体系是本项目新增的，用来描述你在压力下和面对变化时的调性。",
  },
  {
    q: "结果是绝对准确的吗？",
    a: "不是。它是基于你自陈答案的一次结构化整理，属于娱乐与自我探索工具，不构成心理诊断。人格是流动的：同一周里换个心情重测，结果也可能落在相邻的型别上。把它当作一个重新认识自己的入口，而不是标签。",
  },
  {
    q: "会收集我的答题数据吗？",
    a: "不会。答题记录、结果与解锁状态都只存在你当前浏览器的 localStorage 里，关掉浏览器再回来还能接着答。站内没有账号体系，也不会上传你的答案。",
  },
  {
    q: "为什么完整报告要付费？",
    a: "基础结果（型别、六维雷达、稀有度排名、相近与互补型别）永久免费。完整报告包含优势清单、盲区提醒、30 天成长路径与四张关系/职场/副业/社交指南卡。当前页面里的付费按钮是 Demo，不会真正扣费。",
  },
  {
    q: "要答多久？",
    a: `${QUICK_QUESTIONS} 题精简版大约 8 分钟，${TOTAL_QUESTIONS} 题完整版大约 15–20 分钟。中途可以随时退出，进度会保存在本机，下次继续。`,
  },
  {
    q: "「万里挑一」是真的万里挑一吗？",
    a: `档位是相对 64 型内部的排名分桶：最稀有的 ${rarityPyramid(PRIOR_TABLE)[0].count} 型会被标成「万里挑一」，但六维联合概率本身只能落在 0.6%–3.2% 区间。具体人数请看每 1000 人约几人 —— 那才是概率换算值，档位名只是体感标签。`,
  },
];

export default function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="mt-10">
      <h2 className="section-title">常见问题</h2>
      <p className="section-sub">关于算法、数据与付费，先把话说清楚。</p>

      <div className="mt-4 space-y-2">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-3xl border border-white/70 bg-white/55 px-5 py-4 transition hover:bg-white/75">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14.5px] font-bold text-ink marker:hidden">
              {f.q}
              <span aria-hidden className="shrink-0 text-[15px] font-normal text-violet transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2.5 text-[13px] leading-[1.85] text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-mute">⚠️ {DISCLAIMER_FULL}</p>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
