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
  WarningOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
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

const transferData = [
  { time: "04:00 PM", value: 18.4 },
  { time: "06:00 AM", value: 0.3 },
  { time: "07:00 AM", value: 0.2 },
  { time: "05:00 AM", value: 0.4 },
  { time: "09:00 PM", value: 0.2 },
  { time: "01:00 AM", value: 18.2 },
  { time: "10:00 PM", value: 37.1 },
  { time: "08:00 PM", value: 0.3 },
];

const tooltipStyle = {
  backgroundColor: "#171717",
  borderColor: "rgba(139,145,159,0.25)",
  color: "#e2e2e2",
  borderRadius: 10,
};

export default function DemoPage() {
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

  // Default mock data fallback
  const requestsData = [
    { time: "04:00 PM", ok: 52, warning: 1, error: 1 },
    { time: "06:00 AM", ok: 1, warning: 0, error: 0 },
    { time: "07:00 AM", ok: 16, warning: 2, error: 0 },
    { time: "05:00 AM", ok: 1, warning: 0, error: 0 },
    { time: "09:00 PM", ok: 54, warning: 1, error: 1 },
    { time: "01:00 AM", ok: 20, warning: 1, error: 0 },
    { time: "10:00 PM", ok: 80, warning: 2, error: 1 },
    { time: "08:00 PM", ok: 1, warning: 0, error: 0 },
  ];

  const statusCodes = [
    { name: "2xx", value: 161, color: "#57cd81" },
    { name: "4xx", value: 93, color: "#ff9d0a" },
    { name: "3xx", value: 8, color: "#4ca6ff" },
    { name: "5xx", value: 3, color: "#ff5b66" },
  ];

  const browserData = realData ? [
    { name: "Real User", value: realData.total - realData.bots_detected, color: "#57cd81" },
    { name: "Bots", value: realData.bots_detected, color: "#eb4349" },
  ] : [
    { name: "Chrome", value: 165, color: "#4ca6ff" },
    { name: "Edge", value: 55, color: "#ff9d0a" },
    { name: "Bots", value: 22, color: "#8d939f" },
    { name: "Safari", value: 21, color: "#57cd81" },
    { name: "Other", value: 2, color: "#1f232b" },
  ];

  const botPercentage = realData ? ((realData.bots_detected / realData.total) * 100).toFixed(1) : "8.3";
  const botCount = realData ? realData.bots_detected : 22;
  const totalCount = realData ? realData.total : 265;

  return (
    <div className="selection:bg-primary/30 selection:text-primary">
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#353535]/15 bg-[#131313] px-6 font-sans font-medium tracking-tight">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-[#abc7ff]">Log Curator</span>
          <div className="hidden gap-6 md:flex">
            <Link className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="/">
              Dashboard
            </Link>
            <Link className="border-b-2 border-[#abc7ff] pb-1 text-[#abc7ff] transition-colors hover:bg-[#353535]/40" href="/analytics">
              Analytics
            </Link>
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
          <div className="h-8 w-8 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container-high">
            <img
              alt="User profile"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBalHK2ZIt9renDt-yTGD_clOyQbaOFk5fhR-lee4vytkfnO4317aLX0NULJkhF_uDuMWFZCbQKlOf3ufbv-I9kyAnBG1lh15Vxda7v4m5NEekd_ToxcweQnHqCIQQELY7fG-bAc86AM12Hb9Tr1aY9LW3KPotzUSsCF5VLuxjajsg3tQ64AdSvw_ZHynOqyDXdwcV-piTDzYPv8tjagQt24AgjflQJJlpQBkI6zrSm_4Cm34J4NEBjO_u57kH1c4VYnaHA3lkJNcs"
            />
          </div>
        </div>
      </nav>

      <main className="relative overflow-hidden bg-surface px-6 pb-20 pt-10">
        <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-primary-container/10 blur-[110px]" />

        <div className="relative mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">Realtime Analysis Workspace</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">Traffic Intelligence Demo</h1>
              <p className="mt-2 max-w-3xl text-on-surface-variant">Interactive charts are now powered by Recharts for clearer trend reading and richer drilldown context.</p>
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 font-mono text-xs text-outline">
              Updated: 21 Apr 2026
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
              <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                <LineChartOutlined className="text-primary" /> Total Requests
              </p>
              <p className="text-4xl font-bold tracking-tight">{realData ? realData.total : 265}</p>
              <p className="mt-2 flex items-center gap-2 text-base text-error">
                <ArrowDownOutlined /> <span className="text-sm">60.8% success</span>
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
              <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                <UserOutlined className="text-primary" /> Unique IPs
              </p>
              <p className="text-4xl font-bold tracking-tight">{realData?.results?.length ?? 26}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
              <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                <DatabaseOutlined className="text-primary" /> Total Bandwidth
              </p>
              <p className="text-4xl font-bold tracking-tight">77.15 MB</p>
            </div>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
              <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                <GlobalOutlined className="text-primary" /> Avg Response Size
              </p>
              <p className="text-4xl font-bold tracking-tight">298.13 KB</p>
              <p className="mt-2 flex items-center gap-2 text-base text-green-400">
                <ArrowUpOutlined /> <span className="text-sm">11% errors</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-3xl font-bold tracking-tight text-on-surface">Requests <span className="text-lg text-outline">{realData ? realData.total : 265}</span></h3>
                <div className="font-mono text-xs uppercase text-outline">2xx 4xx 5xx</div>
              </div>
              <div className="h-64">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={requestsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(139,145,159,0.15)" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="time" stroke="#8b919f" tick={{ fill: "#8b919f", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b919f" tick={{ fill: "#8b919f", fontSize: 10 }} tickLine={false} axisLine={false} width={26} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#c1c6d5" }} />
                    <Line dataKey="ok" name="2xx" type="monotone" stroke="#57cd81" strokeWidth={2.4} dot={false} />
                    <Line dataKey="warning" name="4xx" type="monotone" stroke="#ff9d0a" strokeWidth={2} dot={false} />
                    <Line dataKey="error" name="5xx" type="monotone" stroke="#ff5b66" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-3xl font-bold tracking-tight text-on-surface">Data Transfer <span className="text-lg text-outline">77.15 MB</span></h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={transferData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(139,145,159,0.15)" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="time" stroke="#8b919f" tick={{ fill: "#8b919f", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b919f" tick={{ fill: "#8b919f", fontSize: 10 }} tickLine={false} axisLine={false} width={36} unit=" MB" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line dataKey="value" name="MB" type="monotone" stroke="#57cd81" strokeWidth={2.4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <h3 className="mb-6 text-2xl font-bold tracking-tight">HTTP Status Codes</h3>
              <div className="h-52">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie data={statusCodes} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                      {statusCodes.map((entry) => (
                        <Cell fill={entry.color} key={entry.name} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {statusCodes.map((item) => (
                  <div className="flex items-center justify-between text-sm" key={item.name}>
                    <span className="flex items-center gap-2 text-on-surface">
                      <span className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-on-surface-variant">{item.value} ({((item.value / statusCodes.reduce((s, i) => s + i.value, 0)) * 100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <h3 className="mb-6 text-2xl font-bold tracking-tight">Traffic Segments</h3>
              <div className="h-52">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie data={browserData} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                      {browserData.map((entry) => (
                        <Cell fill={entry.color} key={entry.name} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {browserData.map((item) => (
                  <div className="flex items-center justify-between text-sm" key={item.name}>
                    <span className="flex items-center gap-2 text-on-surface">
                      <span className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-on-surface-variant">{item.value} ({((item.value / browserData.reduce((s, i) => s + i.value, 0)) * 100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <h3 className="mb-6 text-2xl font-bold tracking-tight">AI Insights</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                  <p className="text-xs text-outline uppercase tracking-wider mb-1">Bot Detection Accuracy</p>
                  <p className="text-2xl font-bold text-primary">~91% (Random Forest)</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                  <p className="text-xs text-outline uppercase tracking-wider mb-1">Top Bot Indicator</p>
                  <p className="text-xl font-semibold">is_headless / session_duration</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  <RobotOutlined className="text-on-surface-variant" /> AI Bot Analysis
                </h3>
                <span className="rounded-lg bg-surface-container-high px-3 py-1 font-mono text-sm">{botCount} detected</span>
              </div>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold tracking-tight">{botPercentage}%</div>
                  <div className="text-lg text-on-surface-variant">of analyzed traffic</div>
                </div>
                <div className="h-28 w-28">
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie dataKey="value" data={[{ name: "Bot", value: +botCount }, { name: "Other", value: +totalCount - +botCount }]} innerRadius={30} outerRadius={46} stroke="none">
                        <Cell fill="#eb4349" />
                        <Cell fill="#14161b" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-lg">
                  <span>Bots</span>
                  <span className="text-on-surface-variant">{botCount}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#16385a]">
                  <div className="h-full bg-[#eb4349]" style={{ width: `${botPercentage}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
              <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-on-surface mb-6">
                <RadarChartOutlined className="text-primary" /> Top Suspected Bot IPs
              </h3>
              <div className="space-y-3">
                {realData?.results ? realData.results.filter((r: any) => r.is_bot).slice(0, 5).map((r: any) => (
                  <div key={r.ip} className="flex items-center justify-between p-2 rounded bg-black/20 text-sm">
                    <span className="font-mono">{r.ip}</span>
                    <span className="text-error font-semibold">{(r.confidence * 100).toFixed(0)}% Bot</span>
                  </div>
                )) : <p className="text-outline italic">No bots detected in this sample.</p>}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-low">
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
              <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-on-surface">
                <RadarChartOutlined className="text-primary" /> Analyzed Session Details
              </h3>
              {loading && <span className="text-primary animate-pulse text-sm">Analyzing via AI Service...</span>}
            </div>

            <div className="overflow-x-auto p-6 no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10 font-mono text-[11px] uppercase tracking-[0.18em] text-outline">
                    <th className="pb-4">IP Address</th>
                    <th className="pb-4">Type</th>
                    <th className="pb-4 text-right">Visits</th>
                    <th className="pb-4 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {realData?.results?.map((row: any) => (
                    <tr className="transition-colors hover:bg-surface-container-high/20" key={row.ip}>
                      <td className="py-3 text-sm font-mono text-on-surface">{row.ip}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${row.is_bot ? 'bg-error/20 text-error' : 'bg-green-500/20 text-green-400'}`}>
                          {row.is_bot ? 'BOT' : 'REAL USER'}
                        </span>
                      </td>
                      <td className="py-3 text-right text-sm font-semibold text-on-surface">{row.visit_count}</td>
                      <td className="py-3 text-right text-sm text-outline">{(row.confidence * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-outline/20 px-6 py-8 text-xs text-on-surface-variant">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span>Realtime analytics demo rendered entirely in your browser.</span>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span>Your logs never leave your machine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
