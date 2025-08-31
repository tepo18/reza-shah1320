#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, threading, urllib.request, time, platform, subprocess, re
from typing import List

# ---------------- مسیر فایل‌ها ----------------
TEXT_NORMAL = "normal.txt"
TEXT_FINAL = "final.txt"
UPDATE_INTERVAL = 3600  # ثانیه (1 ساعت)

# ---------------- منابع ----------------
LINKS_RAW = [
    f"https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo{n}.txt"
    for n in range(10, 100, 10)
]

FILE_HEADER = "//profile-title: base64:2YfZhduM2LTZhyDZgdi52KfZhCDwn5iO8J+YjvCfmI4gaGFtZWRwNzE="

# ---------------- دریافت محتوا ----------------
def fetch_text(url: str) -> List[str]:
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = resp.read().decode().splitlines()
        return [line.strip() for line in data if line.strip()]
    except:
        print(f"[⚠️] Cannot fetch or empty source: {url}")
        return []

def is_valid_config(line: str) -> bool:
    lower = line.lower()
    if not line or len(line) < 5: return False
    if "pin=0" in lower or "pin=red" in lower or "pin=قرمز" in lower: return False
    return True

def ping(host: str, count: int = 1, timeout: int = 1000) -> float:
    param_count = "-n" if platform.system().lower() == "windows" else "-c"
    param_timeout = "-w" if platform.system().lower() == "windows" else "-W"
    try:
        cmd = ["ping", param_count, str(count), param_timeout, str(timeout), host]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        match = re.search(r'time[=<]\s*(\d+\.?\d*)', result.stdout)
        if match:
            return float(match.group(1))
    except:
        pass
    return float('inf')

# ---------------- پردازش اولیه ----------------
def process_configs(configs: List[str], max_threads=20) -> List[str]:
    results = []
    lock = threading.Lock()
    threads = []

    def worker(line: str):
        if not is_valid_config(line): return
        match = re.search(r'@([^:]+):(\d+)', line)
        if not match: return
        host = match.group(1)
        ping_time = ping(host)
        if ping_time < float('inf'):
            with lock:
                results.append(line)

    for line in configs:
        t = threading.Thread(target=worker, args=(line,))
        threads.append(t)
        t.start()
        if len(threads) >= max_threads:
            for th in threads: th.join()
            threads = []
    for t in threads: t.join()
    return list(dict.fromkeys(results))

# ---------------- بررسی نهایی روی final.txt ----------------
def final_validation(file_path: str) -> List[str]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    except:
        return []

    valid_final = []
    lock = threading.Lock()
    threads = []

    def worker(line: str):
        if not is_valid_config(line): return
        match = re.search(r'@([^:]+):(\d+)', line)
        if not match: return
        host = match.group(1)
        ping_time = ping(host)
        if ping_time < float('inf'):
            with lock:
                valid_final.append(line)

    for line in lines:
        t = threading.Thread(target=worker, args=(line,))
        threads.append(t)
        t.start()
    for t in threads: t.join()
    return list(dict.fromkeys(valid_final))

# ---------------- ذخیره فایل‌ها ----------------
def save_files(normal_configs: List[str], final_configs: List[str]):
    with open(TEXT_NORMAL, "w", encoding="utf-8") as f:
        f.write("\n".join([FILE_HEADER]+normal_configs))
    with open(TEXT_FINAL, "w", encoding="utf-8") as f:
        f.write("\n".join(final_configs))
    print(f"[✅] Saved outputs:")
    print(f"  -> {TEXT_NORMAL}")
    print(f"  -> {TEXT_FINAL}")

# ---------------- بروزرسانی ----------------
def update_all():
    all_configs = []
    for url in LINKS_RAW:
        data = fetch_text(url)
        if data:
            all_configs.extend(data)

    all_configs = [line for line in all_configs if is_valid_config(line)]
    print(f"[*] {len(all_configs)} configs fetched from sources.")

    # ذخیره اولیه در normal.txt
    save_files(all_configs, [])

    # پردازش اولیه و ریختن در final.txt
    processed = process_configs(all_configs)
    save_files(all_configs, processed)

    # بررسی دقیق نهایی روی final.txt
    validated_final = final_validation(TEXT_FINAL)
    save_files(all_configs, validated_final)
    print(f"[*] Final validation done: {len(validated_final)} configs in {TEXT_FINAL}")

# ---------------- Main ----------------
if __name__ == "__main__":
    print("[*] Starting subscription updater with hourly auto-update...")
    while True:
        start = time.time()
        update_all()
        elapsed = time.time() - start
        sleep_time = max(0, UPDATE_INTERVAL - elapsed)
        print(f"[*] Next update in {sleep_time:.0f} seconds (~{sleep_time/60:.1f} min).")
        time.sleep(sleep_time)
