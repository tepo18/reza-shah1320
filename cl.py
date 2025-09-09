#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, sys, threading, time, requests, urllib.parse, re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

# ===================== SETTINGS =====================
TH_MAX_WORKER = 10
TEXT_PATH = "normal.txt"
FIN_PATH = "final.txt"
BATCH_SIZE = 10
TEST_URL = "http://www.gstatic.com/generate_204"

LINK_PATH = [
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/ss.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vless.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo10.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo20.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo30.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo40.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo50.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/trojan.txt",
]

FILE_HEADER_TEXT = "//profile-title: base64:2YfZhduM2LTZhyDZgdi52KfZhCDwn5iO8J+YjvCfmI4gaGFtZWRwNzE="

# ===================== CONFIG CLASS =====================
@dataclass
class ConfigParams:
    protocol: str
    address: str
    port: int
    tag: Optional[str] = ""
    id: Optional[str] = ""
    extra_params: Dict[str, Any] = field(default_factory=dict)

# ===================== FUNCTIONS =====================
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
    except Exception:
        return None

def fetch_link(url: str) -> List[str]:
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            return r.text.splitlines()
        return []
    except Exception:
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
    for val in unique_keys.values():
        final_lines.append(val)
    return final_lines

# ===================== REAL PING FUNCTION =====================
FIN_CONF: List[str] = []

def process_ping(cfg_line: str, t: int) -> bool:
    """
    پینگ واقعی با proxy temp (127.0.0.X) و batch 10 تایی
    """
    try:
        cfg = parse_config_line(cfg_line)
        if not cfg or cfg.address == "unknown" or cfg.port == 0:
            return False

        proxies = {"http": f"http://127.0.0.{t+2}:{cfg.port}",
                   "https": f"http://127.0.0.{t+2}:{cfg.port}"}

        try:
            start = time.time()
            r = requests.get(TEST_URL, proxies=proxies, timeout=10)
            elapsed = (time.time() - start) * 1000
            if r.status_code == 204 or (r.status_code == 200 and len(r.content) == 0):
                if 1 <= elapsed <= 3000:  # پینگ بین 1 تا 3000ms
                    FIN_CONF.append(cfg_line)
                    return True
        except:
            return False
    except:
        return False
    return False

# ===================== MAIN PROCESS =====================
def process_sources() -> List[str]:
    all_configs: List[str] = []
    threads: List[threading.Thread] = []
    results: List[List[str]] = [None] * len(LINK_PATH)

    def worker(i: int, url: str):
        fetched = fetch_link(url)
        valid_configs = [c for c in fetched if is_valid_config(c)]
        results[i] = valid_configs

    for i, url in enumerate(LINK_PATH):
        t = threading.Thread(target=worker, args=(i, url))
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
    for r in results:
        if r:
            all_configs.extend(r)
    all_configs = remove_empty_strings(all_configs)
    all_configs = clear_and_merge_configs(all_configs)
    print(f"[INFO] Total configs fetched from sources: {len(all_configs)}")
    return all_configs

def save_configs(filepath: str, configs: List[str], label: str = ""):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join([FILE_HEADER_TEXT] + configs))
        print(f"[+] Saved {len(configs)} {label} configs to {filepath}")
    except Exception as e:
        print(f"[!] Error saving {filepath}: {e}")

def ping_all(configs: List[str], batch_size: int = 10) -> List[str]:
    FIN_CONF.clear()
    total = len(configs)
    for i in range(0, total, batch_size):
        batch = configs[i:i+batch_size]
        threads = []
        for t_idx, cfg_line in enumerate(batch):
            t = threading.Thread(target=process_ping, args=(cfg_line, t_idx))
            threads.append(t)
            t.start()
        for t in threads:
            t.join()
    return FIN_CONF.copy()

# ===================== MAIN LOOP =====================
if __name__ == "__main__":
    print("[*] Starting subscription updater with real ping and filtering...")

    while True:
        # پاک کردن خروجی‌های قبلی
        open(TEXT_PATH, "w").close()
        open(FIN_PATH, "w").close()
        FIN_CONF.clear()

        print("[*] Step 1: Reading sources...")
        normal_configs = process_sources()

        print("[*] Step 2: First-level ping test (basic filtering)...")
        normal_configs = ping_all(normal_configs, batch_size=10)
        print(f"[INFO] Valid (non-duplicate, healthy) configs after first test: {len(normal_configs)}")
        save_configs(TEXT_PATH, normal_configs, label="normal")

        print("[*] Step 3: Second-level ping test (best configs)...")
        best_configs = ping_all(normal_configs, batch_size=10)
        print(f"[INFO] Best configs after precise ping test: {len(best_configs)}")
        save_configs(FIN_PATH, best_configs, label="final")

        print("\n[*] Menu:")
        print("1) Run again")
        print("2) Exit")
        choice = input("Select an option: ").strip()
        if choice == "2":
            print("[*] Exiting...")
            sys.exit()
