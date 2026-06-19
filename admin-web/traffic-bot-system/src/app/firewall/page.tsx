"use client";

import {
  BellOutlined,
  CloseOutlined,
  CodeOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import NavbarAuthArea from "@/components/NavbarAuthArea";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE_URL } from "@/lib/auth-client";

interface BlockedIpRule {
  id: string;
  ip: string;
  action: "BLOCK" | "RATE_LIMIT";
  reason: string;
  requestsPerMinute: number | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function FirewallPage() {
  const { t, language } = useLanguage();
  const [rules, setRules] = useState<BlockedIpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [ipInput, setIpInput] = useState("");
  const [actionInput, setActionInput] = useState<"BLOCK" | "RATE_LIMIT">("BLOCK");
  const [reasonInput, setReasonInput] = useState("");
  const [durationInput, setDurationInput] = useState<string>("24"); // Default 24 hours
  const [rpmInput, setRpmInput] = useState<number>(60);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter & Pagination
  const [filterQuery, setFilterQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchRules = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/firewall/rules`);
      if (!response.ok) {
        throw new Error(language === "vi" ? "Không thể tải danh sách luật Firewall." : "Failed to load firewall rules.");
      }
      const data = (await response.json()) as BlockedIpRule[];
      setRules(data);
    } catch (err: any) {
      setError(err?.message ?? "An error occurred.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRules(true);
    const interval = setInterval(() => fetchRules(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;

    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const durationHours = durationInput === "forever" ? 0 : Number(durationInput);

    try {
      const response = await fetch(`${API_BASE_URL}/firewall/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: ipInput.trim(),
          action: actionInput,
          reason: reasonInput.trim() || undefined,
          durationHours: durationHours > 0 ? durationHours : undefined,
          requestsPerMinute: actionInput === "RATE_LIMIT" ? rpmInput : undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message || (language === "vi" ? "Lỗi khi áp dụng quy tắc chặn." : "Failed to apply firewall rule."));
      }

      setFormSuccess(t("firewall.form.success"));
      setIpInput("");
      setReasonInput("");
      fetchRules(false);

      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      setFormError(err?.message || t("firewall.form.error"));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/firewall/rules/${ip}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(language === "vi" ? "Gỡ chặn thất bại." : "Failed to unblock IP.");
      }

      // Quick visual feedback
      setRules((prev) => prev.filter((r) => r.ip !== ip));
      fetchRules(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = rules.length;
    const blocked = rules.filter((r) => r.action === "BLOCK").length;
    const limited = total - blocked;
    return { total, blocked, limited };
  }, [rules]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    if (!filterQuery.trim()) return rules;
    const q = filterQuery.toLowerCase();
    return rules.filter(
      (r) =>
        r.ip.toLowerCase().includes(q) ||
        (r.reason && r.reason.toLowerCase().includes(q))
    );
  }, [rules, filterQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE);
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRules.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRules, currentPage]);

  const formatTimestamp = (val?: string | null) => {
    if (!val) return t("firewall.form.expiresForever");
    const date = new Date(val);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString(language === "vi" ? "vi-VN" : "en-US");
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
              <a className="border-b-2 border-primary pb-1 text-primary transition-colors hover:bg-surface-container-high/40" href="/firewall">
                {t("navbar.firewall")}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/settings">
                {t("navbar.settings")}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {refreshing && <span className="text-primary animate-pulse text-xs font-mono">{language === "vi" ? "ĐỒNG BỘ..." : "SYNCING..."}</span>}
            <div className="relative hidden lg:block">
              <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]" />
              <input
                className="w-72 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/90 py-2 pl-10 pr-4 text-sm font-mono text-on-surface placeholder:text-[#8b919f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t("navbar.search")}
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
            <button className="rounded-xl p-2 text-[#A1A1AA] transition-colors hover:bg-[#353535]/40" type="button" onClick={() => fetchRules(false)}>
              <SyncOutlined className={`text-base ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <NavbarAuthArea />
          </div>
        </nav>

        {/* Main Content */}
        <main className="px-6 pb-20 pt-10 flex-grow">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">{t("firewall.securitySpace")}</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">{t("firewall.title")}</h1>
                <p className="mt-2 max-w-3xl text-on-surface-variant">{t("firewall.subtitle")}</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-3 text-xs uppercase tracking-widest text-[#8b919f]">{t("firewall.kpis.totalRules")}</p>
                <p className="text-4xl font-extrabold font-mono text-on-surface">{stats.total}</p>
                <span className="text-[10px] text-on-surface-variant block mt-1">{t("firewall.kpis.activeDesc")}</span>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-3 text-xs uppercase tracking-widest text-error">{t("firewall.kpis.blockedCount")}</p>
                <p className="text-4xl font-extrabold font-mono text-error">{stats.blocked}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-3 text-xs uppercase tracking-widest text-amber-400">{t("firewall.kpis.limitedCount")}</p>
                <p className="text-4xl font-extrabold font-mono text-amber-400">{stats.limited}</p>
              </div>
            </div>

            {/* Grid Layout: Form and Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Manual Block Form */}
              <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-6 h-fit space-y-6">
                <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <PlusOutlined className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">{t("firewall.form.title")}</h3>
                  </div>
                </div>

                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                      {t("firewall.form.ipLabel")} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 192.168.1.100"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-outline mb-2 font-bold">
                      {t("firewall.form.actionLabel")}
                    </label>
                    <select
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value as any)}
                      className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="BLOCK">{t("firewall.actionTypes.block")}</option>
                      <option value="RATE_LIMIT">{t("firewall.actionTypes.rateLimit")}</option>
                    </select>
                  </div>

                  {actionInput === "RATE_LIMIT" && (
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#8b919f] mb-2 font-bold">
                        {t("firewall.form.rpmLabel")}
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={rpmInput}
                        onChange={(e) => setRpmInput(Number(e.target.value))}
                        className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#8b919f] mb-2 font-bold">
                      {t("firewall.form.reasonLabel")}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suspicious automated scanning"
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#8b919f] mb-2 font-bold">
                      {t("firewall.form.durationLabel")}
                    </label>
                    <select
                      value={durationInput}
                      onChange={(e) => setDurationInput(e.target.value)}
                      className="w-full rounded-xl border border-outline/30 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary"
                    >
                      <option value="1">{t("firewall.durationOptions.hour1")}</option>
                      <option value="24">{t("firewall.durationOptions.hour24")}</option>
                      <option value="168">{t("firewall.durationOptions.week1")}</option>
                      <option value="forever">{t("firewall.durationOptions.forever")}</option>
                    </select>
                  </div>

                  {formError && (
                    <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs text-error flex items-start gap-2">
                      <WarningOutlined className="mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-400 flex items-start gap-2">
                      <SafetyCertificateOutlined className="mt-0.5" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-on-primary-container hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? (
                      <>
                        <SyncOutlined className="animate-spin" /> {language === "vi" ? "Đang áp dụng..." : "Applying..."}
                      </>
                    ) : (
                      t("firewall.form.submit")
                    )}
                  </button>
                </form>
              </div>

              {/* Rules List Table */}
              <div className="lg:col-span-2 rounded-2xl border border-outline-variant/15 bg-surface-container-low overflow-hidden flex flex-col h-full">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <SafetyCertificateOutlined className="text-primary" /> {t("firewall.table.title")}
                  </h3>
                  <div className="relative">
                    <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#A1A1AA]" />
                    <input
                      className="w-52 rounded-lg border border-outline/30 bg-surface-container-lowest py-1.5 pl-8 pr-3 text-xs text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder={t("navbar.search")}
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto p-6">
                  {loading ? (
                    <div className="py-20 text-center text-on-surface-variant flex flex-col items-center gap-3">
                      <SyncOutlined className="animate-spin text-2xl text-primary" />
                      <span className="text-xs uppercase tracking-widest">{t("settings.streamForm.loading")}</span>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs uppercase text-outline tracking-wider border-b border-outline-variant/10">
                          <th className="pb-3">{t("firewall.table.ip")}</th>
                          <th className="pb-3">{t("firewall.table.action")}</th>
                          <th className="pb-3">{t("firewall.table.reason")}</th>
                          <th className="pb-3">{t("firewall.table.createdAt")}</th>
                          <th className="pb-3">{t("firewall.table.expires")}</th>
                          <th className="pb-3 text-right">{language === "vi" ? "Thao tác" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10 text-xs">
                        {paginatedRules.map((rule) => {
                          const isBlock = rule.action === "BLOCK";
                          const badgeClass = isBlock
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30";

                          return (
                            <tr key={rule.id} className="hover:bg-white/[0.01]">
                              <td className="py-4 font-mono font-semibold text-on-surface">{rule.ip}</td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                  {isBlock
                                    ? t("firewall.actionTypes.block")
                                    : `${t("firewall.actionTypes.rateLimit")} (${rule.requestsPerMinute} RPM)`}
                                </span>
                              </td>
                              <td className="py-4 text-on-surface-variant max-w-[150px] truncate" title={rule.reason}>
                                {rule.reason || "-"}
                              </td>
                              <td className="py-4 text-on-surface-variant font-mono">
                                {new Date(rule.createdAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                              </td>
                              <td className="py-4 text-on-surface-variant font-mono">
                                {formatTimestamp(rule.expiresAt)}
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => handleUnblock(rule.ip)}
                                  className="rounded-lg border border-red-500/30 bg-red-500/10 py-1.5 px-3 hover:bg-red-500/20 text-red-400 transition cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <DeleteOutlined /> {t("firewall.table.unblock")}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredRules.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-sm text-on-surface-variant">
                              {t("firewall.table.empty")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
                    <span className="text-xs text-on-surface-variant">
                      {t("incidents.table.displayRange", {
                        start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                        end: Math.min(currentPage * ITEMS_PER_PAGE, filteredRules.length),
                        total: filteredRules.length,
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-outline/20 bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition hover:bg-surface-container-high/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("incidents.table.prev")}
                      </button>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isActive = pageNum === currentPage;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition cursor-pointer font-semibold ${
                                isActive
                                  ? "bg-primary border-primary text-on-primary-container"
                                  : "border-outline/20 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-high/80"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-outline/20 bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition hover:bg-surface-container-high/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("incidents.table.next")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar */}
      <DashboardSidebar />
    </div>
  );
}
