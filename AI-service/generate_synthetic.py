"""
generate_synthetic.py - Tạo synthetic data để bổ sung dataset
Tạo thêm realistic bot & real user sessions để đủ data train ML
"""

import csv
import random
import math

random.seed(42)

OUTPUT_CSV = "synthetic_data.csv"

# -------------------------------------------------------
# Real User profiles
# - Browse normally: 5-30 pages, 2-15 min sessions
# - Click interval: 10-120 seconds
# - UA: normal browser
# - RPM: 2-20
# -------------------------------------------------------
REAL_UA_LENGTHS = [
    120, 135, 142, 98, 155, 112, 108, 130, 145, 118,
    122, 137, 150, 103, 128, 116, 140, 95,  133, 109,
]

# -------------------------------------------------------
# Bot profiles
# -------------------------------------------------------
# 1. Web Crawler (bingbot, googlebot)
#    - Many unique pages, moderate RPM, long UA
CRAWLER_UA_LENGTHS = [85, 92, 78, 88, 95, 82, 90, 75, 86, 93]

# 2. Vulnerability Scanner
#    - Few unique pages (hits known paths), very fast, short sessions
SCANNER_UA_LENGTHS = [72, 88, 95, 105, 110, 76, 80, 92, 85, 98]

# 3. Traffic Bot (fake views)
#    - Many requests, short intervals, same UA pattern
TRAFFIC_BOT_UA_LENGTHS = [45, 52, 38, 60, 42, 55, 48, 35, 65, 58]

# 4. Headless/automated tool
HEADLESS_UA_LENGTHS = [20, 25, 18, 30, 15, 22, 28, 12, 35, 24]


def generate_real_user():
    visit_count = random.randint(5, 35)
    session_duration = random.uniform(30, 900)  # 30s to 15 min
    if session_duration > 0 and visit_count > 1:
        avg_click_interval = session_duration / (visit_count - 1)
    else:
        avg_click_interval = random.uniform(10, 120)
    requests_per_minute = (visit_count / session_duration) * 60 if session_duration > 0 else 1
    unique_pages = random.randint(max(1, visit_count - 10), visit_count)
    unique_pages = min(unique_pages, visit_count)
    is_headless = 0
    user_agent_length = random.choice(REAL_UA_LENGTHS) + random.randint(-5, 5)
    return {
        "requests_per_minute": round(requests_per_minute, 4),
        "session_duration": round(session_duration, 2),
        "unique_pages": unique_pages,
        "avg_click_interval": round(avg_click_interval, 4),
        "is_headless": is_headless,
        "user_agent_length": max(80, user_agent_length),
        "visit_count": visit_count,
        "label": 0,
    }


def generate_crawler():
    """Search engine bot - systematic crawling"""
    visit_count = random.randint(1, 6)
    session_duration = random.uniform(5, 60)
    avg_click_interval = session_duration / max(1, visit_count - 1) if visit_count > 1 else 0
    requests_per_minute = (visit_count / session_duration) * 60 if session_duration > 0 else 60
    unique_pages = visit_count  # crawlers visit unique pages
    is_headless = 1
    user_agent_length = random.choice(CRAWLER_UA_LENGTHS)
    return {
        "requests_per_minute": round(requests_per_minute, 4),
        "session_duration": round(session_duration, 2),
        "unique_pages": unique_pages,
        "avg_click_interval": round(avg_click_interval, 4),
        "is_headless": is_headless,
        "user_agent_length": user_agent_length,
        "visit_count": visit_count,
        "label": 1,
    }


def generate_scanner():
    """Vulnerability scanner - hits specific paths quickly"""
    visit_count = random.randint(3, 10)
    session_duration = random.uniform(0.5, 5)  # very short
    avg_click_interval = session_duration / max(1, visit_count - 1) if visit_count > 1 else 0
    requests_per_minute = (visit_count / session_duration) * 60 if session_duration > 0 else 600
    unique_pages = random.randint(3, visit_count)
    is_headless = 0  # some scanners spoof UA
    user_agent_length = random.choice(SCANNER_UA_LENGTHS)
    return {
        "requests_per_minute": round(requests_per_minute, 4),
        "session_duration": round(session_duration, 2),
        "unique_pages": unique_pages,
        "avg_click_interval": round(avg_click_interval, 4),
        "is_headless": is_headless,
        "user_agent_length": user_agent_length,
        "visit_count": visit_count,
        "label": 1,
    }


def generate_traffic_bot():
    """Traffic inflation bot - many requests, repetitive"""
    visit_count = random.randint(20, 100)
    session_duration = random.uniform(10, 60)
    avg_click_interval = session_duration / max(1, visit_count - 1) if visit_count > 1 else 0
    requests_per_minute = (visit_count / session_duration) * 60 if session_duration > 0 else 300
    unique_pages = random.randint(1, 5)  # few unique pages
    is_headless = 1
    user_agent_length = random.choice(TRAFFIC_BOT_UA_LENGTHS)
    return {
        "requests_per_minute": round(requests_per_minute, 4),
        "session_duration": round(session_duration, 2),
        "unique_pages": unique_pages,
        "avg_click_interval": round(avg_click_interval, 4),
        "is_headless": is_headless,
        "user_agent_length": user_agent_length,
        "visit_count": visit_count,
        "label": 1,
    }


def generate_headless_bot():
    """Headless browser bot"""
    visit_count = random.randint(5, 25)
    session_duration = random.uniform(5, 30)
    avg_click_interval = session_duration / max(1, visit_count - 1) if visit_count > 1 else 0
    requests_per_minute = (visit_count / session_duration) * 60 if session_duration > 0 else 200
    unique_pages = random.randint(2, min(8, visit_count))
    is_headless = 1
    user_agent_length = random.choice(HEADLESS_UA_LENGTHS)
    return {
        "requests_per_minute": round(requests_per_minute, 4),
        "session_duration": round(session_duration, 2),
        "unique_pages": unique_pages,
        "avg_click_interval": round(avg_click_interval, 4),
        "is_headless": is_headless,
        "user_agent_length": user_agent_length,
        "visit_count": visit_count,
        "label": 1,
    }


def generate_dataset(n_real=6850, n_crawler=800, n_scanner=800, n_traffic=800, n_headless=750):
    rows = []
    for _ in range(n_real):
        rows.append(generate_real_user())
    for _ in range(n_crawler):
        rows.append(generate_crawler())
    for _ in range(n_scanner):
        rows.append(generate_scanner())
    for _ in range(n_traffic):
        rows.append(generate_traffic_bot())
    for _ in range(n_headless):
        rows.append(generate_headless_bot())

    random.shuffle(rows)
    return rows


def save_csv(rows, output):
    fieldnames = [
        "requests_per_minute", "session_duration", "unique_pages",
        "avg_click_interval", "is_headless", "user_agent_length",
        "visit_count", "label"
    ]
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    bots = sum(1 for r in rows if r["label"] == 1)
    users = sum(1 for r in rows if r["label"] == 0)
    print(f"[OK] Synthetic data saved to {output}")
    print(f"    Total: {len(rows)} | Real users: {users} | Bots: {bots}")


if __name__ == "__main__":
    rows = generate_dataset()
    save_csv(rows, OUTPUT_CSV)
