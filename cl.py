#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, threading, requests, urllib.parse, re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

# ===================== تنظیمات =====================
TEXT_PATH = "normal.txt"
FIN_PATH = "final.txt"

LINK_PATH = [
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/ss.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vless.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo10.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo20.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo30.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo40.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo50.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/trojan.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo60.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo70.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo80.txt",
    "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/tepo90.txt",
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
def clear_files():
    """خالی کردن فایل‌های نرمال و فینال"""
    for path in [TEXT_PATH, FIN_PATH]:
        try:
            open(path, "w").close()
        except Exception:
            pass

def remove_empty_strings(lst: List[str]) -> List[str]:
    return [str(item).strip() for item in lst if item and str(item).strip()]

def is_valid_config(line: str) -> bool:
    line = line.strip()
    if not line or len(line) < 5:
        return False
    lower = line.lower()
    # حذف کانفیگ‌های خراب و پین بالا
    bad_pins = ["pin=red", "pin=قرمز"]
    if any(bad in lower for bad in bad_pins):
        return False
    # حذف پین‌های بالای 2000
    match = re.search(r"pin=(\d+)", lower)
    if match and int(match.group(1)) > 2000:
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
    """حذف خطوط تکراری و خراب"""
    final_lines = []
    unique_keys = {}
    for line in lines:
        if not is_valid_config(line):
            continue
        cfg = parse_config_line(line)
        key = f"{cfg.protocol}|{cfg.address}|{cfg.port}|{cfg.id}" if cfg else line
        if key not in unique_keys:
            unique_keys[key] = line
    return list(unique_keys.values())

def update_subs_manual():
    """آپدیت دستی مرحله‌ای: normal -> final"""
    clear_files()
    all_lines: List[str] = []
    threads: List[threading.Thread] = []
    results: List[List[str]] = [None] * len(LINK_PATH)

    # خواندن منابع در threads
    def worker(i: int, url: str):
        results[i] = fetch_link(url)

    for i, url in enumerate(LINK_PATH):
        t = threading.Thread(target=worker, args=(i, url))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    for r in results:
        if r:
            all_lines.extend(r)

    # مرحله اول: normal.txt
    all_lines = remove_empty_strings(all_lines)
    normal_lines = clear_and_merge_configs(all_lines)
    normal_lines.insert(0, FILE_HEADER_TEXT)
    with open(TEXT_PATH, "w") as f:
        f.write("\n".join(normal_lines))

    # مرحله دوم: final.txt
    with open(TEXT_PATH, "r") as f:
        normal_lines = f.read().splitlines()
    final_lines = clear_and_merge_configs(normal_lines)
    final_lines.insert(0, FILE_HEADER_TEXT)
    with open(FIN_PATH, "w") as f:
        f.write("\n".join(final_lines))

    print(f"[+] Normal: {len(normal_lines)-1}, Final: {len(final_lines)-1}")

# ===================== اجرای دستی =====================
if __name__ == "__main__":
    print("[*] Manual subscription updater ready.")
    update_subs_manual()
