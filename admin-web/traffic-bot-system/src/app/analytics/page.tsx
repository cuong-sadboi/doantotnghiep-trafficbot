"use client";

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
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import NavbarAuthArea from "@/components/NavbarAuthArea";
import { useLanguage } from "@/context/LanguageContext";

export default function AnalyticsPage() {
  const [logText, setLogText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t, language } = useLanguage();

  const nonEmptyLines = logText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;

  const loadLogText = (text: string, source: "paste" | "file" | "drop") => {
    setLogText(text);

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length;

    if (!lines) {
      setFeedback(language === 'vi' ? "Không phát hiện dòng log hợp lệ nào." : "No valid log lines were detected.");
      return;
    }

    const sourceLabel = source === "file" ? (language === 'vi' ? "tệp" : "file") : source === "drop" ? (language === 'vi' ? "thao tác kéo thả" : "drop") : (language === 'vi' ? "bộ nhớ tạm" : "clipboard");
    setFeedback(language === 'vi' ? `Đã tải ${lines} dòng log từ ${sourceLabel}.` : `Loaded ${lines} log lines from ${sourceLabel}.`);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      const fileContent = await droppedFile.text();
      loadLogText(fileContent, "drop");
      return;
    }

    const droppedText = event.dataTransfer.getData("text");
    if (droppedText) {
      loadLogText(droppedText, "drop");
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    const fileContent = await selectedFile.text();
    loadLogText(fileContent, "file");
    event.target.value = "";
  };

  const handleAnalyzeLogs = () => {
    const normalizedText = logText.trim();
    if (!normalizedText) {
      setFeedback(t('analytics.feedbackPaste'));
      return;
    }

    sessionStorage.setItem("log-curator:raw-access-log", normalizedText);
    sessionStorage.setItem("log-curator:last-import-source", "analytics");
    setFeedback(language === 'vi' ? `Đang phân tích ${nonEmptyLines} dòng log...` : `Analyzing ${nonEmptyLines} log lines...`);
    router.push("/analysis/result");
  };

  return (
    <div className="min-h-screen flex bg-surface text-on-surface selection:bg-primary/30 selection:text-primary">
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Navigation Bar */}
        <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/15 bg-background px-6 font-sans font-medium tracking-tight">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tighter text-primary">Log Curator</span>
            <div className="hidden gap-6 md:flex">
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/">
                {t('navbar.dashboard')}
              </a>
              <a className="border-b-2 border-primary pb-1 text-primary transition-colors hover:bg-surface-container-high/40" href="/analytics">
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

        <main className="flex-grow">
          {/* Hero Section */}
          <section className="pt-20 pb-12 px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-center mb-8">
                <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center border border-outline">
                  <CodeOutlined className="text-primary text-2xl" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">{t('analytics.title')}</h1>
              <p className="text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto leading-relaxed">
                {t('analytics.desc')}
              </p>
              <div className="flex flex-wrap justify-center gap-8 mb-16 text-sm font-medium text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <LockOutlined className="text-sm text-primary" />
                  {language === 'vi' ? '100% Xử lý Client' : '100% Client-Side'}
                </div>
                <div className="flex items-center gap-2">
                  <SafetyCertificateOutlined className="text-sm text-primary" />
                  {language === 'vi' ? 'Không gửi log rời khỏi thiết bị' : 'No Data Leaves Your Browser'}
                </div>
                <div className="flex items-center gap-2">
                  <ThunderboltOutlined className="text-sm text-primary" />
                  {language === 'vi' ? 'Phân tích tức thì' : 'Instant Processing'}
                </div>
              </div>
            </div>
          </section>

          {/* Main Interaction Area */}
          <section className="px-6 pb-24">
            <div className="max-w-4xl mx-auto">
              {/* Drop Zone */}
              <div
                className={`relative dashed-border rounded-xl min-h-80 p-6 transition-colors ${
                  isDragging ? "bg-primary/10 border-primary/40" : "hover:bg-surface-container/30"
                }`}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="mb-4 text-center">
                  <CloudUploadOutlined className="text-5xl text-on-surface-variant mb-4" />
                  <h3 className="text-xl font-semibold mb-1">{t('analytics.pasteLabel')}</h3>
                  <p className="text-on-surface-variant">{t('analytics.dragLabel')}</p>
                </div>

                <textarea
                  className="h-48 w-full resize-y rounded-xl border border-outline/60 bg-black/30 p-4 font-mono text-sm text-on-surface placeholder:text-[#8b919f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  onChange={(event) => {
                    setLogText(event.target.value);
                    if (feedback) {
                      setFeedback("");
                    }
                  }}
                  onPaste={(event) => {
                    const pastedText = event.clipboardData.getData("text");
                    if (!pastedText) {
                      return;
                    }

                    const currentSelection = event.currentTarget;
                    const start = currentSelection.selectionStart;
                    const end = currentSelection.selectionEnd;
                    const nextText = `${logText.slice(0, start)}${pastedText}${logText.slice(end)}`;
                    loadLogText(nextText, "paste");
                    event.preventDefault();
                  }}
                  placeholder='203.0.113.1 - - [24/Apr/2026:10:12:45 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"'
                  spellCheck={false}
                  value={logText}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
                  <span>{nonEmptyLines} {t('analytics.linesDetected')}</span>
                  <button
                    className="rounded-md border border-outline/40 px-3 py-1 text-on-surface transition-colors hover:bg-surface-container-high"
                    onClick={() => {
                      setLogText("");
                      setFeedback("");
                    }}
                    type="button"
                  >
                    {t('analytics.clear')}
                  </button>
                </div>
                {feedback ? <p className="mt-3 text-sm text-primary">{feedback}</p> : null}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <button
                  className="flex items-center justify-center gap-2 bg-[#2F80ED] hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
                  disabled={!logText.trim()}
                  onClick={handleAnalyzeLogs}
                  type="button"
                >
                  <FileTextOutlined className="text-xl" />
                  {t('analytics.analyze')}
                </button>
                <button
                  className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-high/80 border border-outline text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <UploadOutlined className="text-xl" />
                  {t('analytics.upload')}
                </button>
                <a
                  className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-high/80 border border-outline text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer text-center"
                  href="/demo"
                >
                  {t('analytics.demo')}
                </a>
              </div>

              <input
                accept=".log,.txt,text/plain"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />

              {/* Supported Formats Card */}
              <div className="mt-8 bg-surface-container border border-outline rounded-lg p-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">{t('analytics.supported')}</h4>
                <div className="bg-black/50 p-4 rounded border border-outline/50 font-mono text-xs text-on-surface-variant mb-3 overflow-x-auto whitespace-nowrap">
                  192.168.1.1 - - [08/Mar/2026:10:00:00 +0000] "GET /path HTTP/1.1" 200 1234 "referrer" "user-agent"
                </div>
                <p className="text-xs text-on-surface-variant">
                  {t('analytics.privacy')}
                </p>
              </div>

              <div className="flex flex-col items-center mt-16 text-on-surface-variant">
                <span className="text-xs uppercase tracking-[0.2em] mb-4">{language === 'vi' ? 'Xem thêm' : 'Learn more'}</span>
                <DownOutlined className="animate-bounce" />
              </div>
            </div>
          </section>

          {/* Info Sections Grid */}
          <section className="px-6 py-24 bg-surface-container-low/30">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* How It Works */}
              <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">{language === 'vi' ? 'Quy trình hoạt động' : 'How It Works'}</h3>
                <ol className="space-y-6 text-sm text-on-surface-variant leading-relaxed">
                  <li>
                    <strong className="text-on-surface block mb-1">{language === 'vi' ? '1. Dán hoặc tải tệp log lên.' : '1. Paste your logs.'}</strong>
                    {language === 'vi' ? 'Dán các dòng log access nginx hoặc kéo thả tệp vào vùng nhận diện.' : 'Paste your nginx access logs or drag and drop a log file.'}
                  </li>
                  <li>
                    <strong className="text-on-surface block mb-1">{language === 'vi' ? '2. Xử lý cục bộ.' : '2. Instant analysis.'}</strong>
                    {language === 'vi' ? 'Log được phân tích và trích xuất đặc trưng ngay lập tức bằng browser.' : 'Your logs are parsed and analyzed entirely in your browser.'}
                  </li>
                  <li>
                    <strong className="text-on-surface block mb-1">{language === 'vi' ? '3. Nhận báo cáo.' : '3. Explore insights.'}</strong>
                    {language === 'vi' ? 'Xem đồ thị, phân loại bot nguy hại và mã trạng thái HTTP.' : 'View traffic patterns, top pages, browsers, bots, and security threats.'}
                  </li>
                </ol>
              </div>

              {/* Why Use This Tool? */}
              <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">{language === 'vi' ? 'Tại sao chọn?' : 'Why Use This Tool?'}</h3>
                <p className="text-sm text-on-surface-variant mb-6">
                  {language === 'vi' ? 'Log Curator giúp bạn xem nhanh chỉ số log mà không cần cài đặt các hạ tầng ELK phức tạp:' : 'Log Analytics helps you understand your web traffic without complex setups:'}
                </p>
                <ul className="space-y-4 text-sm text-on-surface-variant">
                  <li className="flex gap-2">
                    <span className="text-primary">-</span> {language === 'vi' ? 'Không cần cấu hình server thu thập log' : 'Quick traffic analysis without servers'}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">-</span> {language === 'vi' ? 'Tự động bóc tách bot/crawler khỏi traffic thật' : 'Separate bot traffic from real users'}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">-</span> {language === 'vi' ? 'Phát hiện nhanh các IP quét lỗi và spam' : 'Detect security threats and scanners'}
                  </li>
                </ul>
              </div>

              {/* Features */}
              <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">{language === 'vi' ? 'Tính năng' : 'Features'}</h3>
                <div className="space-y-6 text-sm">
                  <div>
                    <strong className="text-on-surface block">{language === 'vi' ? 'Riêng tư hàng đầu.' : 'Privacy First.'}</strong>
                    <span className="text-on-surface-variant">{language === 'vi' ? 'Không tải log lên server. Bảo mật 100% dữ liệu.' : 'No uploads, no servers. Everything runs in your browser.'}</span>
                  </div>
                  <div>
                    <strong className="text-on-surface block">{language === 'vi' ? 'Nhận diện Bot.' : 'Bot Detection.'}</strong>
                    <span className="text-on-surface-variant">{language === 'vi' ? 'Phát hiện hơn 40 mẫu bot thông dụng và SEO crawlers.' : 'Identifies 40+ bot types including search engines, SEO tools.'}</span>
                  </div>
                  <div>
                    <strong className="text-on-surface block">{language === 'vi' ? 'Phân tích mã lỗi.' : 'Status Analysis.'}</strong>
                    <span className="text-on-surface-variant">{language === 'vi' ? 'Xem các mã lỗi 4xx/5xx để kiểm tra sự ổn định.' : 'Debug server issues by analyzing status codes.'}</span>
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-surface-container-high/40 border border-outline/30 rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6 text-primary border-b border-primary/20 pb-4">{language === 'vi' ? 'FAQ' : 'FAQ'}</h3>
                <div className="space-y-6 text-sm">
                  <div>
                    <strong className="text-on-surface block mb-1">{language === 'vi' ? 'Công cụ có miễn phí không?' : 'Is this tool free?'}</strong>
                    <p className="text-on-surface-variant">{language === 'vi' ? 'Hoàn toàn miễn phí, không giới hạn dung lượng log.' : 'Yes, completely free. No ads, no sign-up, no limits.'}</p>
                  </div>
                  <div>
                    <strong className="text-on-surface block mb-1">{language === 'vi' ? 'Dữ liệu được lưu ở đâu?' : 'Where is data stored?'}</strong>
                    <p className="text-on-surface-variant">{language === 'vi' ? 'Dữ liệu của bạn được xử lý tạm thời trên bộ nhớ RAM trình duyệt.' : 'All in your browser. We do not store or send your logs.'}</p>
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
              <span>© 2026 Log Curator. All Rights Reserved.</span>
            </div>
            <div className="flex items-center gap-2">
              <LockOutlined className="text-sm" />
              <span>{language === 'vi' ? 'Log của bạn không bao giờ rời khỏi trình duyệt' : 'Your logs never leave your browser'}</span>
            </div>
          </div>
        </footer>
      </div>
      <DashboardSidebar />
    </div>
  );
}
