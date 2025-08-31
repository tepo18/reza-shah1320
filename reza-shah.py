#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, threading, time, requests, base64, urllib.parse, psutil, signal, re, socket, subprocess
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

# ===================== تنظیمات =====================
TH_MAX_WORKER = 5
TEXT_PATH = "normal.txt"
FIN_PATH = "final.txt"
BASE64_TXT = "base64.txt"
FINAL_RAW = "final.raw"
UPDATE_INTERVAL = 3600  # ثانیه، آپدیت هر 1 ساعت

LINK_PATH = [
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo98.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo98.yaml",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo98.json",
]

FILE_HEADER_TEXT = "//profile-title: base64:2YfZhduM2LTZhyDZgdi52KfZhCDwn5iO8J+YjvCfmI4gaGFtZWRwNzE="

# ===================== کلاس کانفیگ =====================
@dataclass
class ConfigParams:
    protocol: str
    address: str
    port: int
    tag: Optional[str] = ""
    id: Optional[str] = ""
    extra_params: Dict[str, Any] = field(default_factory=dict)

# ===================== توابع =====================
def remove_empty_strings(lst: List[str]) -> List[str]:
    return [str(item).strip() for item in lst if item and str(item).strip()]

def is_valid_config(line: str) -> bool:
    line = line.strip()
    if not line or len(line) < 5:
        return False
    lower = line.lower()
    if "pin=0" in lower or "pin=red" in lower or "pin=قرمز" in lower:
        return False
    return True

def parse_config_line(line: str) -> Optional[ConfigParams]:
    try:
        line = urllib.parse.unquote(line.strip())
        protocol = None
        for p in ["vmess", "vless", "trojan", "hy2", "hysteria2", "ss", "socks", "wireguard"]:
            if line.startswith(p + "://"):
                protocol = p
                break
        if not protocol:
            return None
        addr, port = "unknown", 0
        match = re.search(r"@([^:]+):(\d+)", line)
        if match:
            addr = match.group(1)
            port = int(match.group(2))
        tag = line.split("#", 1)[1] if "#" in line else ""
        return ConfigParams(protocol=protocol, address=addr, port=port, tag=tag)
    except:
        return None

def fetch_link(url: str) -> List[str]:
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            return r.text.splitlines()
        return []
    except:
        return []

def clear_and_merge_configs(lines: List[str]) -> List[str]:
    final_lines = []
    unique_keys = {}
    for line in lines:
        if not is_valid_config(line):
            continue
        cfg = parse_config_line(line)
        if cfg:
            key = f"{cfg.protocol}|{cfg.address}|{cfg.port}|{cfg.id}"
        else:
            key = line
        if key not in unique_keys:
            unique_keys[key] = line
    final_lines.extend(unique_keys.values())
    return final_lines

# ===================== تست TCP, Ping, HTTP =====================
def tcp_test(host: str, port: int, timeout=3) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except:
        return False

def ping_test(host: str, count=1, timeout=1000) -> bool:
    try:
        result = subprocess.run(["ping", "-c", str(count), "-W", str(timeout), host],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return result.returncode == 0
    except:
        return False

def http_test(host: str, timeout=5) -> bool:
    try:
        url = f"https://{host}"
        r = requests.get(url, timeout=timeout)
        return r.status_code == 200
    except:
        return False

def process_configs(lines: List[str], precise_test=False) -> List[str]:
    valid_configs = []
    lock = threading.Lock()
    def worker(line):
        cfg = parse_config_line(line)
        passed = False
        if cfg:
            host = cfg.address
            port = cfg.port or 443
            if precise_test:
                passed = tcp_test(host, port) and ping_test(host) and http_test(host)
            else:
                passed = tcp_test(host, port)
        else:
            passed = True
        if passed:
            with lock:
                valid_configs.append(line)
    threads = []
    for line in lines:
        t = threading.Thread(target=worker, args=(line,))
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
    return clear_and_merge_configs(valid_configs)

def save_outputs(lines: List[str]):
    try:
        with open(FIN_PATH, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        with open(BASE64_TXT, "w", encoding="utf-8") as f:
            f.write("\n".join([base64.b64encode(l.encode()).decode() for l in lines]))
        with open(FINAL_RAW, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        with open(TEXT_PATH, "w", encoding="utf-8") as f:
            f.write("\n".join([FILE_HEADER_TEXT]+lines))
        print(f"[✅] Saved outputs ({len(lines)} configs)")
    except Exception as e:
        print(f"[❌] Error saving files: {e}")

# ===================== بروزرسانی =====================
def update_subs():
    try:
        all_lines: List[str] = []
        threads: List[threading.Thread] = []
        results: List[List[str]] = [None]*len(LINK_PATH)
        def fetch_worker(i, url):
            results[i] = fetch_link(url)
        for i, url in enumerate(LINK_PATH):
            t = threading.Thread(target=fetch_worker, args=(i,url))
            threads.append(t)
            t.start()
        for t in threads:
            t.join()
        for r in results:
            if r:
                all_lines.extend(r)
        all_lines = remove_empty_strings(all_lines)
        all_lines = clear_and_merge_configs(all_lines)
        all_lines.insert(0, FILE_HEADER_TEXT)

        # مرحله 1: ذخیره اولیه در normal.txt و تست سریع TCP
        normal_configs = process_configs(all_lines, precise_test=False)
        with open(TEXT_PATH,"w",encoding="utf-8") as f:
            f.write("\n".join([FILE_HEADER_TEXT]+normal_configs))
        print(f"[*] {len(normal_configs)} configs saved to {TEXT_PATH} (preliminary)")

        # مرحله 2: از normal.txt دوباره بخوان و تست دقیق
        with open(TEXT_PATH,"r",encoding="utf-8") as f:
            normal_lines = [l.strip() for l in f.readlines() if l.strip() and not l.startswith("//")]
        final_configs = process_configs(normal_lines, precise_test=True)
        save_outputs(final_configs)
        print("[*] Done. All valid configs saved to final files.")
    except Exception as e:
        print(f"[❌] Update failed: {e}")

# ===================== حلقه اصلی =====================
if __name__ == "__main__":
    print("[*] Starting full-feature subscription updater...")
    while True:
        print("[*] Updating subscriptions...")
        update_subs()
        print(f"[*] Next update in {UPDATE_INTERVAL//60} minutes...\n")
        time.sleep(UPDATE_INTERVAL)
