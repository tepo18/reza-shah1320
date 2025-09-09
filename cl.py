#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, json, requests, urllib.parse, re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

# ===================== تنظیمات =====================
TH_MAX_WORKER = 10
TEXT_PATH = "normal.txt"    # خروجی مرحله اول
FIN_PATH = "final.txt"      # خروجی مرحله دوم
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

# ===================== کلاس کانفیگ =====================
@dataclass
class ConfigParams:
    protocol: str
    address: str
    port: int
    tag: Optional[str] = ""
    id: Optional[str] = ""
    extra_params: Dict[str, Any] = field(default_factory=dict)

# ===================== توابع کمکی =====================
def remove_empty_strings(lst: List[str]) -> List[str]:
    return [str(item).strip() for item in lst if item and str(item).strip()]

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

def is_valid_config(line: str) -> bool:
    line = line.strip()
    if not line or len(line) < 5:
        return False
    lower = line.lower()
    if "pin=0" in lower or "pin=red" in lower or "pin=قرمز" in lower:
        return False
    return True

def fetch_link(url: str) -> List[str]:
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            return r.text.splitlines()
        else:
            return []
    except Exception:
        return []

# ===================== تست پین =====================
def ping_config_line(line: str) -> bool:
    """بررسی پین کانفیگ. True اگر پین مثبت باشد."""
    try:
        cfg = parse_config_line(line)
        if not cfg:
            return False
        if "pin=0" in line.lower():
            return False
        return True
    except Exception:
        return False

def test_lines_parallel(lines: List[str], max_workers: int) -> List[str]:
    """تست پین کانفیگ‌ها به صورت موازی"""
    valid_lines: List[str] = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(ping_config_line, lines))
    for line, is_valid in zip(lines, results):
        if is_valid:
            valid_lines.append(line)
    return valid_lines

# ===================== مراحل اصلی =====================
def clear_outputs():
    for path in [TEXT_PATH, FIN_PATH]:
        with open(path, "w", encoding="utf-8") as f:
            pass
    print("[*] فایل‌های خروجی پاکسازی شدند.")

def process_sources_to_normal():
    """خواندن منابع، تست پین و ذخیره سالم‌ها در normal.txt"""
    all_lines: List[str] = []
    for url in LINK_PATH:
        all_lines.extend(fetch_link(url))
    all_lines = remove_empty_strings(all_lines)
    normal_lines = [FILE_HEADER_TEXT] + test_lines_parallel(all_lines, TH_MAX_WORKER)
    with open(TEXT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(normal_lines))
    print(f"[+] {len(normal_lines)-1} کانفیگ سالم در {TEXT_PATH} ذخیره شد.")

def process_normal_to_final():
    """خواندن normal.txt، تست مجدد پین و ذخیره بهترین‌ها در final.txt"""
    if not os.path.exists(TEXT_PATH):
        print(f"[!] فایل {TEXT_PATH} موجود نیست.")
        return
    with open(TEXT_PATH, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    lines = remove_empty_strings(lines)
    # حذف هدر و تست مجدد
    final_lines = [FILE_HEADER_TEXT] + test_lines_parallel(lines[1:], TH_MAX_WORKER)
    with open(FIN_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(final_lines))
    print(f"[+] {len(final_lines)-1} کانفیگ نهایی در {FIN_PATH} ذخیره شد.")

# ===================== حلقه اصلی =====================
if __name__ == "__main__":
    print("[*] شروع فرآیند دستی تست منابع و پین گیری (موازی)...")
    clear_outputs()             # پاکسازی اولیه خروجی‌ها
    process_sources_to_normal() # تست منابع و ریختن به normal
    process_normal_to_final()   # تست دوباره و ریختن بهترین‌ها به final
    print("[*] تمام مراحل با موفقیت انجام شد.")
