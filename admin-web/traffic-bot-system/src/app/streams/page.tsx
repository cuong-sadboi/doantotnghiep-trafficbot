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
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Bar,
  BarChart,
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

interface StreamEntry {
  id: string;
  sourceKey: string;
  ip: string;
  method: string;
  path: string;
  status: number;
  size: number;
  userAgent: string;
  loggedAt: string;
  rawLine: string;
}

interface StreamStatus {
  sourceKey: string;
  sourceUrl: string;
  lastByteOffset: number;
  updatedAt: string | null;
}

const tooltipStyle = {
  backgroundColor: "#171717",
  borderColor: "rgba(139,145,159,0.25)",
  color: "#e2e2e2",
  borderRadius: 10,
};

const formatBytes = (bytes: number) => {
  if (Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const statusTone = (status: number) => {
  if (status >= 200 && status < 300) return "bg-green-500/20 text-green-400";
  if (status >= 400 && status < 500) return "bg-amber-500/20 text-amber-400";
  if (status >= 500) return "bg-error/20 text-error";
  return "bg-blue-500/20 text-blue-400";
};

const statusColor = (statusCode: string) => {
  if (statusCode.startsWith("2")) return "#57cd81";
  if (statusCode.startsWith("4")) return "#ff9d0a";
  if (statusCode.startsWith("5")) return "#ff5b66";
  return "#4ca6ff";
};

const methodPalette = ["#57cd81", "#4ca6ff", "#ff9d0a", "#eb4349", "#a78bfa", "#f59e0b"];
const BOT_UA_REGEX = /bot|crawl|spider|headless|slurp|bingpreview|python-requests|wget|curl|scrapy|httpclient/i;
const DEFAULT_VISIBLE_ROWS = 20;
const truncateLabel = (value: string, max = 20) => (value.length > max ? `${value.slice(0, max)}...` : value);

export default function StreamsPage() {
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchStreamData = async (showSpinner: boolean) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [entriesResponse, statusResponse] = await Promise.all([
        fetch("http://localhost:3001/streams/entries?limit=200"),
        fetch("http://localhost:3001/streams/status"),
      ]);

      if (!entriesResponse.ok) {
        throw new Error("Failed to load stream entries.");
      }

      if (!statusResponse.ok) {
        throw new Error("Failed to load stream status.");
      }

      const entriesData = (await entriesResponse.json()) as StreamEntry[];
      const statusData = (await statusResponse.json()) as StreamStatus;

      setEntries(entriesData);
      setStatus(statusData);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load stream data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStreamData(true);
    const intervalId = setInterval(() => fetchStreamData(false), 10000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setShowAll(false);
  }, [filter, entries.length]);

  const derived = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const methodCounts: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};
    const pathCounts: Record<string, number> = {};
    const botAgentCounts: Record<string, number> = {};
    const botIps = new Set<string>();
    const uniquePaths = new Set<string>();
    const ipPathSets: Record<string, Set<string>> = {};
    const timeline: Record<string, { time: string; ok: number; warning: number; error: number; bandwidth: number }> = {};
    let totalBytes = 0;
    let successCount = 0;
    let botCount = 0;

    entries.forEach((entry) => {
      totalBytes += entry.size || 0;
      if (entry.status >= 200 && entry.status < 300) successCount += 1;

      const statusKey = String(entry.status);
      statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;

      const methodKey = entry.method?.toUpperCase() || "OTHER";
      methodCounts[methodKey] = (methodCounts[methodKey] ?? 0) + 1;

      ipCounts[entry.ip] = (ipCounts[entry.ip] ?? 0) + 1;
      pathCounts[entry.path] = (pathCounts[entry.path] ?? 0) + 1;
      uniquePaths.add(entry.path);

      if (!ipPathSets[entry.ip]) {
        ipPathSets[entry.ip] = new Set<string>();
      }
      ipPathSets[entry.ip].add(entry.path);

      const ua = entry.userAgent || "";
      if (BOT_UA_REGEX.test(ua)) {
        botCount += 1;
        botIps.add(entry.ip);
        botAgentCounts[ua] = (botAgentCounts[ua] ?? 0) + 1;
      }

      const date = new Date(entry.loggedAt);
      if (!Number.isNaN(date.getTime())) {
        const hour = date.getHours();
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        const timeKey = `${displayHour.toString().padStart(2, "0")}:00 ${ampm}`;

        if (!timeline[timeKey]) {
          timeline[timeKey] = { time: timeKey, ok: 0, warning: 0, error: 0, bandwidth: 0 };
        }

        if (entry.status >= 200 && entry.status < 300) timeline[timeKey].ok += 1;
        else if (entry.status >= 400 && entry.status < 500) timeline[timeKey].warning += 1;
        else if (entry.status >= 500) timeline[timeKey].error += 1;

        timeline[timeKey].bandwidth += (entry.size || 0) / (1024 * 1024);
      }
    });

    const timelineData = Object.values(timeline)
      .sort((a, b) => {
        const parseKey = (value: string) => {
          const [hourPart, ampm] = value.split(" ");
          const hour = Number(hourPart.split(":")[0]) % 12;
          return hour + (ampm === "PM" ? 12 : 0);
        };
        return parseKey(a.time) - parseKey(b.time);
      })
      .map((item) => ({
        ...item,
        bandwidth: Number(item.bandwidth.toFixed(2)),
      }));

    const statusCodes = Object.entries(statusCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([name, value]) => ({
        name,
        value,
        color: statusColor(name),
      }));

    const methodSegments = Object.entries(methodCounts).map(([name, value], index) => ({
      name,
      value,
      color: methodPalette[index % methodPalette.length],
    }));

    const topIps = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const topPaths = Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const botTopAgents = Object.entries(botAgentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const avgPathsPerIp = (() => {
      const sizes = Object.values(ipPathSets).map((set) => set.size);
      if (!sizes.length) return 0;
      const total = sizes.reduce((sum, value) => sum + value, 0);
      return total / sizes.length;
    })();

    const peakSlot = timelineData.reduce(
      (current, item) => {
        const total = item.ok + item.warning + item.error;
        if (total > current.count) {
          return { time: item.time, count: total };
        }
        return current;
      },
      { time: "-", count: 0 },
    );

    return {
      totalBytes,
      successCount,
      timelineData,
      statusCodes,
      methodSegments,
      topIps,
      topPaths,
      botCount,
      botIpCount: botIps.size,
      botTopAgents,
      uniquePathsCount: uniquePaths.size,
      avgPathsPerIp,
      peakTime: peakSlot.time,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!filter.trim()) return entries;
    const query = filter.toLowerCase();
    return entries.filter((entry) =>
      [entry.ip, entry.method, entry.path, entry.userAgent]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [entries, filter]);

  const totalCount = entries.length;
  const uniqueIps = new Set(entries.map((entry) => entry.ip)).size;
  const totalBandwidth = derived.totalBytes / (1024 * 1024);
  const avgResponseSize = totalCount ? derived.totalBytes / totalCount / 1024 : 0;
  const successRate = totalCount ? (derived.successCount / totalCount) * 100 : 0;
  const botRatio = totalCount ? (derived.botCount / totalCount) * 100 : 0;
  const avgRequestsPerIp = uniqueIps ? totalCount / uniqueIps : 0;
  const visibleEntries = showAll ? filteredEntries : filteredEntries.slice(0, DEFAULT_VISIBLE_ROWS);
  const botPieData = [
    { name: "Bots", value: derived.botCount, color: "#eb4349" },
    { name: "Other", value: Math.max(totalCount - derived.botCount, 0), color: "#57cd81" },
  ];
  const topPathsChart = derived.topPaths.map(([path, count]) => ({
    name: truncateLabel(path, 26),
    value: count,
  }));

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/30 selection:text-primary">
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#353535]/15 bg-[#131313] px-6 font-sans font-medium tracking-tight">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-[#abc7ff]">Log Curator</span>
          <div className="hidden gap-6 md:flex">
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="/">
              Dashboard
            </a>
            <a className="text-[#A1A1AA] transition-colors hover:bg-[#353535]/40 hover:text-[#e2e2e2]" href="/analytics">
              Analytics
            </a>
            <a className="border-b-2 border-[#abc7ff] pb-1 text-[#abc7ff] transition-colors hover:bg-[#353535]/40" href="/streams">
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
          {refreshing && <span className="text-primary animate-pulse text-xs font-mono">SYNCING...</span>}
          <div className="relative hidden lg:block">
            <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]" />
            <input
              className="w-72 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/90 py-2 pl-10 pr-4 text-sm font-mono text-on-surface placeholder:text-[#8b919f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search logs..."
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
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

      <main className="px-6 pb-20 pt-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">Live analysis workspace</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">Streams Report</h1>
              <p className="mt-2 max-w-3xl text-on-surface-variant">
                Polling every 60 seconds and ingesting only new log lines from PythonAnywhere.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-outline/30 bg-surface-container-high px-4 py-2 text-xs font-semibold uppercase tracking-wide text-on-surface transition-colors hover:bg-surface-container-high/70"
                onClick={() => fetchStreamData(true)}
                type="button"
              >
                Refresh
              </button>
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-2 text-xs text-outline">
                Updated: {formatTimestamp(status?.updatedAt)}
              </div>
            </div>
          </div>

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 rounded-xl border border-outline-variant/10 bg-surface-container-low">
              <div className="p-6 rounded-full bg-surface-container-high border border-outline/20">
                <CodeOutlined className="text-4xl text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{error ? "Stream Error" : "No Stream Data"}</h2>
              <p className="text-on-surface-variant text-center max-w-xl">
                {error
                  ? error
                  : "Waiting for new log lines. Check the stream source or wait for the next poll."}
              </p>
            </div>
          )}

          {entries.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                  <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                    <LineChartOutlined className="text-primary" /> Total Requests
                  </p>
                  <p className="text-4xl font-bold tracking-tight">{totalCount}</p>
                  <p className={`mt-2 flex items-center gap-2 text-sm ${successRate > 90 ? "text-green-400" : "text-error"}`}>
                    {successRate > 90 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {successRate.toFixed(1)}% success
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                  <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                    <UserOutlined className="text-primary" /> Unique IPs
                  </p>
                  <p className="text-4xl font-bold tracking-tight">{uniqueIps}</p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                  <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                    <DatabaseOutlined className="text-primary" /> Total Bandwidth
                  </p>
                  <p className="text-4xl font-bold tracking-tight">{totalBandwidth.toFixed(2)} MB</p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                  <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                    <GlobalOutlined className="text-primary" /> Avg Response Size
                  </p>
                  <p className="text-4xl font-bold tracking-tight">{avgResponseSize.toFixed(2)} KB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                  <h3 className="text-xl font-bold mb-4">Requests Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer height="100%" width="100%">
                      <LineChart data={derived.timelineData}>
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
                      <LineChart data={derived.timelineData.map((item) => ({ time: item.time, value: item.bandwidth }))}>
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
                  <h3 className="text-lg font-bold">HTTP Status Codes</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    2xx = success, 4xx = client issues, 5xx = server errors.
                  </p>
                  <div className="h-52">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie data={derived.statusCodes} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                          {derived.statusCodes.map((entry) => (
                            <Cell fill={entry.color} key={entry.name} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                  <h3 className="text-lg font-bold">HTTP Methods</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Share of requests by method (GET, POST, PUT, etc.).
                  </p>
                  <div className="h-52">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie data={derived.methodSegments} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                          {derived.methodSegments.map((entry) => (
                            <Cell fill={entry.color} key={entry.name} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                  <h3 className="text-lg font-bold mb-6">Traffic Insights</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                      <p className="text-sm font-semibold mb-2">Top IPs</p>
                      <div className="space-y-1">
                        {derived.topIps.map(([ip, count]) => (
                          <div className="flex justify-between text-xs font-mono" key={ip}>
                            <span>{ip}</span>
                            <span className="text-primary">{count}</span>
                          </div>
                        ))}
                        {derived.topIps.length === 0 && (
                          <p className="text-xs text-on-surface-variant">No data yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                      <p className="text-sm font-semibold mb-2">Top Paths</p>
                      <div className="space-y-1">
                        {derived.topPaths.map(([path, count]) => (
                          <div className="flex justify-between text-xs font-mono" key={path}>
                            <span className="truncate max-w-[140px]" title={path}>
                              {path}
                            </span>
                            <span className="text-primary">{count}</span>
                          </div>
                        ))}
                        {derived.topPaths.length === 0 && (
                          <p className="text-xs text-on-surface-variant">No data yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Bot Traffic Analysis</h3>
                    <span className="text-xs text-on-surface-variant">{botRatio.toFixed(1)}% flagged</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="h-52">
                      <ResponsiveContainer height="100%" width="100%">
                        <PieChart>
                          <Pie data={botPieData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={4} stroke="none">
                            {botPieData.map((entry) => (
                              <Cell fill={entry.color} key={entry.name} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-xs text-outline uppercase tracking-widest mb-2">Bot hits</p>
                        <p className="text-3xl font-bold text-error">{derived.botCount}</p>
                        <p className="text-xs text-on-surface-variant">Across {derived.botIpCount} IPs</p>
                      </div>
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-sm font-semibold mb-2">Top Bot Agents</p>
                        <div className="space-y-1">
                          {derived.botTopAgents.map(([agent, count]) => (
                            <div className="flex justify-between text-[11px] font-mono" key={agent}>
                              <span className="truncate max-w-[160px]" title={agent}>
                                {agent}
                              </span>
                              <span className="text-error">{count}</span>
                            </div>
                          ))}
                          {derived.botTopAgents.length === 0 && (
                            <p className="text-xs text-on-surface-variant">No bot agents detected.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">User Behavior Analysis</h3>
                    <span className="text-xs text-on-surface-variant">Peak hour: {derived.peakTime}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-xs text-outline uppercase tracking-widest mb-2">Avg req/IP</p>
                        <p className="text-2xl font-bold text-on-surface">{avgRequestsPerIp.toFixed(1)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-xs text-outline uppercase tracking-widest mb-2">Avg paths/IP</p>
                        <p className="text-2xl font-bold text-on-surface">{derived.avgPathsPerIp.toFixed(1)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-xs text-outline uppercase tracking-widest mb-2">Unique paths</p>
                        <p className="text-2xl font-bold text-on-surface">{derived.uniquePathsCount}</p>
                      </div>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer height="100%" width="100%">
                        <BarChart data={topPathsChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#353535" horizontal={false} />
                          <XAxis type="number" stroke="#8b919f" fontSize={10} />
                          <YAxis type="category" dataKey="name" stroke="#8b919f" fontSize={10} width={120} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="value" fill="#57cd81" radius={[4, 4, 4, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">Streamed Log Lines</h3>
                    <p className="text-xs text-on-surface-variant">
                      Showing {visibleEntries.length} of {filteredEntries.length} entries
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {filteredEntries.length > DEFAULT_VISIBLE_ROWS && (
                      <button
                        className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface transition-colors hover:bg-surface-container-high/70"
                        onClick={() => setShowAll((value) => !value)}
                        type="button"
                      >
                        {showAll ? "Show less" : "Show more"}
                      </button>
                    )}
                    {loading && <span className="text-primary animate-pulse text-xs font-mono">LOADING...</span>}
                  </div>
                </div>
                <div className="overflow-x-auto p-6">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase text-outline tracking-wider border-b border-outline-variant/10">
                        <th className="pb-3">Time</th>
                        <th className="pb-3">IP</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Path</th>
                        <th className="pb-3 text-right">Status</th>
                        <th className="pb-3 text-right">Size</th>
                        <th className="pb-3">User Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {visibleEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-white/[0.02]">
                          <td className="py-4 text-xs font-mono text-on-surface-variant">
                            {formatTimestamp(entry.loggedAt)}
                          </td>
                          <td className="py-4 font-mono text-sm text-on-surface">{entry.ip}</td>
                          <td className="py-4 text-xs text-on-surface-variant">{entry.method}</td>
                          <td className="py-4 text-sm text-on-surface-variant max-w-xs truncate" title={entry.path}>
                            {entry.path}
                          </td>
                          <td className="py-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusTone(entry.status)}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="py-4 text-right text-xs text-on-surface-variant">
                            {formatBytes(entry.size)}
                          </td>
                          <td className="py-4 text-xs text-on-surface-variant max-w-xs truncate" title={entry.userAgent}>
                            {entry.userAgent}
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredEntries.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-sm text-on-surface-variant">
                            No stream data matches this filter yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
