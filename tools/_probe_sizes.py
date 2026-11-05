#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""探测 Qwen-Image-2.1 对非正方形尺寸的支持"""
import base64, json, urllib.request, os, sys
from pathlib import Path

API = "http://192.168.1.3:18189/v1/images/generations"
MODEL = "qwen-image-2.1"
OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"

PROMPT = "Modern cartoon character design, 5-head tall, bold black outlines, flat solid colors, off-white background. A character in purple coat holding a golden compass. Sticker-ready illustration."

SIZES = ["512x512", "768x768", "1024x1024", "1024x1280", "1080x1080", "1080x1350", "1080x1920", "1536x1536"]

for size in SIZES:
    print(f"→ size={size} ...", flush=True)
    try:
        body = json.dumps({"model": MODEL, "prompt": PROMPT, "size": size, "n": 1, "response_format": "b64_json"}).encode("utf-8")
        req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.load(resp)
        raw = base64.b64decode(data["data"][0]["b64_json"])
        path = OUT / f"probe-{size}.png"
        path.write_bytes(raw)
        # 实际返回的尺寸（b64_json 里没有，但文件本身可以读）
        from PIL import Image
        im = Image.open(path)
        print(f"  ✓ 请求 {size} → 实际 {im.size} ({len(raw)//1024} KB)")
    except Exception as e:
        print(f"  ✗ {e}")
