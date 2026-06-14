"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BellOutlined,
  CloseOutlined,
  CodeOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LineChartOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
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
import DashboardSidebar from "@/components/DashboardSidebar";
import NavbarAuthArea from "@/components/NavbarAuthArea";
import { useLanguage } from "@/context/LanguageContext";


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
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [caseType, setCaseType] = useState<"current" | "relative" | "custom">("current");
  const [timeType, setTimeType] = useState<"day" | "week" | "month">("day");
  const [customVal, setCustomVal] = useState<string>("");
  const calculateRange = (cType = caseType, tType = timeType, cVal = customVal) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (cType === "current") {
      if (tType === "day") {
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
      } else if (tType === "week") {
        start = new Date();
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(start.setDate(diff));
        start.setHours(0, 0, 0, 0);
        
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (tType === "month") {
        start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }
    } else if (cType === "relative") {
      if (tType === "day") {
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        end = now;
      } else if (tType === "week") {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
      } else if (tType === "month") {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
      }
    } else if (cType === "custom") {
      if (!cVal) return { start: null, end: null };

      if (tType === "day") {
        start = new Date(cVal);
        start.setHours(0, 0, 0, 0);
        end = new Date(cVal);
        end.setHours(23, 59, 59, 999);
      } else if (tType === "week") {
        const match = cVal.match(/^(\d{4})-W(\d{2})$/);
        if (match) {
          const year = Number(match[1]);
          const week = Number(match[2]);
          const janFirst = new Date(year, 0, 1);
          const dayOffset = (week - 1) * 7;
          const days = janFirst.getDay();
          const firstMonday = new Date(year, 0, 1 + (days <= 4 ? 1 - days : 8 - days));
          start = new Date(firstMonday.getTime() + dayOffset * 24 * 60 * 60 * 1000);
          start.setHours(0, 0, 0, 0);
          
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
        }
      } else if (tType === "month") {
        const [year, month] = cVal.split("-").map(Number);
        start = new Date(year, month - 1, 1);
        start.setHours(0, 0, 0, 0);
        
        end = new Date(year, month, 0);
        end.setHours(23, 59, 59, 999);
      }
    }

    return { start, end };
  };

  const fetchStreamData = async (
    showSpinner: boolean,
    cType = caseType,
    tType = timeType,
    cVal = customVal
  ) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      if (showSpinner) {
        await fetch("http://localhost:3001/streams/sync", { method: "POST" });
      }

      const { start, end } = calculateRange(cType, tType, cVal);
      let url = "http://localhost:3001/streams/entries";
      if (start && end) {
        url += `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      const [entriesResponse, statusResponse] = await Promise.all([
        fetch(url),
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
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    if (timeType === "day") {
      setCustomVal(`${yyyy}-${mm}-${dd}`);
    } else if (timeType === "month") {
      setCustomVal(`${yyyy}-${mm}`);
    } else {
      const target = new Date(now.valueOf());
      const dayNr = (now.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      const ww = String(weekNum).padStart(2, "0");
      setCustomVal(`${yyyy}-W${ww}`);
    }
  }, [timeType]);

  useEffect(() => {
    if (caseType === "custom" && !customVal) return;

    fetchStreamData(true, caseType, timeType, customVal);
    const intervalId = setInterval(() => fetchStreamData(false, caseType, timeType, customVal), 10000);
    return () => clearInterval(intervalId);
  }, [caseType, timeType, customVal]);

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
    const timeline: Record<string, { time: string; timestamp: number; ok: number; warning: number; error: number; bandwidth: number }> = {};

    const { start, end } = calculateRange(caseType, timeType, customVal);

    if (timeType === "day") {
      const baseDate = start || new Date();
      for (let h = 0; h < 24; h++) {
        const temp = new Date(baseDate);
        temp.setHours(h, 0, 0, 0);
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h % 12 || 12;
        const timeKey = `${displayHour.toString().padStart(2, "0")}:00 ${ampm}`;
        timeline[timeKey] = { time: timeKey, timestamp: temp.getTime(), ok: 0, warning: 0, error: 0, bandwidth: 0 };
      }
    } else if (timeType === "week") {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      if (start && end) {
        const temp = new Date(start);
        while (temp <= end) {
          const dayName = daysOfWeek[temp.getDay()];
          timeline[dayName] = { time: dayName, timestamp: temp.getTime(), ok: 0, warning: 0, error: 0, bandwidth: 0 };
          temp.setDate(temp.getDate() + 1);
        }
      } else {
        const daysOfWeekWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        daysOfWeekWeek.forEach((day, index) => {
          timeline[day] = { time: day, timestamp: index, ok: 0, warning: 0, error: 0, bandwidth: 0 };
        });
      }
    } else if (timeType === "month") {
      if (start && end) {
        const temp = new Date(start);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        while (temp <= end) {
          const timeKey = `${months[temp.getMonth()]} ${temp.getDate().toString().padStart(2, "0")}`;
          timeline[timeKey] = { time: timeKey, timestamp: temp.getTime(), ok: 0, warning: 0, error: 0, bandwidth: 0 };
          temp.setDate(temp.getDate() + 1);
        }
      }
    }

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
        let timeKey = "";
        if (timeType === "day") {
          const hour = date.getHours();
          const ampm = hour >= 12 ? "PM" : "AM";
          const displayHour = hour % 12 || 12;
          timeKey = `${displayHour.toString().padStart(2, "0")}:00 ${ampm}`;
        } else if (timeType === "week") {
          const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          timeKey = daysOfWeek[date.getDay()];
        } else if (timeType === "month") {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          timeKey = `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, "0")}`;
        }

        if (!timeline[timeKey]) {
          timeline[timeKey] = { time: timeKey, timestamp: date.getTime(), ok: 0, warning: 0, error: 0, bandwidth: 0 };
        }

        if (entry.status >= 200 && entry.status < 300) timeline[timeKey].ok += 1;
        else if (entry.status >= 400 && entry.status < 500) timeline[timeKey].warning += 1;
        else if (entry.status >= 500) timeline[timeKey].error += 1;

        timeline[timeKey].bandwidth += (entry.size || 0) / (1024 * 1024);
      }
    });

    const timelineData = Object.values(timeline)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => ({
        time: item.time,
        ok: item.ok,
        warning: item.warning,
        error: item.error,
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
  }, [entries, caseType, timeType, customVal]);

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

  const highRiskIps = useMemo(() => {
    const ipData: Record<
      string,
      {
        ip: string;
        totalRequests: number;
        paths: Set<string>;
        pathCounts: Record<string, number>;
        bandwidth: number;
        errorRequests: number;
        latestAccess: string;
        userAgents: Set<string>;
        isBotUA: boolean;
      }
    > = {};

    entries.forEach((entry) => {
      const ip = entry.ip;
      if (!ipData[ip]) {
        ipData[ip] = {
          ip,
          totalRequests: 0,
          paths: new Set(),
          pathCounts: {},
          bandwidth: 0,
          errorRequests: 0,
          latestAccess: entry.loggedAt,
          userAgents: new Set(),
          isBotUA: false,
        };
      }

      const data = ipData[ip];
      data.totalRequests += 1;
      data.paths.add(entry.path);
      data.pathCounts[entry.path] = (data.pathCounts[entry.path] ?? 0) + 1;
      data.bandwidth += entry.size || 0;
      if (entry.status >= 400) {
        data.errorRequests += 1;
      }

      if (new Date(entry.loggedAt) > new Date(data.latestAccess)) {
        data.latestAccess = entry.loggedAt;
      }

      if (entry.userAgent) {
        data.userAgents.add(entry.userAgent);
        if (BOT_UA_REGEX.test(entry.userAgent)) {
          data.isBotUA = true;
        }
      }
    });

    return Object.values(ipData)
      .map((data) => {
        let score = 0;
        const reasons: string[] = [];

        if (data.isBotUA) {
          score += 40;
          reasons.push(language === "vi" ? "UA khớp mẫu Bot" : "UA matches Bot pattern");
        }

        if (data.totalRequests > 30) {
          score += 30;
          reasons.push(language === "vi" ? `Tần suất cực cao (${data.totalRequests} hits)` : `Extreme frequency (${data.totalRequests} hits)`);
        } else if (data.totalRequests > 10) {
          score += 15;
          reasons.push(language === "vi" ? `Tần suất trung bình (${data.totalRequests} hits)` : `Medium frequency (${data.totalRequests} hits)`);
        }

        const errorRate = data.totalRequests > 0 ? data.errorRequests / data.totalRequests : 0;
        if (errorRate > 0.5 && data.totalRequests > 3) {
          score += 25;
          reasons.push(language === "vi" ? `Lỗi cao (${(errorRate * 100).toFixed(0)}% lỗi 4xx/5xx)` : `High error rate (${(errorRate * 100).toFixed(0)}% 4xx/5xx)`);
        } else if (errorRate > 0.2 && data.totalRequests > 3) {
          score += 10;
          reasons.push(language === "vi" ? `Lỗi nhẹ (${(errorRate * 100).toFixed(0)}%)` : `Mild errors (${(errorRate * 100).toFixed(0)}%)`);
        }

        const uniquePaths = data.paths.size;
        if (uniquePaths > 10) {
          score += 20;
          reasons.push(language === "vi" ? `Quét nhiều path (${uniquePaths} unique paths)` : `Scanning multiple paths (${uniquePaths} unique paths)`);
        } else if (uniquePaths > 4) {
          score += 10;
          reasons.push(language === "vi" ? `Quét nhiều path (${uniquePaths} paths)` : `Scanning multiple paths (${uniquePaths} paths)`);
        }

        if (data.userAgents.size === 0 || Array.from(data.userAgents).some((ua) => !ua.trim())) {
          score += 15;
          reasons.push(language === "vi" ? "Không có User Agent" : "No User Agent");
        }

        score = Math.min(score, 100);

        let topPath = "-";
        let maxPathCount = 0;
        Object.entries(data.pathCounts).forEach(([path, count]) => {
          if (count > maxPathCount) {
            maxPathCount = count;
            topPath = path;
          }
        });

        return {
          ip: data.ip,
          totalRequests: data.totalRequests,
          distinctPaths: uniquePaths,
          bandwidth: data.bandwidth,
          latestAccess: data.latestAccess,
          topPath,
          riskScore: score,
          reasons: reasons.length > 0 ? reasons : ["Bình thường"],
        };
      })
      .filter((item) => item.riskScore >= 25)
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [entries]);

  const getIpDetails = (ip: string) => {
    const ipEntries = entries.filter((e) => e.ip === ip);
    const totalRequests = ipEntries.length;
    const statusCounts: Record<string, number> = {};
    let bandwidth = 0;
    const paths = new Set<string>();
    const userAgents = new Set<string>();
    let oldestAccess = ipEntries[0]?.loggedAt || "";
    let newestAccess = ipEntries[0]?.loggedAt || "";

    ipEntries.forEach((e) => {
      statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
      bandwidth += e.size || 0;
      paths.add(e.path);
      if (e.userAgent) {
        userAgents.add(e.userAgent);
      }

      const loggedTime = new Date(e.loggedAt).getTime();
      if (new Date(oldestAccess).getTime() > loggedTime) {
        oldestAccess = e.loggedAt;
      }
      if (new Date(newestAccess).getTime() < loggedTime) {
        newestAccess = e.loggedAt;
      }
    });

    let score = 0;
    const reasons: string[] = [];
    const isBotUA = Array.from(userAgents).some((ua) => BOT_UA_REGEX.test(ua));

    if (isBotUA) {
      score += 40;
      reasons.push(language === "vi" ? "User Agent khớp mẫu Bot" : "User Agent matches Bot pattern");
    }

    if (totalRequests > 30) {
      score += 30;
      reasons.push(language === "vi" ? `Tần suất cực cao (${totalRequests} hits)` : `Extreme frequency (${totalRequests} hits)`);
    } else if (totalRequests > 10) {
      score += 15;
      reasons.push(language === "vi" ? `Tần suất trung bình (${totalRequests} hits)` : `Medium frequency (${totalRequests} hits)`);
    }

    const errorCount = Object.entries(statusCounts)
      .filter(([status]) => Number(status) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);

    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    if (errorRate > 0.5 && totalRequests > 3) {
      score += 25;
      reasons.push(language === "vi" ? `Tỷ lệ lỗi cao (${(errorRate * 100).toFixed(0)}% 4xx/5xx)` : `High error rate (${(errorRate * 100).toFixed(0)}% 4xx/5xx)`);
    } else if (errorRate > 0.2 && totalRequests > 3) {
      score += 10;
      reasons.push(language === "vi" ? `Tỷ lệ lỗi vừa phải (${(errorRate * 100).toFixed(0)}%)` : `Moderate error rate (${(errorRate * 100).toFixed(0)}%)`);
    }

    const uniquePaths = paths.size;
    if (uniquePaths > 10) {
      score += 20;
      reasons.push(language === "vi" ? `Quét nhiều path (${uniquePaths} unique paths)` : `Scanning multiple paths (${uniquePaths} unique paths)`);
    } else if (uniquePaths > 4) {
      score += 10;
      reasons.push(language === "vi" ? `Quét nhiều path (${uniquePaths} paths)` : `Scanning multiple paths (${uniquePaths} paths)`);
    }

    if (userAgents.size === 0) {
      score += 15;
      reasons.push(language === "vi" ? "Không có User Agent" : "No User Agent");
    }

    score = Math.min(score, 100);

    return {
      ip,
      totalRequests,
      statusCounts,
      bandwidth,
      distinctPaths: uniquePaths,
      userAgents: Array.from(userAgents),
      firstAccess: oldestAccess,
      latestAccess: newestAccess,
      riskScore: score,
      reasons: reasons.length > 0 ? reasons : ["Bình thường"],
      history: ipEntries.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()),
    };
  };

  const WATCHLIST_ITEMS_PER_PAGE = 10;
  const totalWatchlistPages = Math.ceil(highRiskIps.length / WATCHLIST_ITEMS_PER_PAGE);
  const paginatedWatchlist = useMemo(() => {
    const start = (watchlistPage - 1) * WATCHLIST_ITEMS_PER_PAGE;
    return highRiskIps.slice(start, start + WATCHLIST_ITEMS_PER_PAGE);
  }, [highRiskIps, watchlistPage]);

  useEffect(() => {
    if (watchlistPage > 1 && watchlistPage > totalWatchlistPages) {
      setWatchlistPage(Math.max(1, totalWatchlistPages));
    }
  }, [totalWatchlistPages, watchlistPage]);

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
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/30 selection:text-primary flex">
      <div className="flex flex-1 flex-col overflow-x-hidden">
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
              <a className="border-b-2 border-primary pb-1 text-primary transition-colors hover:bg-surface-container-high/40" href="/streams">
                {t("navbar.streams")}
              </a>
              <a className="text-on-surface-variant/70 transition-colors hover:bg-surface-container-high/40 hover:text-on-surface" href="/incidents">
                {t("navbar.incidents")}
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
            <NavbarAuthArea />
          </div>
        </nav>

        <main className="px-6 pb-20 pt-10">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.22em] text-primary">{t("streams.liveWorkspace")}</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">{t("streams.title")}</h1>
                <p className="mt-2 max-w-3xl text-on-surface-variant">
                  {t("streams.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value as "current" | "relative" | "custom")}
                  className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-2 text-xs font-semibold uppercase tracking-wide text-on-surface transition-colors hover:bg-surface-container-high/70 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="current" className="bg-surface font-sans">{t("streams.caseCurrent")}</option>
                  <option value="relative" className="bg-surface font-sans">{t("streams.caseRelative")}</option>
                  <option value="custom" className="bg-surface font-sans">{t("streams.caseCustom")}</option>
                </select>

                <select
                  value={timeType}
                  onChange={(e) => setTimeType(e.target.value as "day" | "week" | "month")}
                  className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-2 text-xs font-semibold uppercase tracking-wide text-on-surface transition-colors hover:bg-surface-container-high/70 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="day" className="bg-surface font-sans">{t("streams.timeDay")}</option>
                  <option value="week" className="bg-surface font-sans">{t("streams.timeWeek")}</option>
                  <option value="month" className="bg-surface font-sans">{t("streams.timeMonth")}</option>
                </select>

                {caseType === "custom" && timeType === "day" && (
                  <input
                    type="date"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 font-sans"
                  />
                )}

                {caseType === "custom" && timeType === "week" && (
                  <input
                    type="week"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 font-sans"
                  />
                )}

                {caseType === "custom" && timeType === "month" && (
                  <input
                    type="month"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 font-sans"
                  />
                )}

                <button
                  className="rounded-lg border border-outline/30 bg-surface-container-high px-4 py-2 text-xs font-semibold uppercase tracking-wide text-on-surface transition-colors hover:bg-surface-container-high/70 cursor-pointer"
                  onClick={() => fetchStreamData(true)}
                  type="button"
                >
                  {t("streams.refresh")}
                </button>
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-2 text-xs text-outline">
                  {t("streams.updated")}: {formatTimestamp(status?.updatedAt)}
                </div>
              </div>
            </div>

            {!loading && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 space-y-4 rounded-xl border border-outline-variant/10 bg-surface-container-low">
                <div className="p-6 rounded-full bg-surface-container-high border border-outline/20">
                  <CodeOutlined className="text-4xl text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{error ? (language === "vi" ? "Lỗi luồng dữ liệu" : "Stream Error") : t("streams.noData")}</h2>
                <p className="text-on-surface-variant text-center max-w-xl">
                  {error
                    ? error
                    : t("streams.waitingLogs")}
                </p>
              </div>
            )}

            {entries.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                    <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                      <LineChartOutlined className="text-primary" /> {t("streams.kpis.totalReqs")}
                    </p>
                    <p className="text-4xl font-bold tracking-tight">{totalCount}</p>
                    <p className={`mt-2 flex items-center gap-2 text-sm ${successRate > 90 ? "text-green-400" : "text-error"}`}>
                      {successRate > 90 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {successRate.toFixed(1)}% {t("streams.kpis.success")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                    <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                      <UserOutlined className="text-primary" /> {t("streams.kpis.uniqueIps")}
                    </p>
                    <p className="text-4xl font-bold tracking-tight">{uniqueIps}</p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                    <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                      <DatabaseOutlined className="text-primary" /> {t("streams.kpis.bandwidth")}
                    </p>
                    <p className="text-4xl font-bold tracking-tight">{totalBandwidth.toFixed(2)} MB</p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
                    <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant">
                      <GlobalOutlined className="text-primary" /> {t("streams.kpis.avgResponse")}
                    </p>
                    <p className="text-4xl font-bold tracking-tight">{avgResponseSize.toFixed(2)} KB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                    <h3 className="text-xl font-bold mb-4">{t("streams.charts.reqsTime")}</h3>
                    <div className="h-64">
                      <ResponsiveContainer height="100%" width="100%">
                        <LineChart data={derived.timelineData}>
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
                    <h3 className="text-xl font-bold mb-4">{t("streams.charts.bandwidthUsage")}</h3>
                    <div className="h-64">
                      <ResponsiveContainer height="100%" width="100%">
                        <LineChart data={derived.timelineData.map((item) => ({ time: item.time, value: item.bandwidth }))}>
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
                    <h3 className="text-lg font-bold">{language === "vi" ? "Mã trạng thái HTTP" : "HTTP Status Codes"}</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {language === "vi" ? "2xx = thành công, 4xx = lỗi client, 5xx = lỗi server." : "2xx = success, 4xx = client issues, 5xx = server errors."}
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
                    <h3 className="text-lg font-bold">{language === "vi" ? "Phương thức HTTP" : "HTTP Methods"}</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {language === "vi" ? "Tỷ lệ requests theo phương thức (GET, POST, PUT, v.v.)." : "Share of requests by method (GET, POST, PUT, etc.)."}
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
                    <h3 className="text-lg font-bold mb-6">{language === "vi" ? "Nhận định lưu lượng" : "Traffic Insights"}</h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-sm font-semibold mb-2">{language === "vi" ? "IP hàng đầu" : "Top IPs"}</p>
                        <div className="space-y-1">
                          {derived.topIps.map(([ip, count]) => (
                            <div className="flex justify-between text-xs font-mono" key={ip}>
                              <span>{ip}</span>
                              <span className="text-primary">{count}</span>
                            </div>
                          ))}
                          {derived.topIps.length === 0 && (
                            <p className="text-xs text-on-surface-variant">{language === "vi" ? "Chưa có dữ liệu." : "No data yet."}</p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                        <p className="text-sm font-semibold mb-2">{language === "vi" ? "Đường dẫn hàng đầu" : "Top Paths"}</p>
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
                            <p className="text-xs text-on-surface-variant">{language === "vi" ? "Chưa có dữ liệu." : "No data yet."}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">{language === "vi" ? "Phân tích lưu lượng Bot" : "Bot Traffic Analysis"}</h3>
                      <span className="text-xs text-on-surface-variant">{botRatio.toFixed(1)}% {language === "vi" ? "bị gắn cờ" : "flagged"}</span>
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
                          <p className="text-xs text-outline uppercase tracking-widest mb-2">{language === "vi" ? "Hits từ Bot" : "Bot hits"}</p>
                          <p className="text-3xl font-bold text-error">{derived.botCount}</p>
                          <p className="text-xs text-on-surface-variant">{language === "vi" ? `Trên ${derived.botIpCount} IP` : `Across ${derived.botIpCount} IPs`}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                          <p className="text-sm font-semibold mb-2">{language === "vi" ? "Bot User Agent hàng đầu" : "Top Bot Agents"}</p>
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
                              <p className="text-xs text-on-surface-variant">{language === "vi" ? "Không phát hiện bot agent nào." : "No bot agents detected."}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">{t("streams.behavior.title")}</h3>
                      <span className="text-xs text-on-surface-variant">{t("streams.behavior.peakHour")}: {derived.peakTime}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                          <p className="text-xs text-outline uppercase tracking-widest mb-2">{t("streams.behavior.avgReqIp")}</p>
                          <p className="text-2xl font-bold text-on-surface">{avgRequestsPerIp.toFixed(1)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                          <p className="text-xs text-outline uppercase tracking-widest mb-2">{t("streams.behavior.avgPathIp")}</p>
                          <p className="text-2xl font-bold text-on-surface">{derived.avgPathsPerIp.toFixed(1)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-surface-container-high/50 border border-outline/20">
                          <p className="text-xs text-outline uppercase tracking-widest mb-2">{t("streams.behavior.uniquePaths")}</p>
                          <p className="text-2xl font-bold text-on-surface">{derived.uniquePathsCount}</p>
                        </div>
                      </div>
                      <div className="h-52">
                        <ResponsiveContainer height="100%" width="100%">
                          <BarChart data={topPathsChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,145,159,0.15)" horizontal={false} />
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
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <WarningOutlined className="text-error" /> {t("streams.behavior.watchlistTitle")}
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        {t("streams.behavior.watchlistDesc")}
                      </p>
                    </div>
                    <span className="rounded-lg bg-surface-container-high px-3 py-1 font-mono text-xs text-on-surface">
                      {highRiskIps.length} {t("streams.behavior.watchlistCount")}
                    </span>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs uppercase text-outline tracking-wider border-b border-outline-variant/10">
                          <th className="pb-3">{t("streams.behavior.tableIp")}</th>
                          <th className="pb-3 text-center">{t("streams.behavior.tableRisk")}</th>
                          <th className="pb-3 text-right">{t("streams.behavior.tableHits")}</th>
                          <th className="pb-3 text-right">{t("streams.behavior.tablePaths")}</th>
                          <th className="pb-3">{t("streams.behavior.tableTopPath")}</th>
                          <th className="pb-3">{t("streams.behavior.tableReasons")}</th>
                          <th className="pb-3 text-right">{t("streams.behavior.tableTime")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {paginatedWatchlist.map((item) => {
                          let badgeClass = "bg-blue-500/20 text-blue-400 border border-blue-500/30";
                          let levelText = language === "vi" ? "Trung bình" : "Medium";
                          if (item.riskScore >= 75) {
                            badgeClass = "bg-red-500/20 text-red-400 border border-red-500/30";
                            levelText = language === "vi" ? "Nguy kịch" : "Critical";
                          } else if (item.riskScore >= 50) {
                            badgeClass = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
                            levelText = language === "vi" ? "Cao" : "High";
                          }

                          return (
                            <tr key={item.ip} className="hover:bg-white/[0.02]">
                              <td className="py-4 font-mono text-sm font-semibold text-on-surface">
                                <button
                                  onClick={() => setSelectedIp(item.ip)}
                                  className="hover:underline hover:text-primary transition-colors cursor-pointer text-left font-mono"
                                >
                                  {item.ip}
                                </button>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                  {levelText} ({item.riskScore}%)
                                </span>
                              </td>
                              <td className="py-4 text-right font-mono text-sm text-on-surface">{item.totalRequests}</td>
                              <td className="py-4 text-right font-mono text-sm text-on-surface">{item.distinctPaths}</td>
                              <td className="py-4 text-sm text-on-surface-variant max-w-[180px] truncate" title={item.topPath}>
                                {item.topPath}
                              </td>
                              <td className="py-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {item.reasons.map((reason, index) => (
                                    <span key={index} className="px-2 py-0.5 rounded bg-surface-container-high text-[10px] text-on-surface-variant border border-outline-variant/30">
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-4 text-right text-xs font-mono text-on-surface-variant">
                                {formatTimestamp(item.latestAccess)}
                              </td>
                            </tr>
                          );
                        })}
                        {highRiskIps.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-sm text-on-surface-variant">
                              {t("streams.behavior.tableEmpty")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalWatchlistPages > 1 && (
                    <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
                      <span className="text-xs text-on-surface-variant">
                        {t("streams.behavior.displayRange", {
                          start: (watchlistPage - 1) * WATCHLIST_ITEMS_PER_PAGE + 1,
                          end: Math.min(watchlistPage * WATCHLIST_ITEMS_PER_PAGE, highRiskIps.length),
                          total: highRiskIps.length
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWatchlistPage((prev) => Math.max(1, prev - 1))}
                          disabled={watchlistPage === 1}
                          className="rounded-lg border border-outline/20 bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition hover:bg-surface-container-high/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          type="button"
                        >
                          {t("streams.behavior.prev")}
                        </button>

                        <div className="flex items-center gap-1 font-mono text-xs">
                          {Array.from({ length: totalWatchlistPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            const isActive = pageNum === watchlistPage;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setWatchlistPage(pageNum)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg border transition cursor-pointer font-semibold ${isActive
                                    ? "bg-primary border-primary text-on-primary-container"
                                    : "border-outline/20 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-high/80"
                                  }`}
                                type="button"
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setWatchlistPage((prev) => Math.min(totalWatchlistPages, prev + 1))}
                          disabled={watchlistPage === totalWatchlistPages}
                          className="rounded-lg border border-outline/20 bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition hover:bg-surface-container-high/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          type="button"
                        >
                          {t("streams.behavior.next")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low overflow-hidden">
                  <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">{t("streams.behavior.streamLogs")}</h3>
                      <p className="text-xs text-on-surface-variant">
                        {t("streams.behavior.visibleCount", { visible: visibleEntries.length, total: filteredEntries.length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {filteredEntries.length > DEFAULT_VISIBLE_ROWS && (
                        <button
                          className="rounded-lg border border-outline/30 bg-surface-container-high px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface transition-colors hover:bg-surface-container-high/70"
                          onClick={() => setShowAll((value) => !value)}
                          type="button"
                        >
                          {showAll ? t("streams.behavior.showLess") : t("streams.behavior.showMore")}
                        </button>
                      )}
                      {loading && <span className="text-primary animate-pulse text-xs font-mono">{language === "vi" ? "ĐANG TẢI..." : "LOADING..."}</span>}
                    </div>
                  </div>
                  <div className="overflow-x-auto p-6">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs uppercase text-outline tracking-wider border-b border-outline-variant/10">
                          <th className="pb-3">{language === "vi" ? "Thời gian" : "Time"}</th>
                          <th className="pb-3">IP</th>
                          <th className="pb-3">{language === "vi" ? "Phương thức" : "Method"}</th>
                          <th className="pb-3">{language === "vi" ? "Đường dẫn" : "Path"}</th>
                          <th className="pb-3 text-right">{language === "vi" ? "Trạng thái" : "Status"}</th>
                          <th className="pb-3 text-right">{language === "vi" ? "Dung lượng" : "Size"}</th>
                          <th className="pb-3">User Agent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {visibleEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-white/[0.02]">
                            <td className="py-4 text-xs font-mono text-on-surface-variant">
                              {formatTimestamp(entry.loggedAt)}
                            </td>
                            <td className="py-4 font-mono text-sm text-on-surface">
                              <button
                                onClick={() => setSelectedIp(entry.ip)}
                                className="hover:underline hover:text-primary transition-colors cursor-pointer text-left font-mono"
                              >
                                {entry.ip}
                              </button>
                            </td>
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
                              {language === "vi" ? "Chưa có dữ liệu log luồng khớp bộ lọc này." : "No stream data matches this filter yet."}
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
      <DashboardSidebar />

      {selectedIp && (() => {
        const details = getIpDetails(selectedIp);
        let badgeClass = "bg-green-500/20 text-green-400 border border-green-500/30";
        let levelText = language === "vi" ? "An toàn / Bình thường" : "Safe / Normal";
        if (details.riskScore >= 75) {
          badgeClass = "bg-red-500/20 text-red-400 border border-red-500/30";
          levelText = language === "vi" ? "Nguy kịch" : "Critical";
        } else if (details.riskScore >= 50) {
          badgeClass = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
          levelText = language === "vi" ? "Nguy cơ cao" : "High Risk";
        } else if (details.riskScore >= 25) {
          badgeClass = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
          levelText = language === "vi" ? "Cần theo dõi" : "Needs Monitoring";
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
              onClick={() => setSelectedIp(null)}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xl flex flex-col text-on-surface">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4 bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-mono font-bold tracking-tight text-primary">{details.ip}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                    {levelText} ({details.riskScore}%)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedIp(null)}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                  type="button"
                >
                  <CloseOutlined className="text-lg" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Upper grid: Stats & analysis */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: Analytics */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">{language === "vi" ? "Phân tích hành vi" : "Behavior Analysis"}</h4>
                      <div className="flex flex-wrap gap-2">
                        {details.reasons.map((reason, idx) => (
                          <span key={idx} className="px-3 py-1 rounded bg-surface-container-high text-xs text-on-surface-variant border border-outline-variant/20">
                            {reason}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-outline-variant/10 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-outline">{t("incidents.modal.firstSeen")}</p>
                          <p className="font-mono text-on-surface-variant mt-1">{formatTimestamp(details.firstAccess)}</p>
                        </div>
                        <div>
                          <p className="text-outline">{t("incidents.modal.lastSeen")}</p>
                          <p className="font-mono text-on-surface-variant mt-1">{formatTimestamp(details.latestAccess)}</p>
                        </div>
                      </div>
                    </div>

                    {/* User Agents */}
                    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5 space-y-2">
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">{t("incidents.modal.userAgents", { count: details.userAgents.length })}</h4>
                      <div className="space-y-2 max-h-24 overflow-y-auto no-scrollbar">
                        {details.userAgents.map((ua, idx) => (
                          <p key={idx} className="text-xs font-mono bg-surface-container-high p-2 rounded text-on-surface-variant break-all">
                            {ua}
                          </p>
                        ))}
                        {details.userAgents.length === 0 && (
                          <p className="text-xs italic text-outline">{language === "vi" ? "Không phát hiện User Agent." : "No User Agent detected."}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Key metrics */}
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">{t("incidents.modal.metrics")}</h4>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-surface-container-high p-3 rounded-lg border border-outline-variant/10">
                        <p className="text-[10px] text-outline uppercase">{t("incidents.modal.totalHits")}</p>
                        <p className="text-xl font-bold font-mono mt-1 text-on-surface">{details.totalRequests}</p>
                      </div>
                      <div className="bg-surface-container-high p-3 rounded-lg border border-outline-variant/10">
                        <p className="text-[10px] text-outline uppercase">{t("incidents.modal.distinctPaths")}</p>
                        <p className="text-xl font-bold font-mono mt-1 text-on-surface">{details.distinctPaths}</p>
                      </div>
                      <div className="bg-surface-container-high p-3 rounded-lg border border-outline-variant/10 col-span-2">
                        <p className="text-[10px] text-outline uppercase">{t("incidents.modal.bandwidth")}</p>
                        <p className="text-lg font-bold font-mono mt-1 text-on-surface">{formatBytes(details.bandwidth)}</p>
                      </div>
                    </div>

                    {/* Status code distribution */}
                    <div className="space-y-2">
                      <p className="text-xs text-outline font-semibold">{t("incidents.modal.statusBreakdown")}</p>
                      <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs">
                        {["2xx", "3xx", "4xx", "5xx"].map((group) => {
                          const count = Object.entries(details.statusCounts)
                            .filter(([status]) => status.startsWith(group[0]))
                            .reduce((sum, [, val]) => sum + val, 0);

                          let colorClass = "text-green-400 bg-green-500/10";
                          if (group === "4xx") colorClass = "text-amber-400 bg-amber-500/10";
                          else if (group === "5xx") colorClass = "text-red-400 bg-red-500/10";
                          else if (group === "3xx") colorClass = "text-blue-400 bg-blue-500/10";

                          return (
                            <div key={group} className={`p-1.5 rounded ${colorClass}`}>
                              <p className="text-[10px] opacity-75">{group}</p>
                              <p className="font-bold">{count}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lower section: Access History / Actions Table */}
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low overflow-hidden">
                  <div className="px-5 py-3 border-b border-outline-variant/10 bg-surface-container-low flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">
                      {language === "vi" ? `Lịch sử hoạt động (${details.history.length} hành động)` : `Activity History (${details.history.length} actions)`}
                    </h4>
                  </div>
                  <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-surface-container-high z-10 text-outline border-b border-outline-variant/10 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3">{t("incidents.modal.historyTime")}</th>
                          <th className="p-3">{t("incidents.modal.historyMethod")}</th>
                          <th className="p-3">{t("incidents.modal.historyPath")}</th>
                          <th className="p-3 text-right">{t("incidents.modal.historyStatus")}</th>
                          <th className="p-3 text-right">{t("incidents.modal.historySize")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {details.history.map((row) => (
                          <tr key={row.id} className="hover:bg-white/[0.01]">
                            <td className="p-3 font-mono text-on-surface-variant">{formatTimestamp(row.loggedAt)}</td>
                            <td className="p-3 font-bold text-on-surface">{row.method}</td>
                            <td className="p-3 font-mono text-on-surface-variant max-w-sm truncate" title={row.path}>{row.path}</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusTone(row.status)}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-right text-on-surface-variant">{formatBytes(row.size)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
