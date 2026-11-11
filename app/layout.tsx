import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import MobileNav from "@/components/MobileNav";
import JsonLd from "@/components/JsonLd";
import { METADATA_BASE, SITE_DESC, SITE_NAME, absoluteUrl, withBasePath } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    default: "MBTI64 · 64 Personalities",
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: ["MBTI64", "64型人格", "人格测试", "稀有度", "性格测评", "人格稀有度排名"],
  applicationName: SITE_NAME,
  authors: [{ name: "MBTI64" }],
  icons: {
    icon: [
      { url: withBasePath("/assets/brand/favicon.svg"), type: "image/svg+xml" },
      { url: withBasePath("/assets/brand/favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: withBasePath("/assets/brand/favicon-16.png"), sizes: "16x16", type: "image/png" },
      { url: withBasePath("/assets/brand/favicon-48.png"), sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: withBasePath("/assets/brand/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "icon", url: withBasePath("/assets/brand/icon-192.png"), sizes: "192x192", type: "image/png" },
      { rel: "icon", url: withBasePath("/assets/brand/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: withBasePath("/site.webmanifest"),
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "MBTI64 · 64 Personalities",
    description: SITE_DESC,
    locale: "zh_CN",
    images: [{ url: absoluteUrl("/og/home.png"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MBTI64 · 64 Personalities",
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0F2747",
  colorScheme: "light",
};

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/test", label: "人格测评" },
  { href: "/rank#groups", label: "64 型人格" },
  { href: "/rank", label: "稀有榜" },
  { href: "/compare", label: "双人合盘" },
  { href: "/about", label: "关于" },
];

const FOOTER_LINKS = [
  { href: "/", label: "首页" },
  { href: "/test", label: "人格测评" },
  { href: "/rank#groups", label: "64 型人格" },
  { href: "/rank", label: "稀有榜" },
  { href: "/about", label: "关于" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/disclaimer", label: "免责声明" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh antialiased">
        <JsonLd />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lift"
        >
          跳到主要内容
        </a>

        <header className="sticky top-0 z-30 border-b border-brand-border bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <Link href="/" aria-label="MBTI64 首页" className="inline-flex min-h-[44px] shrink-0 items-center">
              <BrandLogo size={30} />
            </Link>

            <div className="flex items-center gap-1">
              <ul className="hidden items-center gap-0.5 text-[13.5px] font-medium text-ink-soft lg:flex">
                {NAV_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="inline-flex min-h-[44px] items-center rounded-[10px] px-3 transition hover:bg-surface-hover hover:text-navy"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                href="/test"
                prefetch={false}
                className="inline-flex min-h-[44px] items-center rounded-[10px] bg-navy px-4 text-[13.5px] font-semibold text-white transition hover:bg-navy-deep"
              >
                开始测评
              </Link>

              <MobileNav links={NAV_LINKS} />
            </div>
          </nav>
        </header>

        <main id="main">{children}</main>

        <footer className="mt-16 border-t border-brand-border bg-white">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1.4fr)]">
              <div>
                <BrandLogo size={28} />
                <p className="mt-3 text-[13px] font-semibold text-navy">64 型人格 · 自我认知探索平台</p>
                <p className="mt-1 text-[12px] font-medium tracking-[0.08em] text-ink-mute">
                  64 PERSONALITIES · ONE UNIQUE YOU
                </p>
                <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-ink-soft">
                  六维倾向 × 决策姿态 × 变化策略，探索独特的自己。
                </p>
              </div>

              <div>
                <p className="text-[12px] font-bold tracking-[0.14em] text-ink-mute">NAVIGATION</p>
                <ul className="mt-3 space-y-2 text-[13px] text-ink-soft">
                  {FOOTER_LINKS.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className="inline-flex min-h-[44px] items-center transition hover:text-navy"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[12px] font-bold tracking-[0.14em] text-ink-mute">DISCLAIMER</p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
                  本站所有结果仅用于娱乐与自我探索，不构成心理咨询、诊断或任何医疗建议。人格是流动的，任何测评都不能定义一个人。若你正经历持续的情绪困扰，请寻求专业心理服务。
                </p>
                <p className="mt-3 text-[12px] text-ink-mute">付费完整报告为 Demo 功能</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-1 border-t border-brand-border pt-5 text-[12px] text-ink-mute sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} MBTI64 · 64 Personalities</p>
              <p>本站为独立人格探索项目，与 16Personalities 无关联。</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
