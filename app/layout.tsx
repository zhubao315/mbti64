import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { METADATA_BASE, SITE_DESC, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    default: `${SITE_NAME} · 64 Personalities CN`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: ["64型人格", "人格测试", "稀有度", "MBTI扩展", "性格测评", "人格稀有度排名"],
  applicationName: SITE_NAME,
  authors: [{ name: "64 Personalities CN" }],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · 64 Personalities CN`,
    description: SITE_DESC,
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#fffaf7",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh antialiased">
        <div className="paper-bg" aria-hidden />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-violet-deep focus:shadow-lg"
        >
          跳到主要内容
        </a>

        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/55 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet via-violet-soft to-coral text-[15px] font-black text-white shadow-glow">
                64
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[15px] font-bold tracking-tight text-ink">64 型人格</span>
                <span className="mt-0.5 text-[10.5px] font-medium tracking-[0.14em] text-ink-mute">PERSONALITIES CN</span>
              </span>
            </Link>

            <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-soft sm:gap-3">
              <Link href="/rank" className="rounded-full px-3 py-2 transition hover:bg-violet/10 hover:text-violet-deep">
                稀有榜
              </Link>
              <Link
                href="/test"
                className="rounded-full bg-ink px-4 py-2 text-white transition hover:bg-violet"
              >
                开始测评
              </Link>
            </div>
          </nav>
        </header>

        <main id="main">{children}</main>

        <footer className="mx-auto mt-16 max-w-5xl px-4 pb-16 sm:px-6">
          <div className="hairline mb-6" />
          <div className="flex flex-col gap-4 text-[12.5px] leading-relaxed text-ink-mute sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-semibold text-ink-soft">⚠️ 免责声明</p>
              <p className="mt-1.5">
                本站所有结果仅用于<strong className="text-ink-soft">娱乐与自我探索</strong>，不构成心理咨询、诊断或
                任何医疗建议。人格是流动的，任何测评都不能定义一个人。若你正经历持续的情绪困扰，请寻求专业心理服务。
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p>© {new Date().getFullYear()} 64 Personalities CN</p>
              <p className="mt-1">付费完整报告为 Demo 功能</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
