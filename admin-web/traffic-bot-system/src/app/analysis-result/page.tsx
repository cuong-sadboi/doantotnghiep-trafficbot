"use client";

import {
  BellOutlined,
  CodeOutlined,
  DashboardOutlined,
  RadarChartOutlined,
  RobotOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE_URL } from "@/lib/auth-client";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--surface-container-high)",
  borderColor: "var(--outline-variant)",
  color: "var(--on-surface)",
  borderRadius: 10,
};

export default function AnalysisResultPage() {
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
      const response = await fetch(`${API_BASE_URL}/ai/analyze-logs`, {
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

  const botCount = realData?.bots_detected ?? 0;
  const totalCount = realData?.total ?? 0;
  const botPercentage = totalCount > 0 ? ((botCount / totalCount) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary/30">
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/15 bg-background/80 backdrop-blur-md px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-primary">Log Curator</Link>
          <div className="hidden gap-6 md:flex text-sm font-medium">
            <Link className="text-on-surface-variant/70 hover:text-on-surface transition-colors" href="/analytics">{t("navbar.analytics")}</Link>
            <Link className="text-primary border-b-2 border-primary pb-1" href="/analysis-result">{language === "vi" ? "Báo cáo" : "Report"}</Link>
            <Link className="text-on-surface-variant/70 hover:text-on-surface transition-colors" href="/demo">{language === "vi" ? "Không gian trải nghiệm" : "Demo Workspace"}</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="rounded-xl p-2 text-on-surface-variant/70 hover:bg-surface-container-high/40 transition-colors"><BellOutlined /></button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-primary-container" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-3 text-primary mb-2">
            <RobotOutlined />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold">{t("report.liveWorkspace")}</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{t("report.title")}</h1>
          <p className="text-[#A1A1AA] mt-2 italic">{t("report.subtitle")}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <div className="lg:col-span-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">{language === "vi" ? "TỔNG LƯU LƯỢNG" : "TOTAL TRAFFIC"}</p>
                <p className="text-4xl font-bold text-white">{totalCount}</p>
                <p className="text-xs text-green-400">{language === "vi" ? "Phân tích qua Batch API" : "Analyzed via Batch API"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">{language === "vi" ? "PHÁT HIỆN BOT" : "BOT DETECTION"}</p>
                <p className="text-4xl font-bold text-[#eb4349]">{botCount}</p>
                <p className="text-xs text-error/60">{language === "vi" ? "Trùng khớp độ tin cậy cao" : "High Confidence Matches"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">{language === "vi" ? "MỨC ĐỘ NGUY HIỂM" : "THREAT LEVEL"}</p>
                <p className={`text-4xl font-bold ${+botPercentage > 30 ? 'text-error' : 'text-primary'}`}>
                  {+botPercentage > 30 ? (language === "vi" ? 'Cao' : 'High') : (language === "vi" ? 'Trung bình' : 'Moderate')}
                </p>
                <p className="text-xs text-outline">{botPercentage}% {language === "vi" ? "Tỷ lệ Bot" : "Bot Ratio"}</p>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-xl bg-surface-container-high/40 border border-outline-variant/30">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <RadarChartOutlined className="text-primary" /> {language === "vi" ? "Phát hiện chính" : "Key Findings"}
              </h3>
              <ul className="space-y-3 text-sm text-[#A1A1AA]">
                <li className="flex gap-3 items-start">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] shrink-0 mt-0.5">1</span>
                  <span>{language === "vi" ? <>Mô hình đã xác định thành công <b className="text-white">{botCount}</b> bot bằng thuật toán <b>Random Forest</b>.</> : <>Model successfully identified <b className="text-white">{botCount}</b> bot instances using <b>Random Forest</b> classification.</>}</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] shrink-0 mt-0.5">2</span>
                  <span>{language === "vi" ? <>Các chỉ số chính bao gồm <b>thời gian phiên bất thường</b> và <b>headless user agent</b>.</> : <>Predominant indicators include <b>abnormal session durations</b> and <b>headless user agents</b>.</>}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pie Chart Card */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-8 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1AA] mb-6">{t("report.charts.segments")}</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Bot", value: botCount, color: "#eb4349" },
                      { name: "User", value: totalCount - botCount, color: "#57cd81" }
                    ]}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    stroke="none"
                  >
                    <Cell fill="#eb4349" />
                    <Cell fill="#57cd81" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex gap-6 text-xs font-bold">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#eb4349]" /> BOTS</div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#57cd81]" /> {language === "vi" ? "NGƯỜI DÙNG" : "USERS"}</div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant/30 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">{t("report.table.title")}</h2>
            {loading && <span className="text-xs text-primary animate-pulse font-mono">RE-ANALYZING...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#A1A1AA] border-b border-[#353535]/10">
                  <th className="px-8 py-4">{t("report.table.ip")}</th>
                  <th className="px-8 py-4">{t("report.table.classification")}</th>
                  <th className="px-8 py-4">{t("report.table.visits")}</th>
                  <th className="px-8 py-4 text-right">{t("report.table.confidence")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353535]/10">
                {realData?.results?.map((row: any) => (
                  <tr key={row.ip} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4 font-mono text-sm">{row.ip}</td>
                    <td className="px-8 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${row.is_bot ? 'bg-error/10 text-error' : 'bg-green-500/10 text-green-400'}`}>
                        {row.is_bot ? (language === "vi" ? "Phát hiện Bot" : "Bot Detected") : (language === "vi" ? "Người dùng xác thực" : "Verified User")}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm font-medium text-[#A1A1AA]">{row.visit_count} {language === "vi" ? "yêu cầu" : "reqs"}</td>
                    <td className="px-8 py-4 text-right font-mono text-sm text-primary">{(row.confidence * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {!realData?.results && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-[#A1A1AA] italic">{t("report.table.empty")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
