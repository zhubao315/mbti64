#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""风格测试 v3：排除 16P 豆豆眼小人特征，正向锚定发型/服装"""
from __future__ import annotations
import base64, json, urllib.request, os
from pathlib import Path

API = os.environ.get("PORTRAIT_API", "http://192.168.1.3:18189/v1/images/generations")
MODEL = os.environ.get("PORTRAIT_MODEL", "qwen-image-2.1")
OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"

STYLE_HARD = """CRITICAL STYLE INSTRUCTIONS:
(1) Solid flat color blocks ONLY. NO shadows, NO gradients, NO cel shading, NO 3D depth, NO lighting on character or objects. Every surface is one uniform flat color.
(2) Bold clean black outlines (thick strokes ~4px) on every shape -- the silhouette must be instantly recognizable by outline alone, like a sticker.
(3) Background: solid off-white #F8F9FA, ONE faint geometric ring in theme color behind character, nothing else. NO ground shadow, NO floor, NO table.
(4) Cartoon proportions, stylized but NOT chibi: 5-head total height, head is slightly larger than real human but NOT giant. Normal simplified cartoon face with 2 distinct eyes (pupils visible), NOT single dot eyes.
(5) Character has REALISTIC CARTOON HAIRSTYLE (short dark hair, natural shape, not bald, not hoodie-helmet). Clothing is normal garment (coat, tunic, jacket, shirt -- separate top and bottom, NOT one-piece bodysuit or catsuit).

FORBIDDEN: bald head, dot eyes, single-pixel eyes, one-piece catsuit, full-body skin-tight suit, hood covering face, overly round chibi head, 16Personalities style, pixel art, MBTI test avatar style."""

def build(code, role, posture, action, prop_o, prop_h, is_a, is_o, color_hex, color_name, hairstyle):
    stance = ("standing tall, facing forward, shoulders open and confident, assertive gaze"
              if is_a else
              "sitting with legs bent or 3/4 side view, tilted head, thoughtful or pensive expression")
    prop = prop_o if is_o else prop_h
    return f"""Flat vector character illustration. {STYLE_HARD}

CHARACTER: {role}. Gender: female. Hairstyle: {hairstyle}.
Posture ({'Assertive' if is_a else 'Cautious'}): {posture}. {action}.
Core prop ({'Exploration' if is_o else 'Order'}): {prop}.

DOMINANT COLOR: {color_name} ({color_hex}). 60%+ of the character's outerwear must be this EXACT flat color. Underlayers can be dark grey or black flat.

Background: {color_hex} geometric aura ring (one ring only) on off-white #F8F9FA. No other elements.
1024x1024 square. Professional character design sheet. Sticker-ready isolated figure. No text anywhere."""

TESTS = [
    ("INTJ-A-O-V3", build("INTJ-A-O", "Visionary Architect",
        "standing tall with sharp gaze",
        "Confident standing tall, facing forward, sharp strategic gaze",
        "Right hand hovering over a glowing isometric city grid floating mid-air, left hand holding a golden compass",
        "holding a folded blueprint scroll",
        is_a=True, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple",
        hairstyle="short neat dark brown hair, natural layers, not bald")),

    ("INTP-C-O-V3", build("INTP-C-O", "The Deconstructor",
        "sitting, head tilted thoughtfully",
        "Curious thoughtful expression, sitting with legs bent, head tilted to one side, hand touching chin",
        "Holding an abstract rubik cube that has gears and lightbulbs floating out from it",
        "holding a clipboard with a pencil",
        is_a=False, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple",
        hairstyle="messy slightly long dark brown hair, natural, not bald")),

    ("ENTP-A-O-V3", build("ENTP-A-O", "The Idea Alchemist",
        "dynamic leaning pose, mischievous smirk",
        "Leaning forward playfully, mischievous grin, body tilted at an angle",
        "Juggling 4 glowing abstract idea orbs in the air nearby",
        "holding a stack of index cards",
        is_a=True, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple",
        hairstyle="short spiky dark brown hair")),
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
