import { CaretDown } from "@phosphor-icons/react/dist/ssr";
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
    q: "MBTI64 是什么？",
    a: "MBTI64 是一个中文原创的人格探索工具。它用 120 道发生在职场、社交、消费和数字生活里的情景题，从六个维度描述你的倾向，最后落在 64 种人格组合中的一种。它不提供心理诊断，也不声称能定义你，只是把「你习惯怎么想、怎么做」整理成一张可读的图。",
  },
  {
    q: "为什么有 64 种人格？",
    a: "四个基础维度（能量 E/I、信息 S/N、决策 T/F、节奏 J/P）先组合出 16 个基础型；再加上两个后缀维度——自我姿态 A/C（坚定 / 内省）与变化偏好 O/H（探索 / 守成），每个基础型分 4 种调性，16 × 4 = 64 型。后缀字母由二选一题投票决定，票数不足 2/3 会标为「摇摆型」。",
  },
  {
    q: "六个维度分别是什么？",
    a: "能量方向 E/I（从人群还是独处补电）、信息方式 S/N（先看细节还是先看趋势）、决策依据 T/F（先算账还是先看人）、生活节奏 J/P（按表执行还是当天再说）、自我姿态 A/C（压力下更信自己还是先自省）、变化偏好 O/H（先上手试新还是先按老办法）。前四维每题五分钟 Likert，后两维混合 Likert 与二选一投票。",
  },
  {
    q: "A/C 和 O/H 是什么？是传统 MBTI 维度吗？",
    a: "不是。A/C（Assertive 坚定 / Cautious 内省）与 O/H（Original 探索 / Habitual 守成）是 MBTI64 自主扩展的两个维度，用来描述你在压力下的姿态和面对变化时的偏好，不属于传统 MBTI 官方体系。它们在结果里以 -A-O、-C-H 这样的后缀出现。",
  },
  {
    q: "测评需要多久？",
    a: `${QUICK_QUESTIONS} 题精简版大约 8 分钟，${TOTAL_QUESTIONS} 题完整版大约 15–20 分钟。中途可以随时退出，进度会保存在本机，下次回来接着答。`,
  },
  {
    q: "测评结果准确吗？",
    a: "它不是绝对准确的。结果是对你自陈答案的一次结构化整理，属于娱乐与自我探索工具，不构成心理诊断。人格是流动的：同一周里换个心情重测，结果也可能落在相邻的型别上。把它当作一个重新认识自己的入口，而不是标签。",
  },
  {
    q: "我的测评数据保存在哪里？",
    a: "只存在你当前浏览器的 localStorage 里（键名 p64:v1），包括答题记录、进度和解锁状态。站内没有账号体系，不上传答案，也不使用第三方统计脚本。换设备或清除浏览器数据后，记录不会跟着走。",
  },
  {
    q: "如何重新测评？",
    a: "在结果页点「重新测评」，或直接重新打开测评页重新作答。新一次作答会覆盖本机的旧进度与旧结果；如果只是想比较，建议先记下当前的人格编码再重测。",
  },
  {
    q: "MBTI64 与官方 MBTI 有什么区别？",
    a: "本站的题目、计分与型别命名都是独立设计的中文原创内容，不是任何商标测评的官方版本。四个基础字母的语义与大众熟悉的 MBTI 接近，但后缀 A/C、O/H 与稀有度体系是本项目新增的，用来描述你在压力下和面对变化时的调性。",
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
    <section id="faq" className="mt-14 scroll-mt-24">
      <h2 className="section-title">常见问题</h2>
      <p className="section-sub">关于模型、算法、数据与准确度，先把话说清楚。</p>

      <div className="mt-4 space-y-2">
        {FAQS.map((f) => (
          <details key={f.q} className="card group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14.5px] font-bold text-navy marker:hidden">
              {f.q}
              <CaretDown
                aria-hidden
                size={16}
                className="shrink-0 text-ink-mute transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="mt-2.5 max-w-[34em] text-[13px] leading-[1.85] text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-mute">{DISCLAIMER_FULL}</p>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
