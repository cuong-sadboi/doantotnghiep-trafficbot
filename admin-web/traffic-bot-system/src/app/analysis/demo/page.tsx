"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BellOutlined,
  CodeOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LineChartOutlined,
  RadarChartOutlined,
  RobotOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--surface-container-high)",
  borderColor: "var(--outline-variant)",
  color: "var(--on-surface)",
  borderRadius: 10,
};

export default function AnalysisDemoPage() {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [realData, setRealData] = useState<any>(null);

  useEffect(() => {
    const rawLog = sessionStorage.getItem("log-curator:raw-access-log");
    if (rawLog) {
      handleAnalyze(rawLog);
    }
  }, []);

  const handleAnalyze = async (logText: string) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/ai/analyze-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logText }),
      });
      const data = await response.json();
      setRealData(data);
    } catch (error) {
      console.error("Failed to analyze logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Data from API
  const stats = realData?.stats;
  const requestsData = stats?.timeline || [];
  const transferData = stats?.timeline?.map((t: any) => ({ time: t.time, value: t.bandwidth })) || [];
  
  const statusCodes = stats ? Object.entries(stats.statusCodes).map(([name, value]) => ({
    name,
    value,
    color: name.startsWith('2') ? "#57cd81" : name.startsWith('4') ? "#ff9d0a" : name.startsWith('5') ? "#ff5b66" : "#4ca6ff"
  })) : [];

  const trafficSegments = realData ? [
    { name: "Real User", value: realData.total - realData.bots_detected, color: "#57cd81" },
    { name: "Bots", value: realData.bots_detected, color: "#eb4349" },
  ] : [];

  const botPercentage = realData?.total > 0 ? ((realData.bots_detected / realData.total) * 100).toFixed(1) : "0";
  const successRate = (stats && realData?.total > 0) ? ((Object.entries(stats.statusCodes).filter(([k]) => k.startsWith('2')).reduce((s, [_, v]) => s + (v as number), 0) / realData.total) * 100).toFixed(1) : "0";

  return (
    <div className="selection:bg-primary/30 selection:text-primary min-h-screen bg-surface">
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/15 bg-background px-6 font-sans font-medium tracking-tight">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-primary">Log Curator</Link>
          <div className="hidden gap-6 md:flex">
            <Link className="text-on-surface-variant/70 hover:text-on-surface transition-colors" href="/analytics">{t("navbar.analytics")}</Link>
            <Link className="text-on-surface-variant/70 hover:text-on-surface transition-colors" href="/analysis/result">{language === "vi" ? "Báo cáo" : "Report"}</Link>
            <Link className="text-primary border-b-2 border-primary pb-1" href="/analysis/demo">{language === "vi" ? "Không gian trải nghiệm" : "Demo Workspace"}</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {loading && <span className="text-primary animate-pulse text-xs font-mono">PROCESSING...</span>}
           <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-primary-container" />
        </div>
      </nav>

      <main className="relative overflow-hidden px-6 pb-20 pt-10">
        {!realData && !loading && (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <div className="p-6 rounded-full bg-surface-container-high border border-outline/20">
              <CodeOutlined className="text-4xl text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{language === "vi" ? "Chưa có dữ liệu phân tích" : "No Data Analyzed"}</h2>
            <p className="text-on-surface-variant">{language === "vi" ? "Vui lòng tải log lên ở trang Phân tích trước." : "Please upload your logs on the Analytics page first."}</p>
          </div>
        )}

        {realData && (
          <div className="relative mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">{t("demo.liveWorkspace")}</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">{t("demo.title")}</h1>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <LineChartOutlined className="text-primary" /> {t("demo.kpis.totalReqs")}
                </p>
                <p className="text-4xl font-bold tracking-tight">{realData?.total}</p>
                <p className={`mt-2 flex items-center gap-2 text-sm ${+successRate > 90 ? 'text-green-400' : 'text-error'}`}>
                   {+successRate > 90 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {successRate}% {t("demo.kpis.success")}
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <UserOutlined className="text-primary" /> {t("demo.kpis.uniqueIps")}
                </p>
                <p className="text-4xl font-bold tracking-tight">{realData?.results?.length}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <DatabaseOutlined className="text-primary" /> {t("demo.kpis.bandwidth")}
                </p>
                <p className="text-4xl font-bold tracking-tight">{stats?.totalBandwidth} MB</p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <GlobalOutlined className="text-primary" /> {t("demo.kpis.avgResponse")}
                </p>
                <p className="text-4xl font-bold tracking-tight">{stats?.avgResponseSize} KB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-xl font-bold mb-4">{t("demo.charts.reqsTime")}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={requestsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,145,159,0.15)" vertical={false} />
                      <XAxis dataKey="time" stroke="#8b919f" fontSize={10} />
                      <YAxis stroke="#8b919f" fontSize={10} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="ok" name="2xx" stroke="#57cd81" dot={false} />
                      <Line type="monotone" dataKey="warning" name="4xx" stroke="#ff9d0a" dot={false} />
                      <Line type="monotone" dataKey="error" name="5xx" stroke="#ff5b66" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-xl font-bold mb-4">{t("report.charts.transfer")}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={transferData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,145,159,0.15)" vertical={false} />
                      <XAxis dataKey="time" stroke="#8b919f" fontSize={10} />
                      <YAxis stroke="#8b919f" fontSize={10} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="value" name="MB" stroke="#4ca6ff" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-lg font-bold mb-6">{t("demo.charts.statusCodes")}</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusCodes} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                        {statusCodes.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-lg font-bold mb-6">{t("demo.charts.segments")}</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={trafficSegments} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                        {trafficSegments.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-lg font-bold mb-6">{t("demo.charts.aiInsights")}</h3>
                <div className="space-y-4">
                   <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20 text-center">
                      <p className="text-4xl font-bold text-error">{botPercentage}%</p>
                      <p className="text-xs text-outline uppercase tracking-widest mt-1">{language === "vi" ? "Tỷ lệ Bot" : "Bot Traffic Ratio"}</p>
                   </div>
                   <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                      <p className="text-sm font-semibold mb-2">{t("demo.analysis.topIps")}</p>
                      <div className="space-y-1">
                        {realData?.results?.filter((r: any) => r.is_bot).slice(0, 3).map((r: any) => (
                          <div key={r.ip} className="flex justify-between text-xs font-mono">
                            <span>{r.ip}</span>
                            <span className="text-error">{(r.confidence * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                 <h3 className="text-xl font-bold">{t("demo.analysis.tableTitle")}</h3>
              </div>
              <div className="overflow-x-auto p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-outline tracking-wider border-b border-outline-variant/10">
                      <th className="pb-3">{t("demo.analysis.ip")}</th>
                      <th className="pb-3">{t("demo.analysis.classification")}</th>
                      <th className="pb-3 text-right">{t("demo.analysis.visitCount")}</th>
                      <th className="pb-3 text-right">{t("demo.analysis.confidence")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {realData?.results?.map((row: any) => (
                      <tr key={row.ip} className="hover:bg-white/[0.02]">
                        <td className="py-4 font-mono text-sm">{row.ip}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.is_bot ? 'bg-error/20 text-error' : 'bg-green-500/20 text-green-400'}`}>
                            {row.is_bot ? 'BOT' : language === "vi" ? 'NGƯỜI DÙNG' : 'USER'}
                          </span>
                        </td>
                        <td className="text-right text-sm">{row.visit_count}</td>
                        <td className="text-right font-mono text-sm text-primary">{(row.confidence * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
