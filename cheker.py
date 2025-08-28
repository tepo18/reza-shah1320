#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import json
import yaml
import base64
import threading
import urllib.parse

# مسیر فایل‌های منابع
TEXT_PATH = "tepo98.txt"
YAML_PATH = "tepo98.yaml"
JSON_PATH = "tepo98.json"

OUTPUT_DIR = "output"
FIN_PATH = "final.txt"
FILE_HEADER_TEXT = "//profile-title: base64:2YfZhduM2LTZhyDZgdi52KfZhCDwn5iO8J+YjvCfmI4gaGFtZWRwNzE="

os.makedirs(OUTPUT_DIR, exist_ok=True)

def remove_empty_lines(lst):
    return [line.strip() for line in lst if line and line.strip()]

def clear_duplicates(lst):
    seen = set()
    final = []
    for line in lst:
        k = line.split('#',1)[0].strip()
        if k not in seen:
            seen.add(k)
            final.append(line.strip())
    return final

def save_file(path, lines, encode_b64=False):
    if not lines:
        open(path, 'w', encoding='utf-8').close()
        print(f"[OK] خالی ساخته شد: {path}")
        return
    full_lines = [FILE_HEADER_TEXT] + lines
    if encode_b64:
        full_lines = [base64.b64encode(l.encode('utf-8')).decode('utf-8') for l in full_lines]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(full_lines))
    print(f"[OK] ذخیره شد: {path} | خطوط: {len(lines)}")

def read_sources():
    all_configs = []
    # TXT
    if os.path.isfile(TEXT_PATH):
        with open(TEXT_PATH, "r", encoding="utf-8") as f:
            all_configs += f.readlines()
    # YAML
    if os.path.isfile(YAML_PATH):
        try:
            with open(YAML_PATH, "r", encoding="utf-8") as f:
                y = yaml.safe_load(f)
            if isinstance(y, dict) and "configs" in y:
                all_configs += y["configs"]
            elif isinstance(y, list):
                all_configs += y
        except Exception as e:
            print(f"[!] خطا در خواندن YAML: {e}")
    # JSON
    if os.path.isfile(JSON_PATH):
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                j = json.load(f)
            if isinstance(j, dict) and "configs" in j:
                all_configs += j["configs"]
            elif isinstance(j, list):
                all_configs += j
        except Exception as e:
            print(f"[!] خطا در خواندن JSON: {e}")
    return all_configs

def process_and_save():
    all_configs = read_sources()
    all_configs = remove_empty_lines(all_configs)
    all_configs = clear_duplicates(all_configs)
    print(f"[INFO] تعداد کانفیگ یکتا: {len(all_configs)}")

    sub1 = [c for c in all_configs if ("vmess" in c or "vless" in c or "trojan" in c)]
    sub2 = [c for c in all_configs if ("hy2" in c or "hysteria" in c or "ss" in c)]
    sub3 = [c for c in all_configs if ("socks" in c or "wireguard" in c or "json" in c)]

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    save_file(os.path.join(OUTPUT_DIR, "sub1_output.txt"), sub1)
    save_file(os.path.join(OUTPUT_DIR, "sub2_output.yaml"), sub2)
    save_file(os.path.join(OUTPUT_DIR, "sub3_output.json"), sub3)
    save_file(FIN_PATH, all_configs)
    save_file(FIN_PATH.replace('.txt','_b64.txt'), all_configs, encode_b64=True)
    print("[DONE] پردازش و ذخیره انجام شد.")

def auto_updater(interval_seconds=3600):
    while True:
        try:
            print("\n[⏳] شروع بروزرسانی...")
            process_and_save()
            print(f"[⏰] خواب برای {interval_seconds} ثانیه تا آپدیت بعدی...")
            time.sleep(interval_seconds)
        except Exception as e:
            print(f"[!] خطا در حلقه آپدیت خودکار: {e}")
            time.sleep(60)

def start_daemon():
    t = threading.Thread(target=auto_updater, daemon=True)
    t.start()
    print("[🚀] آپدیت خودکار (دایمون) اجرا شد. برای خروج Ctrl+C")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n[STOP] دریافت شد، خروج...")

def manual_update():
    process_and_save()

def cli():
    import sys
    if len(sys.argv) < 2:
        print("Usage: python cheker.py [start|manual|once]")
        return
    cmd = sys.argv[1].lower()
    if cmd == "start":
        start_daemon()
    elif cmd == "manual":
        manual_update()
    elif cmd == "once":
        process_and_save()
    else:
        print("Unknown command. use start|manual|once")

if __name__ == "__main__":
    cli()
