#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""临时风格测试：跑 INTJ-A-O / INTP-C-O 两张验证新 prompt"""
from __future__ import annotations
import base64, json, urllib.request, os, sys
from pathlib import Path

API = os.environ.get("PORTRAIT_API", "http://192.168.1.3:18189/v1/images/generations")
MODEL = os.environ.get("PORTRAIT_MODEL", "qwen-image-2.1")
OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"

TESTS = [
    ("INTJ-A-O", """A bold stylized vector character illustration of INTJ-A-O Visionary Architect, indie editorial vector style, iconic character avatar. 5-head-tall graphic proportions, confident posture standing tall with sharp gaze. Dressed in modern deep purple minimalist cape coat #88619D. One hand hovering over a glowing isometric holographic city grid floating in mid-air, holding a golden compass in the other. Bold smooth contours, striking clean silhouette, minimal soft-tinted lilac background with faint geometric circle, playful cel-shaded vector art. No realism, no photo, no messy 3d, no text, no watermark, no background clutter."""),

    ("INTP-C-O", """A bold stylized vector character illustration of INTP-C-O The Deconstructor, indie editorial vector style. Character sitting cross-legged on a floating violet block, curious thoughtful expression with head tilted. Dressed in lavender and deep violet utility smock. In their hands, an abstract clockwork rubik cube unfolds into floating mechanical gears and glowing formulas. Stylized graphic silhouette, bold clean lines, flat bold color blocks, minimalist lavender-tinted background, whimsical intellectual vibe. No realism, no household tools, no photo, no text, no watermark."""),
]

def call(prompt: str) -> bytes:
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": "1024x1024", "n": 1, "response_format": "b64_json"}).encode("utf-8")
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=240) as resp:
        data = json.load(resp)
    return base64.b64decode(data["data"][0]["b64_json"])

for code, prompt in TESTS:
    print(f"→ generating {code} ...", flush=True)
    try:
        png = call(prompt)
        # 存到 test- 前缀避免覆盖现有资产
        path = OUT / f"test-{code}.png"
        path.write_bytes(png)
        print(f"  ✓ {path} ({len(png)//1024} KB)")
    except Exception as e:
        print(f"  ✗ {e}")
