"use client";

import {
  ArrowRightOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import DashboardSidebar from "@/components/DashboardSidebar";
import NavbarAuthArea from "@/components/NavbarAuthArea";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t, language } = useLanguage();

  return (
    <div className="selection:bg-primary/30 selection:text-primary flex min-h-screen">
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* TopNavBar */}
        <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/15 bg-background px-6 font-sans font-medium tracking-tight">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tighter text-primary">Log Curator</span>
            <div className="hidden gap-6 md:flex">
              <a className="border-b-2 border-primary pb-1 text-primary transition-colors hover:bg-surface-container-high/40" href="/">
                {t('navbar.dashboard')}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/analytics">
                {t('navbar.analytics')}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/streams">
                {t('navbar.streams')}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/incidents">
                {t('navbar.incidents')}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/settings">
                {t('navbar.settings')}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]" />
              <input
                className="w-72 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/90 py-2 pl-10 pr-4 text-sm font-mono text-on-surface placeholder:text-[#8b919f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('navbar.search')}
                type="text"
              />
            </div>
            <button className="rounded-xl p-2 text-[#A1A1AA] transition-colors hover:bg-[#353535]/40" type="button">
              <BellOutlined className="text-base" />
            </button>
            <button className="rounded-xl p-2 text-[#A1A1AA] transition-colors hover:bg-[#353535]/40" type="button">
              <CodeOutlined className="text-base" />
            </button>
            <NavbarAuthArea />
          </div>
        </nav>

        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden px-6 pb-32 pt-24">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
              <div className="z-10 lg:col-span-7">
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-low px-3 py-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="font-label text-xs uppercase tracking-widest text-primary">{t('home.tag')}</span>
                </div>
                <h1 className="mb-8 text-6xl font-extrabold leading-[0.9] tracking-tighter text-on-surface md:text-8xl">
                  {language === 'vi' ? <>Nginx Log <br /><span className="italic text-primary">Analytics</span></> : <>Nginx Log <br /><span className="italic text-primary">Analytics</span></>}
                </h1>
                <p className="mb-10 max-w-xl text-lg leading-relaxed text-on-surface-variant md:text-xl">
                  {t('home.desc')}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#9fc1ff] dark:to-[#66a4ff] px-8 py-4 font-bold text-white dark:text-[#0d2b57] shadow-[0_8px_24px_-12px_rgba(37,99,235,0.5)] dark:shadow-[0_8px_24px_-12px_rgba(102,164,255,0.7)] transition-all hover:-translate-y-0.5 hover:brightness-105"
                    href="/demo"
                  >
                    <span>{t('home.demoBtn')}</span>
                    <ArrowRightOutlined className="text-base transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    className="rounded-xl border border-outline/30 bg-surface-container-low px-8 py-4 font-bold text-on-surface transition-colors hover:bg-surface-container-high"
                    href="/analytics"
                  >
                    {t('home.uploadBtn')}
                  </Link>
                </div>
              </div>

              {/* Terminal Preview */}
              <div className="relative lg:col-span-5">
                <div className="absolute -inset-10 rounded-full bg-primary/5 blur-[120px]" />
                <div className="bg-zinc-950 border border-zinc-800/80 terminal-glow relative overflow-hidden rounded-xl shadow-2xl">
                  <div className="flex h-10 items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/50 px-4">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
                    </div>
                    <span className="ml-4 font-mono text-[10px] text-zinc-400">{t('home.terminalTitle')}</span>
                  </div>
                  <div className="h-[400px] overflow-hidden p-6 font-mono text-sm leading-6">
                    <div className="flex gap-4 opacity-75">
                      <span className="text-zinc-600">01</span>
                      <span className="text-sky-400">127.0.0.1</span>
                      <span className="text-zinc-500">- - [12/Oct/2023:14:02:11 +0000]</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-zinc-650">02</span>
                      <span className="text-zinc-100">"GET /api/v1/streams HTTP/1.1"</span>
                      <span className="rounded bg-emerald-500/10 px-1 text-emerald-400">200</span>
                    </div>
                    <div className="flex gap-4 opacity-75">
                      <span className="text-zinc-600">03</span>
                      <span className="text-zinc-400">Parsing stream hash: 0x4f2a...</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-zinc-650">04</span>
                      <span className="text-zinc-100">"POST /auth/login HTTP/1.1"</span>
                      <span className="rounded bg-rose-500/10 px-1 text-rose-400">401</span>
                    </div>
                    <div className="mt-4 flex gap-4 border-l-2 border-sky-400 bg-sky-500/5 p-3 text-sky-400">
                      <span className="material-symbols-outlined text-sm text-sky-400">analytics</span>
                      <span className="text-sky-300">{t('home.terminalParsing')}</span>
                    </div>
                    <div className="mt-2 flex gap-4 opacity-50">
                      <span className="text-zinc-600">06</span>
                      <span className="text-zinc-500">{t('home.terminalDone')}</span>
                    </div>
                    <div className="mt-8 flex gap-2">
                      <span className="text-sky-400">$</span>
                      <span className="h-5 w-2 animate-pulse bg-sky-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Bento Grid */}
          <section className="bg-surface-container-lowest px-6 py-24">
            <div className="mx-auto max-w-7xl">
              <div className="mb-16">
                <h2 className="mb-4 text-4xl font-bold tracking-tight">{t('home.featuresTitle')}</h2>
                <p className="max-w-2xl text-on-surface-variant">{t('home.featuresDesc')}</p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Feature Card 1 */}
                <div className="flex min-h-[300px] flex-col justify-between rounded-xl border border-outline-variant/10 bg-surface-container-low p-8 transition-all hover:border-primary/20">
                  <div>
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <CodeOutlined className="text-xl text-primary" />
                    </div>
                    <h3 className="mb-4 text-2xl font-bold">{t('home.clientSide')}</h3>
                    <p className="leading-relaxed text-on-surface-variant">
                      {t('home.clientSideDesc')}
                    </p>
                  </div>
                  <span className="border-t border-outline-variant/10 pt-6 font-mono text-xs uppercase tracking-widest text-primary/40">
                    Engine: Curator-WASM-v1
                  </span>
                </div>

                {/* Feature Card 2 */}
                <div className="flex min-h-[300px] flex-col justify-between rounded-xl border border-outline-variant/10 bg-surface-container-low p-8 transition-all hover:border-primary/20 md:translate-y-6">
                  <div>
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <ThunderboltOutlined className="text-xl text-primary" />
                    </div>
                    <h3 className="mb-4 text-2xl font-bold">{t('home.zeroLatency')}</h3>
                    <p className="leading-relaxed text-on-surface-variant">
                      {t('home.zeroLatencyDesc')}
                    </p>
                  </div>
                  <span className="border-t border-outline-variant/10 pt-6 font-mono text-xs uppercase tracking-widest text-primary/40">
                    Avg Throughput: 2GB/s
                  </span>
                </div>

                {/* Feature Card 3 */}
                <div className="flex min-h-[300px] flex-col justify-between rounded-xl border border-outline-variant/10 bg-surface-container-low p-8 transition-all hover:border-primary/20">
                  <div>
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <SafetyCertificateOutlined className="text-xl text-primary" />
                    </div>
                    <h3 className="mb-4 text-2xl font-bold">{t('home.noDataLeaves')}</h3>
                    <p className="leading-relaxed text-on-surface-variant">
                      {t('home.noDataLeavesDesc')}
                    </p>
                  </div>
                  <span className="border-t border-outline-variant/10 pt-6 font-mono text-xs uppercase tracking-widest text-primary/40">
                    Security: Sandbox-Isolated
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Visual Analytics Teaser */}
          <section className="overflow-hidden px-6 py-32">
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-20 lg:flex-row">
              <div className="lg:w-1/2">
                <div className="group relative aspect-video overflow-hidden rounded-2xl border border-outline-variant/20">
                  <img
                    alt="Analytics Dashboard"
                    className="h-full w-full object-cover opacity-60 grayscale transition-all duration-700 group-hover:opacity-100 group-hover:grayscale-0"
                    src="/current-load-bg.svg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="glass-morphism rounded-xl border border-primary/20 p-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="font-mono text-[10px] uppercase text-primary">Current Load</div>
                          <div className="text-2xl font-bold">4.2k req/sec</div>
                        </div>
                        <div className="flex h-8 w-24 items-end gap-1">
                          <div className="h-4 flex-1 bg-primary" />
                          <div className="h-6 flex-1 bg-primary" />
                          <div className="h-8 flex-1 bg-primary" />
                          <div className="h-5 flex-1 bg-primary/50" />
                          <div className="h-7 flex-1 bg-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2">
                <h2 className="mb-6 text-5xl font-bold leading-tight tracking-tight">
                  {language === 'vi' ? <>Tìm kiếm chuyên sâu <br />Không cần hạ tầng phức tạp.</> : <>Insight without <br />the infrastructure.</>}
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-on-surface-variant">
                  {language === 'vi' 
                    ? "Hệ thống ELK truyền thống tốn nhiều giờ để cấu hình. Log Curator chỉ cần vài giây. Kéo thả một tệp access.log lên màn hình và xem ngay phân bố mã trạng thái HTTP, lưu lượng truy cập cũng như phân tích hiệu năng hệ thống."
                    : "Traditional ELK stacks take hours to configure. Log Curator takes seconds. Drag an Nginx access.log onto the screen and immediately see geographic distribution, status code distributions, and bottleneck analysis."}
                </p>
                <ul className="font-label space-y-4">
                  <li className="flex items-center gap-3 text-on-surface">
                    <CheckCircleOutlined className="text-primary" /> {language === 'vi' ? "Khớp mẫu regex tức thì" : "Instant regex pattern matching"}
                  </li>
                  <li className="flex items-center gap-3 text-on-surface">
                    <CheckCircleOutlined className="text-primary" /> {language === 'vi' ? "Bản đồ hóa Geo-IP cục bộ" : "Geo-IP mapping (Local DB)"}
                  </li>
                  <li className="flex items-center gap-3 text-on-surface">
                    <CheckCircleOutlined className="text-primary" /> {language === 'vi' ? "Xuất dữ liệu báo cáo CSV / JSON" : "Export to CSV / JSON curated sets"}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-7xl">
              <div className="relative overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container p-12 lg:p-24">
                <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-primary/5 blur-[100px]" />
                <div className="relative z-10 max-w-2xl">
                  <h2 className="mb-8 text-4xl font-bold tracking-tighter lg:text-6xl">
                    {language === 'vi' ? "Sẵn sàng phân tích?" : "Ready to curate?"}
                  </h2>
                  <p className="mb-12 text-xl text-on-surface-variant">
                    {language === 'vi' 
                      ? "Ngưng vật lộn với các câu lệnh grep hay awk. Có được góc nhìn trực quan toàn diện nhất về dữ liệu log của bạn ngay hôm nay."
                      : "Stop fighting with grep and awk. Get the editorial perspective on your log data today."}
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Link href="/analytics" className="rounded-full bg-primary px-10 py-5 font-extrabold text-on-primary-container transition-transform hover:scale-105 text-center">
                      {language === 'vi' ? "Mở Bảng Phân Tích" : "Launch Interactive Dashboard"}
                    </Link>
                    <button className="rounded-full border-2 border-outline bg-transparent px-10 py-5 font-extrabold text-on-surface transition-colors hover:bg-white/5" type="button">
                      {language === 'vi' ? "Xem tài liệu HD" : "View Documentation"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-outline-variant/5 bg-surface-container-lowest px-6 py-16">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-12 md:flex-row">
            <div className="max-w-xs">
              <span className="mb-6 block text-xl font-bold tracking-tighter text-primary">Log Curator</span>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Designed for developers. Built for privacy. Curated for insight.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12 md:grid-cols-3">
              <div>
                <h4 className="mb-6 font-label text-xs uppercase tracking-widest text-on-surface">Product</h4>
                <ul className="space-y-3 text-sm text-on-surface-variant">
                  <li><a className="hover:text-primary" href="/">{t('navbar.dashboard')}</a></li>
                  <li><a className="hover:text-primary" href="/analytics">{t('navbar.analytics')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-6 font-label text-xs uppercase tracking-widest text-on-surface">Resources</h4>
                <ul className="space-y-3 text-sm text-on-surface-variant">
                  <li><a className="hover:text-primary" href="https://github.com">GitHub</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-7xl items-center justify-between border-t border-outline-variant/10 pt-8 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            <span>© 2026 Log Curator. All Rights Reserved.</span>
            <span>Stable Build 0.0.1</span>
          </div>
        </footer>
      </div>
      <DashboardSidebar />
    </div>
  );
}
