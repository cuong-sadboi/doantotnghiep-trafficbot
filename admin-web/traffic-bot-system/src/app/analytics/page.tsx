import {
  BellOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  DownOutlined,
  FileTextOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from "@ant-design/icons";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface selection:bg-primary/30 selection:text-primary">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#353535]/15 bg-[#131313] px-6 font-sans font-medium tracking-tight">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-[#abc7ff]">Log Curator</span>
          <div className="hidden gap-6 md:flex">
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="/">
              Dashboard
            </a>
            <a className="border-b-2 border-[#abc7ff] pb-1 text-[#abc7ff] transition-colors hover:bg-[#353535]/40" href="/analytics">
              Analytics
            </a>
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="#">
              Streams
            </a>
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="#">
              Incidents
            </a>
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="#">
              Settings
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]" />
            <input
              className="w-72 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/90 py-2 pl-10 pr-4 text-sm font-mono text-on-surface placeholder:text-[#8b919f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search logs..."
              type="text"
            />
          </div>
          <button className="rounded-xl p-2 text-[#A1A1AA] transition-colors hover:bg-[#353535]/40" type="button">
            <BellOutlined className="text-base" />
          </button>
          <button className="rounded-xl p-2 text-[#A1A1AA] transition-colors hover:bg-[#353535]/40" type="button">
            <CodeOutlined className="text-base" />
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline overflow-hidden">
            <img
              alt="User profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBN5UcwUFDe60vpiZLfMuq07j1u8VjsrK5CPD6UsiyClwwuWGd4Bl534k-4aYvCLWoNxZhUpko7VSnMzUC74V4qjBDr41ICpP5hRVPz7g8s9xnZpvB_e8tBOyIhA01DXqOuQpO6beyGkrc4HeeduKulnCWyGezph5IFpbwbq2ooVWmNE_UK6ZAn_jYDqSkFYEiH6jWHQcwainNno-_X0pDe1Tci4vRzguvFa1O7qioZJ4wtCh4aOr_lrmOq1wZWt8p3f5A-MI0PodY"
            />
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-20 pb-12 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center border border-outline">
                <CodeOutlined className="text-primary text-2xl" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">Nginx Log Analytics</h1>
            <p className="text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your nginx access logs into beautiful analytics dashboards. Free, instant, and completely private.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mb-16 text-sm font-medium text-on-surface-variant">
              <div className="flex items-center gap-2">
                <LockOutlined className="text-sm text-primary" />
                100% Client-Side
              </div>
              <div className="flex items-center gap-2">
                <SafetyCertificateOutlined className="text-sm text-primary" />
                No Data Leaves Your Browser
              </div>
              <div className="flex items-center gap-2">
                <ThunderboltOutlined className="text-sm text-primary" />
                Instant Processing
              </div>
            </div>
          </div>
        </section>

        {/* Main Interaction Area */}
        <section className="px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            {/* Drop Zone */}
            <div className="relative dashed-border rounded-xl h-80 flex flex-col items-center justify-center p-8 transition-colors hover:bg-surface-container/30 cursor-pointer">
              <textarea className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" placeholder="Paste your nginx access logs here..." />
              <div className="text-center pointer-events-none">
                <CloudUploadOutlined className="text-5xl text-on-surface-variant mb-4" />
                <h3 className="text-xl font-semibold mb-1">Drag and drop a log file</h3>
                <p className="text-on-surface-variant">or paste your nginx logs above</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <button className="flex items-center justify-center gap-2 bg-[#2F80ED] hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors" type="button">
                <FileTextOutlined className="text-xl" />
                Analyze Logs
              </button>
              <button className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-high/80 border border-outline text-white font-semibold py-3 px-6 rounded-lg transition-colors" type="button">
                <UploadOutlined className="text-xl" />
                Upload File
              </button>
              <a
                className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-high/80 border border-outline text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                href="/demo"
              >
                Try Demo
              </a>
            </div>

            {/* Supported Formats Card */}
            <div className="mt-8 bg-surface-container border border-outline rounded-lg p-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">Supported Log Formats</h4>
              <div className="bg-black/50 p-4 rounded border border-outline/50 font-mono text-xs text-on-surface-variant mb-3 overflow-x-auto whitespace-nowrap">
                192.168.1.1 - - [08/Mar/2026:10:00:00 +0000] "GET /path HTTP/1.1" 200 1234 "referrer" "user-agent"
              </div>
              <p className="text-xs text-on-surface-variant">
                Supports nginx combined and common log formats. Your logs are processed entirely in your browser.
              </p>
            </div>

            <div className="flex flex-col items-center mt-16 text-on-surface-variant">
              <span className="text-xs uppercase tracking-[0.2em] mb-4">Learn more</span>
              <DownOutlined className="animate-bounce" />
            </div>
          </div>
        </section>

        {/* Info Sections Grid */}
        <section className="px-6 py-24 bg-surface-container-low/30">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* How It Works */}
            <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">How It Works</h3>
              <ol className="space-y-6 text-sm text-on-surface-variant leading-relaxed">
                <li>
                  <strong className="text-on-surface block mb-1">1. Paste your logs.</strong>
                  Paste your nginx access logs or drag and drop a log file.
                </li>
                <li>
                  <strong className="text-on-surface block mb-1">2. Instant analysis.</strong>
                  Your logs are parsed and analyzed entirely in your browser.
                </li>
                <li>
                  <strong className="text-on-surface block mb-1">3. Explore insights.</strong>
                  View traffic patterns, top pages, browsers, bots, and security threats.
                </li>
                <li>
                  <strong className="text-on-surface block mb-1">4. Filter and drill down.</strong>
                  Use date filters and toggle bot/malicious traffic visibility.
                </li>
              </ol>
            </div>

            {/* Why Use This Tool? */}
            <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">Why Use This Tool?</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Log Analytics helps you understand your web traffic without complex setups or third-party services:
              </p>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                <li className="flex gap-2">
                  <span className="text-primary">-</span> Quick traffic analysis without installing analytics scripts
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">-</span> Identify bot traffic and separate it from real users
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">-</span> Detect security threats and suspicious requests
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">-</span> Debug server issues by analyzing status codes
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">-</span> No signup, no tracking, completely free
                </li>
              </ul>
            </div>

            {/* Features */}
            <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">Features</h3>
              <div className="space-y-6 text-sm">
                <div>
                  <strong className="text-on-surface block">Privacy First.</strong>
                  <span className="text-on-surface-variant">No uploads, no servers. Everything runs in your browser.</span>
                </div>
                <div>
                  <strong className="text-on-surface block">Bot Detection.</strong>
                  <span className="text-on-surface-variant">Identifies 40+ bot types including search engines, SEO tools, and AI crawlers.</span>
                </div>
                <div>
                  <strong className="text-on-surface block">Security Analysis.</strong>
                  <span className="text-on-surface-variant">Flags SQL injection, path traversal, and other malicious requests.</span>
                </div>
                <div>
                  <strong className="text-on-surface block">Traffic Insights.</strong>
                  <span className="text-on-surface-variant">View requests over time, status codes, top pages, and referrers.</span>
                </div>
                <div>
                  <strong className="text-on-surface block">Date Filtering.</strong>
                  <span className="text-on-surface-variant">Filter logs by date range to analyze specific time periods.</span>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">FAQ</h3>
              <div className="space-y-6 text-sm">
                <div>
                  <strong className="text-on-surface block mb-1">Is this tool free?</strong>
                  <p className="text-on-surface-variant">Yes, completely free. No ads, no sign-up, no limits.</p>
                </div>
                <div>
                  <strong className="text-on-surface block mb-1">Where is my data processed?</strong>
                  <p className="text-on-surface-variant">All in your browser. We do not store or send your logs anywhere.</p>
                </div>
                <div>
                  <strong className="text-on-surface block mb-1">What log formats are supported?</strong>
                  <p className="text-on-surface-variant">Nginx combined and common log formats are fully supported.</p>
                </div>
                <div>
                  <strong className="text-on-surface block mb-1">Does it work on mobile?</strong>
                  <p className="text-on-surface-variant">Yes, the tool is fully responsive and works on all devices.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline/20 py-8 px-6 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span>Free to use. No sign-up required.</span>
          </div>
          <div className="flex items-center gap-2">
            <LockOutlined className="text-sm" />
            <span>Your logs never leave your browser</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
