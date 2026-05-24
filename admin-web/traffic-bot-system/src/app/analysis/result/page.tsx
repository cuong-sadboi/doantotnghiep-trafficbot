"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BellOutlined,
  CodeOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LineChartOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
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
  backgroundColor: "#171717",
  borderColor: "rgba(139,145,159,0.25)",
  color: "#e2e2e2",
  borderRadius: 10,
};

export default function AnalysisResultPage() {
  const [loading, setLoading] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const rawLog = sessionStorage.getItem("log-curator:raw-access-log");
    if (rawLog) {
      handleAnalyze(rawLog);
    }
  }, []);

  const handleAnalyze = async (logText: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("http://localhost:3001/ai/analyze-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logText }),
      });
      if (!response.ok) {
        let message = "Analysis failed";
        try {
          const body = await response.json();
          message = body?.error || body?.message || message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        setRealData(null);
        setErrorMessage(message);
        return;
      }
      const data = await response.json();
      setRealData(data);
    } catch (error) {
      console.error("Failed to analyze logs:", error);
      setRealData(null);
      setErrorMessage("Analysis failed. Please verify the AI service is running.");
    } finally {
      setLoading(false);
    }
  };

  const stats = realData?.stats;
  const requestsData = stats?.timeline || [];
  const transferData = stats?.timeline?.map((t: any) => ({ time: t.time, value: t.bandwidth })) || [];

  const statusCodes = stats
    ? Object.entries(stats.statusCodes).map(([name, value]) => ({
        name,
        value,
        color: name.startsWith("2")
          ? "#57cd81"
          : name.startsWith("4")
          ? "#ff9d0a"
          : name.startsWith("5")
          ? "#ff5b66"
          : "#4ca6ff",
      }))
    : [];

  const trafficSegments = realData
    ? [
        { name: "Real User", value: realData.total - realData.bots_detected, color: "#57cd81" },
        { name: "Bots", value: realData.bots_detected, color: "#eb4349" },
      ]
    : [];

  const botPercentage =
    realData?.total > 0 ? ((realData.bots_detected / realData.total) * 100).toFixed(1) : "0";
  const successRate =
    stats && realData?.total > 0
      ? (
          (Object.entries(stats.statusCodes)
            .filter(([k]) => k.startsWith("2"))
            .reduce((s, [, v]) => s + (v as number), 0) /
            realData.total) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="selection:bg-primary/30 selection:text-primary min-h-screen bg-surface">
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
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="/streams">
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
          {loading && <span className="text-primary animate-pulse text-xs font-mono">PROCESSING...</span>}
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

      <main className="relative overflow-hidden px-6 pb-20 pt-10">
        {!realData && !loading && (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <div className="p-6 rounded-full bg-surface-container-high border border-outline/20">
              <CodeOutlined className="text-4xl text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{errorMessage ? "Analysis Failed" : "No Data Available"}</h2>
            <p className="text-on-surface-variant">
              {errorMessage ? (
                errorMessage
              ) : (
                <>
                  Please analyze logs from the{" "}
                  <Link className="text-primary underline" href="/analytics">
                    Analytics page
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        )}

        {realData && (
          <div className="relative mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">AI-Powered Analysis Result</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
                  Traffic Intelligence Report
                </h1>
                <p className="mt-2 max-w-3xl text-on-surface-variant">
                  Generated from your latest log analysis and rendered with live charts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <LineChartOutlined className="text-primary" /> Total Requests
                </p>
                <p className="text-4xl font-bold tracking-tight">{realData?.total}</p>
                <p className={`mt-2 flex items-center gap-2 text-sm ${+successRate > 90 ? "text-green-400" : "text-error"}`}>
                  {+successRate > 90 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {successRate}% success
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <UserOutlined className="text-primary" /> Unique IPs
                </p>
                <p className="text-4xl font-bold tracking-tight">{realData?.results?.length}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <DatabaseOutlined className="text-primary" /> Total Bandwidth
                </p>
                <p className="text-4xl font-bold tracking-tight">{stats?.totalBandwidth} MB</p>
              </div>
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                  <GlobalOutlined className="text-primary" /> Avg Response Size
                </p>
                <p className="text-4xl font-bold tracking-tight">{stats?.avgResponseSize} KB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-xl font-bold mb-4">Requests Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={requestsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#353535" vertical={false} />
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
                <h3 className="text-xl font-bold mb-4">Bandwidth Usage (MB)</h3>
                <div className="h-64">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={transferData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#353535" vertical={false} />
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
                <h3 className="text-lg font-bold mb-6">HTTP Status Codes</h3>
                <div className="h-52">
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie data={statusCodes} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                        {statusCodes.map((entry, index) => (
                          <Cell fill={entry.color} key={index} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-lg font-bold mb-6">Traffic Segments</h3>
                <div className="h-52">
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie data={trafficSegments} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                        {trafficSegments.map((entry, index) => (
                          <Cell fill={entry.color} key={index} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                <h3 className="text-lg font-bold mb-6">AI Bot Insights</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20 text-center">
                    <p className="text-4xl font-bold text-error">{botPercentage}%</p>
                    <p className="text-xs text-outline uppercase tracking-widest mt-1">Bot Traffic Ratio</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                    <p className="text-sm font-semibold mb-2">Top Bot IPs</p>
                    <div className="space-y-1">
                      {realData?.results
                        ?.filter((r: any) => r.is_bot)
                        .slice(0, 3)
                        .map((r: any) => (
                          <div className="flex justify-between text-xs font-mono" key={r.ip}>
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
                <h3 className="text-xl font-bold">Analyzed IP Sessions</h3>
              </div>
              <div className="overflow-x-auto p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-outline tracking-wider border-b border-outline-variant/10">
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3 text-right">Visits</th>
                      <th className="pb-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {realData?.results?.map((row: any) => (
                      <tr className="hover:bg-white/[0.02]" key={row.ip}>
                        <td className="py-4 font-mono text-sm">{row.ip}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.is_bot ? "bg-error/20 text-error" : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {row.is_bot ? "BOT" : "USER"}
                          </span>
                        </td>
                        <td className="text-right text-sm">{row.visit_count}</td>
                        <td className="text-right font-mono text-sm text-primary">
                          {(row.confidence * 100).toFixed(1)}%
                        </td>
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
