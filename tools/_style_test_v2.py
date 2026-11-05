#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""风格测试 v2：强化粗黑轮廓 + 纯平色块 + 无阴影"""
from __future__ import annotations
import base64, json, urllib.request, os
from pathlib import Path

API = os.environ.get("PORTRAIT_API", "http://192.168.1.3:18189/v1/images/generations")
MODEL = os.environ.get("PORTRAIT_MODEL", "qwen-image-2.1")
OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"

STYLE_CORE = """CRITICAL STYLE RULES -- follow these EXACTLY:
(1) ONLY solid flat color blocks. NO shadows, NO gradients, NO cel shading, NO lighting, NO volume, NO 3D depth anywhere on the character or objects. Every surface is one uniform flat color.
(2) Every shape is outlined with a THICK BLACK LINE (about 4px wide). Bold, clean, crisp outline strokes that define the silhouette clearly. Like a vinyl sticker or icon.
(3) No ground shadow, no floor, no table surface -- character floats on off-white tinted background #F8F9FA with ONLY ONE faint geometric shape (circle or ring) in the theme color as aura.
(4) Simplified cartoon anatomy: large head (5-head total proportion), simple hands, no detailed skin texture, no pores.
(5) NO text anywhere -- not on props, not on background aura."""

def build(code: str, role_name: str, posture: str, action: str, prop_o: str, prop_h: str, is_a: bool, is_o: bool, color_hex: str, color_name: str) -> str:
    # A = 站姿/挺拔/O=探索道具  C=坐姿/侧身 H=守成道具
    stance_line = "confident standing tall, facing forward, shoulders wide, assertive gaze" if is_a else "sitting or 3/4 side view, tilted head or downward gaze, thoughtful expression"
    prop = prop_o if is_o else prop_h
    tail = f"""Themed character: {role_name}. {action}. Posture ({'Assertive' if is_a else 'Cautious'}): {stance_line}. Core prop ({'Exploration' if is_o else 'Order'}): {prop}.
Dominant Theme Color: {color_name} ({color_hex}). 60%+ of character's outfit and aura must be this exact color. The clothing is a single flat color block, no variation.
Background: solid off-white #F8F9FA, with ONE faint geometric ring or circle in {color_hex} as aura behind the character. No other background elements.
{STYLE_CORE}
Output as a single standalone character illustration, square 1024x1024, sticker-ready, isolated, no text, no watermark."""
    return tail

TESTS = [
    ("INTJ-A-O-V2", build("INTJ-A-O", "Visionary Architect",
        "standing tall with sharp gaze",
        "Confident standing tall with sharp gaze, facing forward.",
        "One hand hovering over a glowing isometric holographic city grid floating in mid-air, other hand holding a golden compass",
        "holding a folded blueprint",
        is_a=True, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple")),

    ("INTP-C-O-V2", build("INTP-C-O", "The Deconstructor",
        "sitting cross-legged on a floating block, head tilted thoughtfully",
        "Curious thoughtful expression with head tilted, sitting.",
        "holding an abstract rubik cube that unfolds into floating mechanical gears",
        "holding a clipboard with notes",
        is_a=False, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple")),
]

def call(prompt: str) -> bytes:
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": "1024x1024", "n": 1, "response_format": "b64_json"}).encode("utf-8")
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=240) as resp:
        data = json.load(resp)
    return base64.b64decode(data["data"][0]["b64_json"])

for name, prompt in TESTS:
    print(f"→ {name} ...", flush=True)
    try:
        png = call(prompt)
        path = OUT / f"test-{name}.png"
        path.write_bytes(png)
        print(f"  ✓ {path.name} ({len(png)//1024} KB)")
    except Exception as e:
        print(f"  ✗ {e}")
