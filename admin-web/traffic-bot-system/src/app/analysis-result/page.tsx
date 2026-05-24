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
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#171717",
  borderColor: "rgba(139,145,159,0.25)",
  color: "#e2e2e2",
  borderRadius: 10,
};

export default function AnalysisResultPage() {
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

  const botCount = realData?.bots_detected ?? 0;
  const totalCount = realData?.total ?? 0;
  const botPercentage = totalCount > 0 ? ((botCount / totalCount) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e2e2] selection:bg-primary/30">
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#353535]/15 bg-[#131313]/80 backdrop-blur-md px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-[#abc7ff]">Log Curator</Link>
          <div className="hidden gap-6 md:flex text-sm font-medium">
            <Link className="text-[#A1A1AA] hover:text-[#e2e2e2] transition-colors" href="/analytics">Analytics</Link>
            <Link className="text-[#abc7ff] border-b-2 border-[#abc7ff] pb-1" href="/analysis-result">Report</Link>
            <Link className="text-[#A1A1AA] hover:text-[#e2e2e2] transition-colors" href="/demo">Demo Workspace</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="rounded-xl p-2 text-[#A1A1AA] hover:bg-[#353535]/40 transition-colors"><BellOutlined /></button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-primary-container" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-3 text-primary mb-2">
            <RobotOutlined />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold">AI Security Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Analysis Report</h1>
          <p className="text-[#A1A1AA] mt-2 italic">Detailed breakdown of traffic patterns and security threats detected by our AI model.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <div className="lg:col-span-2 rounded-2xl border border-[#353535]/30 bg-[#161616] p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Total Traffic</p>
                <p className="text-4xl font-bold text-white">{totalCount}</p>
                <p className="text-xs text-green-400">Analyzed via Batch API</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Bot Detection</p>
                <p className="text-4xl font-bold text-[#eb4349]">{botCount}</p>
                <p className="text-xs text-error/60">High Confidence Matches</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Threat Level</p>
                <p className={`text-4xl font-bold ${+botPercentage > 30 ? 'text-error' : 'text-primary'}`}>
                  {+botPercentage > 30 ? 'High' : 'Moderate'}
                </p>
                <p className="text-xs text-outline">{botPercentage}% Bot Ratio</p>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-xl bg-black/40 border border-[#353535]/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <RadarChartOutlined className="text-primary" /> Key Findings
              </h3>
              <ul className="space-y-3 text-sm text-[#A1A1AA]">
                <li className="flex gap-3 items-start">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Model successfully identified <b className="text-white">{botCount}</b> bot instances using <b>Random Forest</b> classification.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Predominant indicators include <b>abnormal session durations</b> and <b>headless user agents</b>.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pie Chart Card */}
          <div className="rounded-2xl border border-[#353535]/30 bg-[#161616] p-8 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1AA] mb-6">Traffic Composition</h3>
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
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#57cd81]" /> USERS</div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <section className="rounded-2xl border border-[#353535]/30 bg-[#161616] overflow-hidden">
          <div className="px-8 py-6 border-b border-[#353535]/30 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Analyzed IP Sessions</h2>
            {loading && <span className="text-xs text-primary animate-pulse font-mono">RE-ANALYZING...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#A1A1AA] border-b border-[#353535]/10">
                  <th className="px-8 py-4">IP Address</th>
                  <th className="px-8 py-4">Classification</th>
                  <th className="px-8 py-4">Visit Count</th>
                  <th className="px-8 py-4 text-right">Model Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353535]/10">
                {realData?.results?.map((row: any) => (
                  <tr key={row.ip} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4 font-mono text-sm">{row.ip}</td>
                    <td className="px-8 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${row.is_bot ? 'bg-error/10 text-error' : 'bg-green-500/10 text-green-400'}`}>
                        {row.is_bot ? 'Bot Detected' : 'Verified User'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm font-medium text-[#A1A1AA]">{row.visit_count} reqs</td>
                    <td className="px-8 py-4 text-right font-mono text-sm text-primary">{(row.confidence * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {!realData?.results && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-[#A1A1AA] italic">No log data found in session. Please upload logs on the Analytics page.</td>
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
