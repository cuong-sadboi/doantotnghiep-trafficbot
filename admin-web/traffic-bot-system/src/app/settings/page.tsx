"use client";

import {
  BellOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CodeOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import NavbarAuthArea from "@/components/NavbarAuthArea";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { API_BASE_URL } from "@/lib/auth-client";

interface StreamStatus {
  sourceKey: string;
  sourceUrl: string;
  lastByteOffset: number;
  updatedAt: string | null;
}

interface AIModelInfo {
  model_type: string;
  n_estimators: number;
  n_features: number;
  features: string[];
  classes: number[];
  error?: string;
}

const formatTimestamp = (value?: string | null, language?: string) => {
  if (!value) return language === "vi" ? "Chưa đồng bộ" : "Not synchronized";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString(language === "vi" ? "vi-VN" : "en-US");
};

export default function SettingsPage() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"stream" | "ai" | "sync" | "ddos">("stream");
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [aiInfo, setAiInfo] = useState<AIModelInfo | null>(null);

  // Form states
  const [sourceKey, setSourceKey] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [ddosEnabled, setDdosEnabled] = useState(false);
  const [ddosThreshold, setDdosThreshold] = useState(100);
  const [ddosLimitRpm, setDdosLimitRpm] = useState(60);
  const [ddosLimitDuration, setDdosLimitDuration] = useState(24);

  // Loading & notification states
  const [loadingStream, setLoadingStream] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchStreamStatus = async () => {
    setLoadingStream(true);
    try {
      const res = await fetch(`${API_BASE_URL}/streams/status`);
      if (!res.ok) throw new Error(language === "vi" ? "Không thể tải trạng thái dòng dữ liệu." : "Unable to load stream status.");
      const data = (await res.json()) as StreamStatus;
      setStatus(data);
      setSourceKey(data.sourceKey || "");
      setSourceUrl(data.sourceUrl || "");
      if ((data as any).apiToken) setApiToken((data as any).apiToken);
      setDdosEnabled((data as any).ddosEnabled ?? false);
      setDdosThreshold((data as any).ddosThreshold ?? 100);
      setDdosLimitRpm((data as any).ddosLimitRpm ?? 60);
      setDdosLimitDuration((data as any).ddosLimitDuration ?? 24);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingStream(false);
    }
  };

  const fetchAIInfo = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/model-info`);
      if (!res.ok) throw new Error(language === "vi" ? "Không thể kết nối tới AI Engine." : "Failed to connect to AI Engine.");
      const data = (await res.json()) as AIModelInfo;
      if (data.error) {
        throw new Error(data.error);
      }
      setAiInfo(data);
    } catch (err: any) {
      setAiError(err?.message || (language === "vi" ? "Đã xảy ra lỗi khi kết nối tới dịch vụ AI." : "An error occurred while connecting to the AI service."));
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchStreamStatus();
  }, []);

  useEffect(() => {
    if (activeTab === "ai" && !aiInfo) {
      fetchAIInfo();
    }
  }, [activeTab]);

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl || !apiToken) {
      setConfigError(language === "vi" ? "Vui lòng điền đầy đủ URL và API Token." : "Please fill in both URL and API Token.");
      return;
    }

    setSavingConfig(true);
    setConfigError(null);
    setConfigSuccess(false);

    try {
      const res = await fetch(`${API_BASE_URL}/streams/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          apiToken,
          sourceKey: sourceKey || undefined,
          ddosEnabled,
          ddosThreshold: Number(ddosThreshold),
          ddosLimitRpm: Number(ddosLimitRpm),
          ddosLimitDuration: Number(ddosLimitDuration),
        }),
      });

      if (!res.ok) throw new Error(language === "vi" ? "Lỗi khi cập nhật cấu hình stream từ Backend." : "Error updating stream config from Backend.");
      setConfigSuccess(true);
      fetchStreamStatus();
    } catch (err: any) {
      setConfigError(err?.message || (language === "vi" ? "Có lỗi xảy ra khi lưu cấu hình." : "An error occurred while saving the configuration."));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const res = await fetch(`${API_BASE_URL}/streams/sync`, { method: "POST" });
      if (!res.ok) throw new Error(language === "vi" ? "Đồng bộ log thất bại." : "Log synchronization failed.");
      setSyncSuccess(true);
      fetchStreamStatus();
    } catch (err: any) {
      setSyncError(err?.message || (language === "vi" ? "Có lỗi xảy ra khi đồng bộ." : "An error occurred during synchronization."));
    } finally {
      setSyncing(false);
    }
  };

  const getFeatureDescription = (feature: string) => {
    const details = (translations[language]?.settings?.aiTab?.features as any)?.[feature] || {
      label: feature,
      desc: t("settings.aiTab.genericFeature")
    };
    return details;
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/30 selection:text-primary flex">
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/15 bg-background px-6 font-sans font-medium tracking-tight">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tighter text-primary">Log Curator</span>
            <div className="hidden gap-6 md:flex">
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/">
                {t("navbar.dashboard")}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/analytics">
                {t("navbar.analytics")}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/streams">
                {t("navbar.streams")}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/incidents">
                {t("navbar.incidents")}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/firewall">
                {t("navbar.firewall")}
              </a>
              <a className="border-b-2 border-primary pb-1 text-primary transition-colors hover:bg-surface-container-high/40" href="/settings">
                {t("navbar.settings")}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]" />
              <input
                className="w-72 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/90 py-2 pl-10 pr-4 text-sm font-mono text-on-surface placeholder:text-[#8b919f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t("navbar.search")}
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

        {/* Main Content Area */}
        <main className="px-6 pb-20 pt-10 flex-grow">
          <div className="mx-auto max-w-4xl space-y-8">
            <div>
              <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">{t("settings.systemControl")}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">{t("settings.title")}</h1>
              <p className="mt-2 text-on-surface-variant">
                {t("settings.subtitle")}
              </p>
            </div>

            {/* Custom Tabs */}
            <div className="flex border-b border-outline-variant/15 gap-8">
              <button
                onClick={() => setActiveTab("stream")}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "stream"
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                <SettingOutlined /> {t("settings.tabs.stream")}
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "ai"
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                <RobotOutlined /> {t("settings.tabs.ai")}
              </button>
              <button
                onClick={() => setActiveTab("sync")}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "sync"
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                <SyncOutlined /> {t("settings.tabs.sync")}
              </button>
              <button
                onClick={() => setActiveTab("ddos")}
                className={`pb-3 text-sm font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "ddos"
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                <WarningOutlined /> {t("settings.ddos.title")}
              </button>
            </div>

            {/* Tab Panels */}
            <div className="mt-6">
              {/* Tab 1: Stream Config */}
              {activeTab === "stream" && (
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <KeyOutlined className="text-lg" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-on-surface">{t("settings.streamForm.title")}</h3>
                      <p className="text-xs text-on-surface-variant">{t("settings.streamForm.desc")}</p>
                    </div>
                  </div>

                  {loadingStream ? (
                    <div className="py-12 text-center text-on-surface-variant flex flex-col items-center gap-3">
                      <SyncOutlined className="animate-spin text-2xl text-primary" />
                      <span className="text-sm font-mono uppercase tracking-widest">{t("settings.streamForm.loading")}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleConfigSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                            {t("settings.streamForm.sourceKey")}
                          </label>
                          <input
                            type="text"
                            placeholder={language === "vi" ? "Ví dụ: pythonanywhere_cuong" : "e.g. pythonanywhere_cuong"}
                            value={sourceKey}
                            onChange={(e) => setSourceKey(e.target.value)}
                            className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                            {t("settings.streamForm.sourceUrl")}
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://www.pythonanywhere.com/user/cuong1512/files/var/log/cuong1512.pythonanywhere.com.access.log"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                            {t("settings.streamForm.apiToken")}
                          </label>
                          <input
                            type="password"
                            required
                            placeholder={language === "vi" ? "Nhập API Token bảo mật của bạn..." : "Enter your secure API Token..."}
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {configError && (
                        <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-xs text-error flex items-start gap-2">
                          <WarningOutlined className="mt-0.5" />
                          <span>{configError}</span>
                        </div>
                      )}

                      {configSuccess && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-xs text-green-400 flex items-start gap-2">
                          <CheckCircleOutlined className="mt-0.5" />
                          <span>{t("settings.streamForm.success")}</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingConfig || configSuccess}
                          className="rounded-xl bg-primary py-2.5 px-6 text-sm font-bold text-on-primary-container hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2"
                        >
                          {savingConfig ? (
                            <>
                              <SyncOutlined className="animate-spin" /> {t("settings.streamForm.submitActive")}
                            </>
                          ) : (
                            t("settings.streamForm.submit")
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tab 4: DDoS Config */}
              {activeTab === "ddos" && (
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <WarningOutlined className="text-lg" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-on-surface">{t("settings.ddos.title")}</h3>
                      <p className="text-xs text-on-surface-variant">{t("settings.ddos.desc")}</p>
                    </div>
                  </div>

                  {loadingStream ? (
                    <div className="py-12 text-center text-on-surface-variant flex flex-col items-center gap-3">
                      <SyncOutlined className="animate-spin text-2xl text-primary" />
                      <span className="text-sm font-mono uppercase tracking-widest">{t("settings.streamForm.loading")}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleConfigSubmit} className="space-y-5">
                      <div className="flex items-center gap-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20">
                        <input
                          type="checkbox"
                          id="ddosEnabled"
                          checked={ddosEnabled}
                          onChange={(e) => setDdosEnabled(e.target.checked)}
                          className="h-5 w-5 rounded border-outline/30 bg-surface text-primary focus:ring-primary cursor-pointer animate-fade-in"
                        />
                        <label htmlFor="ddosEnabled" className="text-sm font-bold text-on-surface cursor-pointer select-none">
                          {t("settings.ddos.enabled")}
                        </label>
                      </div>

                      {ddosEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                              {t("settings.ddos.threshold")}
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={ddosThreshold}
                              onChange={(e) => setDdosThreshold(Number(e.target.value))}
                              className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                              {t("settings.ddos.limitRpm")}
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={ddosLimitRpm}
                              onChange={(e) => setDdosLimitRpm(Number(e.target.value))}
                              className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold font-mono text-on-surface focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                              {t("settings.ddos.duration")}
                            </label>
                            <select
                              value={ddosLimitDuration}
                              onChange={(e) => setDdosLimitDuration(Number(e.target.value))}
                              className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:outline-none"
                            >
                              <option value="1">1 {language === "vi" ? "giờ" : "hour"}</option>
                              <option value="24">24 {language === "vi" ? "giờ (1 ngày)" : "hours (1 day)"}</option>
                              <option value="168">168 {language === "vi" ? "giờ (1 tuần)" : "hours (1 week)"}</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {configError && (
                        <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-xs text-error flex items-start gap-2">
                          <WarningOutlined className="mt-0.5" />
                          <span>{configError}</span>
                        </div>
                      )}

                      {configSuccess && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-xs text-green-400 flex items-start gap-2">
                          <CheckCircleOutlined className="mt-0.5" />
                          <span>{t("settings.ddos.success")}</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingConfig || configSuccess}
                          className="rounded-xl bg-primary py-2.5 px-6 text-sm font-bold text-on-primary-container hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2"
                        >
                          {savingConfig ? (
                            <>
                              <SyncOutlined className="animate-spin" /> {t("settings.streamForm.submitActive")}
                            </>
                          ) : (
                            t("settings.streamForm.submit")
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tab 2: AI Engine Info */}
              {activeTab === "ai" && (
                <div className="space-y-6">
                  {loadingAI ? (
                    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-12 text-center text-on-surface-variant flex flex-col items-center gap-3">
                      <SyncOutlined className="animate-spin text-2xl text-primary" />
                      <span className="text-sm font-mono uppercase tracking-widest">{t("settings.aiTab.loading")}</span>
                    </div>
                  ) : aiError ? (
                    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-8 text-center space-y-4">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                        <WarningOutlined className="text-xl" />
                      </div>
                      <h3 className="text-lg font-bold">{t("settings.aiTab.errorTitle")}</h3>
                      <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                        {t("settings.aiTab.errorDesc")}
                      </p>
                      <button
                        onClick={fetchAIInfo}
                        className="rounded-xl border border-outline/30 bg-surface-container-high py-2 px-4 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition cursor-pointer"
                      >
                        {t("settings.aiTab.retry")}
                      </button>
                    </div>
                  ) : aiInfo ? (
                    <div className="space-y-6">
                      {/* Model Overall Status */}
                      <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400">
                            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            {t("settings.aiTab.status")}
                          </div>
                          <h3 className="text-2xl font-bold text-on-surface">{t("settings.aiTab.modelName")}</h3>
                          <p className="text-sm text-on-surface-variant">
                            {t("settings.aiTab.desc")}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center gap-4 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-5 text-center">
                          <p className="text-xs uppercase tracking-widest text-primary/70">{t("settings.aiTab.estimators")}</p>
                          <p className="text-4xl font-extrabold text-on-surface">{aiInfo.n_estimators}</p>
                          <span className="text-[10px] text-on-surface-variant font-mono">n_estimators: {aiInfo.n_estimators}</span>
                        </div>
                      </div>

                      {/* Model parameters grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6">
                          <h4 className="text-xs uppercase tracking-wider text-outline mb-4 font-bold flex items-center gap-2">
                            <DatabaseOutlined className="text-primary" /> {t("settings.aiTab.infoTitle")}
                          </h4>
                          <ul className="space-y-3 text-sm text-on-surface-variant">
                            <li className="flex justify-between border-b border-outline-variant/5 pb-2">
                              <span>{t("settings.aiTab.modelClass")}</span>
                              <span className="font-mono text-on-surface font-semibold">{aiInfo.model_type}</span>
                            </li>
                            <li className="flex justify-between border-b border-outline-variant/5 pb-2">
                              <span>{t("settings.aiTab.featuresCount")}</span>
                              <span className="font-mono text-on-surface font-semibold">{aiInfo.n_features} {language === "vi" ? "đặc trưng" : "features"}</span>
                            </li>
                            <li className="flex justify-between pb-1">
                              <span>{t("settings.aiTab.classes")}</span>
                              <span className="font-mono text-on-surface font-semibold">
                                {aiInfo.classes.map((c) => (c === 1 ? "1 (Bot)" : language === "vi" ? "0 (Người dùng thật)" : "0 (Real User)")).join(", ")}
                              </span>
                            </li>
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6">
                          <h4 className="text-xs uppercase tracking-wider text-outline mb-4 font-bold flex items-center gap-2">
                            <InfoCircleOutlined className="text-primary" /> {t("settings.aiTab.mechanismTitle")}
                          </h4>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {t("settings.aiTab.mechanismDesc")}
                          </p>
                          <div className="mt-4 flex gap-2">
                            <span className="rounded bg-error/10 border border-error/20 px-2 py-1 text-[10px] font-bold text-error">
                              {t("settings.aiTab.criticalBot")}
                            </span>
                            <span className="rounded bg-amber-50/10 border border-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-400">
                              {t("settings.aiTab.suspiciousBot")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6 md:p-8">
                        <h4 className="text-sm uppercase tracking-wider text-outline mb-6 font-bold flex items-center gap-2">
                          <GlobalOutlined className="text-primary" /> {t("settings.aiTab.featuresListTitle")}
                        </h4>
                        <div className="space-y-4">
                          {aiInfo.features.map((feature, idx) => {
                            const details = getFeatureDescription(feature);
                            return (
                              <div
                                key={feature}
                                className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-outline-variant/10 pb-4 last:border-0 last:pb-0"
                              >
                                <div className="sm:w-1/3 flex items-center gap-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-mono text-primary font-bold">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <span className="font-mono text-xs text-on-surface font-bold block">{feature}</span>
                                    <span className="text-[10px] text-primary font-semibold">{details.label}</span>
                                  </div>
                                </div>
                                <div className="sm:w-2/3 text-xs text-on-surface-variant leading-relaxed">
                                  {details.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Tab 3: Sync & System */}
              {activeTab === "sync" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <SyncOutlined className="text-lg" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-on-surface">{t("settings.syncTab.title")}</h3>
                        <p className="text-xs text-on-surface-variant">{t("settings.syncTab.desc")}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                        <span className="text-xs text-outline block">{t("settings.syncTab.offsetLabel")}</span>
                        <p className="text-2xl font-mono font-bold text-on-surface mt-2">
                          {status ? `${status.lastByteOffset.toLocaleString()} Bytes` : "-"}
                        </p>
                        <span className="text-[10px] text-on-surface-variant block mt-1">
                          {language === "vi" ? "Đảm bảo việc đọc log tuần tự, không bị trùng lặp." : "Ensures sequential log reading without duplicates."}
                        </span>
                      </div>

                      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                        <span className="text-xs text-outline block">{t("settings.syncTab.lastSyncLabel")}</span>
                        <p className="text-lg font-mono font-bold text-on-surface mt-2">
                          {status ? formatTimestamp(status.updatedAt, language) : "-"}
                        </p>
                        <span className="text-[10px] text-on-surface-variant block mt-1">{t("settings.syncTab.autoSyncDesc")}</span>
                      </div>
                    </div>

                    {syncError && (
                      <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-xs text-error flex items-start gap-2">
                        <WarningOutlined className="mt-0.5" />
                        <span>{syncError}</span>
                      </div>
                    )}

                    {syncSuccess && (
                      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-xs text-green-400 flex items-start gap-2">
                        <CheckCircleOutlined className="mt-0.5" />
                        <span>{t("settings.syncTab.success")}</span>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="rounded-xl bg-primary py-3 px-6 text-sm font-bold text-on-primary-container hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2"
                      >
                        {syncing ? (
                          <>
                            <SyncOutlined className="animate-spin" /> {t("settings.syncTab.syncing")}
                          </>
                        ) : (
                          <>
                            <SyncOutlined /> {t("settings.syncTab.syncButton")}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* System specifications */}
                  <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6">
                    <h4 className="text-xs uppercase tracking-wider text-outline mb-4 font-bold flex items-center gap-2">
                      <InfoCircleOutlined className="text-primary" /> {t("settings.syncTab.infoTitle")}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-on-surface-variant/70 block">Database</span>
                        <span className="font-mono text-on-surface font-bold block mt-1">MySQL 8.0</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant/70 block">Backend Server</span>
                        <span className="font-mono text-on-surface font-bold block mt-1">NestJS v10</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant/70 block">AI Backend</span>
                        <span className="font-mono text-on-surface font-bold block mt-1">Flask / Python 3</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant/70 block">Frontend</span>
                        <span className="font-mono text-on-surface font-bold block mt-1">Next.js v15 (App)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Persistent Sidebar */}
      <DashboardSidebar />
    </div>
  );
}
