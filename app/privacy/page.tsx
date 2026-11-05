import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `隐私政策 · ${SITE_NAME}`,
  description: `${SITE_NAME} 隐私政策——我们如何收集、使用和保护你的数据。`,
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <span className="text-[11px] font-bold tracking-[0.18em] text-ink-mute">PRIVACY</span>
        <h1 className="mt-2 font-sans text-3xl font-bold leading-tight text-navy sm:text-4xl">隐私政策</h1>
        <p className="mt-4 text-[13px] text-ink-mute">最后更新：2026 年 11 月</p>
      </header>

      <section className="prose-type">
        <h2 className="section-title mb-3 mt-8">我们收集什么</h2>
        <p>
          MBTI64 是一个<strong>纯客户端</strong>的网站——我们<strong>不部署后端服务器</strong>，
          所有数据都存在你的浏览器本地。具体来说：
        </p>
        <ul className="ml-5 list-disc space-y-1 text-[14px] text-ink-soft">
          <li>你在测评中选择的答案（<code className="font-mono">localStorage</code>，键 <code className="font-mono">p64:v1</code>）</li>
          <li>你的答题进度（当前题号、是否开始 / 完成）</li>
          <li>彩蛋触发记录、Demo 付费解锁状态</li>
          <li>我们<strong>不</strong>收集你的姓名、邮箱、手机号、地理位置或任何可识别身份的信息</li>
          <li>我们<strong>不</strong>使用第三方分析服务（如 Google Analytics、Hotjar）</li>
        </ul>

        <h2 className="section-title mb-3 mt-8">数据去哪了</h2>
        <p>
          答案、进度、状态全部存在你自己的浏览器 <code className="font-mono">localStorage</code> 里。
          关闭浏览器、换设备、或在隐私窗口访问，都不会自动同步。
          你可以随时清除浏览器数据来删除这些信息。
        </p>

        <h2 className="section-title mb-3 mt-8">Cookies 和追踪</h2>
        <p>
          本站<strong>不使用</strong>任何 cookie 来追踪你。也不使用任何第三方广告或分析脚本。
          我们的服务完全托管在 GitHub Pages，访问日志由 GitHub 提供通用访问日志，
          但这些日志不包含可识别你身份的信息。
        </p>

        <h2 className="section-title mb-3 mt-8">分享海报与链接</h2>
        <p>
          结果页生成的分享海报和复制链接只包含你的人格编码（如 INTJ-A-O）和名称，
          <strong>不包含你的答题答案</strong>。我们不会把你的答案上传到任何服务器。
        </p>

        <h2 className="section-title mb-3 mt-8">未成年用户</h2>
        <p>
          我们不会有意识地收集未满 13 岁用户的个人信息。如果你是未成年人，请在监护人陪同下使用本站。
        </p>

        <h2 className="section-title mb-3 mt-8">政策变更</h2>
        <p>
          如果我们将来调整本站的架构或数据处理方式（例如加入后端服务），我们会在这里更新本政策，
          并在网站首页显著位置告知。
        </p>
      </section>
    </article>
  );
}
