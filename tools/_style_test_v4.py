#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""风格测试 v4：绕开 flat vector 触发词，用具体参考风格，分离肤色"""
from __future__ import annotations
import base64, json, urllib.request, os
from pathlib import Path

API = os.environ.get("PORTRAIT_API", "http://192.168.1.3:18189/v1/images/generations")
MODEL = os.environ.get("PORTRAIT_MODEL", "qwen-image-2.1")
OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"

STYLE_HARD = """CRITICAL RULES -- follow EXACTLY:
1) OUTLINE: Every shape has a BOLD BLACK OUTLINE (thick strokes ~4px wide). The silhouette must read instantly at small size, like a vinyl decal.
2) COLOR: Only 4-5 solid flat colors total per figure (no gradients anywhere). BUT -- SKIN is always a NORMAL LIGHT CARTOON SKIN TONE (beige/peach), NEVER the theme color. The theme color covers ONLY clothing, props, and aura ring.
3) BACKGROUND: Solid off-white #F8F9FA with ONE faint theme-colored geometric ring behind the character. NO ground, NO floor, NO table, NO shadow -- character is isolated floating.
4) PROPORTIONS & FACE: Cartoonish proportions, 5-head total height (head slightly bigger than real, NOT chibi-giant-head). Face has 2 proper cartoon eyes (almond or round, white sclera + dark pupil, NOT dot eyes, NOT single black circles), simple smile or expression line. Mouth and eyebrows drawn.
5) HAIR: Short natural dark brown or black hair with clear outline shape. NOT bald, NOT hoodie-helmet, NOT purple hair.
6) CLOTHING: Separated garments (jacket + shirt + pants, or coat + inner layer), NOT one-piece bodysuit, NOT catsuit, NOT skin-tight suit.

FORBIDDEN: 16Personalities MBTI avatar style, dot eyes, bald head, one-piece full-body suit, pixel art, chibi, giant round head."""

def build(code, role, gender, hairstyle, posture_desc, action, prop_o, prop_h, is_a, is_o, color_hex, color_name):
    stance = ("standing tall with chest out, facing forward, confident direct gaze, assertive posture"
              if is_a else
              "sitting with legs bent or 3/4 side view, tilted head, thoughtful pensive expression")
    prop = prop_o if is_o else prop_h
    return f"""Modern cartoon character design, indie game UI portrait style, sticker-ready illustration.

CHARACTER: {role}. Gender: {gender}. Hairstyle: {hairstyle} (dark brown or black, natural).
Face: 2 proper cartoon eyes (white sclera + dark pupil, NOT dot eyes, NOT solid circles), simple eyebrows and mouth.
Skin: normal light cartoon skin tone (peach/beige, flat color).

Posture ({'Assertive-A' if is_a else 'Cautious-C'}): {posture_desc}. {action}.
Core prop ({'Explore-O' if is_o else 'Order-H'}): {prop}.

DOMINANT THEME COLOR: {color_name} ({color_hex}). 60%+ of outerwear + the aura ring = this EXACT flat solid color. Inner layer = dark grey flat. Pants = {color_hex} flat or dark grey flat. Shoes = black flat. NO gradients on clothing.

Background: one faint geometric ring ({color_hex}) on solid off-white #F8F9FA. Character floats, no floor/shadow.
1024x1024 square. Isolated character. NO text.

{STYLE_HARD}"""

TESTS = [
    ("INTJ-A-O-V4", build("INTJ-A-O", "Visionary Architect", "female",
        "short neat dark brown hair with slight angular fringe",
        "standing tall with chest out, facing forward, sharp strategic gaze, assertive posture",
        "Confident standing, body language says in control of the situation",
        "Right hand hovering over a floating glowing isometric city grid, left hand holding a golden compass",
        "holding a folded blueprint scroll",
        is_a=True, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple")),

    ("INTP-C-O-V4", build("INTP-C-O", "The Deconstructor", "male",
        "messy slightly long dark brown hair, casual and unkempt",
        "sitting cross-legged, head tilted to one side, hand touching chin thoughtfully",
        "Curious pensive expression, body language deep in thought",
        "Holding an abstract puzzle cube that has gears and lightbulbs floating out from it",
        "holding a clipboard with a pencil",
        is_a=False, is_o=True,
        color_hex="#88619D", color_name="Analyst Purple")),

    ("ESTJ-A-H-V4", build("ESTJ-A-H", "Order Enforcer", "male",
        "short clean black hair, military-style cut",
        "standing upright like a manager, hands on hips, direct authoritative gaze",
        "Assertive posture, body language says they are enforcing the rules",
        "holding a stop sign and directing traffic",
        "holding a clipboard with checklists",
        is_a=True, is_o=False,
        color_hex="#5B9DD9", color_name="Guardian Blue")),

    ("ENFP-A-O-V4", build("ENFP-A-O", "The Idea Captor", "male",
        "messy wavy brown hair, lively bouncy look",
        "leaning forward excitedly, wide smile, body tilted energetically",
        "Energetic posture, body language bursting with ideas",
        "Juggling colorful glowing idea orbs that float around them",
        "holding a rolled-up poster",
        is_a=True, is_o=True,
        color_hex="#33A74C", color_name="Diplomat Green")),
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
