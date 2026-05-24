"""
parse_log.py - Parse Nginx access log → dataset.csv
Features: requests_per_minute, session_duration, unique_pages,
          avg_click_interval, is_headless, user_agent_length, visit_count
Label:    0 = Real User, 1 = Bot
"""

import re
import csv
import math
from datetime import datetime
from collections import defaultdict

LOG_FILE = "accesslog_16_05_14_05_2026.txt"
OUTPUT_CSV = "dataset.csv"

# Known bot UA patterns (label=1)
BOT_PATTERNS = [
    r"bingbot", r"googlebot", r"OAI-SearchBot", r"Go-http-client",
    r"bot", r"crawl", r"spider", r"slurp", r"DuckDuckBot",
    r"Baiduspider", r"YandexBot", r"facebookexternalhit",
]

# Known scanner paths (strong bot signal)
SCANNER_PATHS = [
    "/magento_version", "/RELEASE_NOTES.txt", "/robots.txt",
    "/.env", "/wp-admin", "/phpmyadmin",
]

LOG_PATTERN = re.compile(
    r'(\S+) - - \[(.+?)\] "(\S+) (\S+) \S+" (\d+) \d+ ".*?" "(.+?)" ".*?" response-time=[\d.]+'
)

DATE_FORMAT = "%d/%b/%Y:%H:%M:%S %z"


def is_bot_ua(ua: str) -> bool:
    ua_lower = ua.lower()
    return any(re.search(p, ua_lower) for p in BOT_PATTERNS)


def parse_log(filepath: str):
    sessions = defaultdict(list)  # ip -> list of (timestamp, path, ua)

    with open(filepath, encoding="utf-8", errors="ignore") as f:
        for line in f:
            m = LOG_PATTERN.match(line.strip())
            if not m:
                continue
            ip, ts_str, method, path, status, ua = m.groups()
            try:
                ts = datetime.strptime(ts_str, DATE_FORMAT)
            except ValueError:
                continue
            sessions[ip].append((ts, path, ua))

    return sessions


def engineer_features(sessions: dict) -> list:
    rows = []
    for ip, requests in sessions.items():
        if len(requests) < 1:
            continue

        requests.sort(key=lambda x: x[0])
        timestamps = [r[0] for r in requests]
        paths = [r[1] for r in requests]
        ua = requests[0][2]  # first UA

        visit_count = len(requests)
        unique_pages = len(set(paths))

        # session_duration in seconds
        if len(timestamps) > 1:
            session_duration = (timestamps[-1] - timestamps[0]).total_seconds()
        else:
            session_duration = 0.0

        # requests_per_minute
        if session_duration > 0:
            requests_per_minute = visit_count / (session_duration / 60)
        else:
            requests_per_minute = float(visit_count) * 60  # single burst

        # avg_click_interval in seconds
        if len(timestamps) > 1:
            intervals = [
                (timestamps[i+1] - timestamps[i]).total_seconds()
                for i in range(len(timestamps) - 1)
            ]
            avg_click_interval = sum(intervals) / len(intervals)
        else:
            avg_click_interval = 0.0

        # is_headless: 1 if UA is bot/headless
        is_headless = 1 if is_bot_ua(ua) else 0

        user_agent_length = len(ua)

        # Determine label
        # Primary: UA pattern
        if is_bot_ua(ua):
            label = 1
        # Secondary: scanner behavior (hits known scanner paths)
        elif any(p in paths for p in SCANNER_PATHS) and visit_count <= 8:
            # small visit count + scanner paths = scanner bot
            label = 1
        # Very high RPM with no referrer diversity = bot
        elif requests_per_minute > 300 and unique_pages <= 2:
            label = 1
        else:
            label = 0

        rows.append({
            "ip": ip,
            "requests_per_minute": round(requests_per_minute, 4),
            "session_duration": round(session_duration, 2),
            "unique_pages": unique_pages,
            "avg_click_interval": round(avg_click_interval, 4),
            "is_headless": is_headless,
            "user_agent_length": user_agent_length,
            "visit_count": visit_count,
            "label": label,
        })

    return rows


def save_csv(rows: list, output: str):
    fieldnames = [
        "ip", "requests_per_minute", "session_duration", "unique_pages",
        "avg_click_interval", "is_headless", "user_agent_length",
        "visit_count", "label"
    ]
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"[OK] Saved {len(rows)} rows to {output}")


def print_summary(rows: list):
    bots = sum(1 for r in rows if r["label"] == 1)
    users = sum(1 for r in rows if r["label"] == 0)
    print(f"\n=== Dataset Summary ===")
    print(f"Total sessions : {len(rows)}")
    print(f"Real users (0) : {users}")
    print(f"Bots       (1) : {bots}")
    print("=" * 25)


if __name__ == "__main__":
    sessions = parse_log(LOG_FILE)
    rows = engineer_features(sessions)
    print_summary(rows)
    save_csv(rows, OUTPUT_CSV)
