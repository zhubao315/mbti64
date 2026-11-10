#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
64 型人格角色插画生成器（Qwen-Image-2.1 · :18189 OpenAI 兼容 shim）

风格锚点 V5（2026-11-03 最终验证）：
  粗黑轮廓（~4px）+ 纯平色块（4-5色）+ 肤色分离 + 奶白 #F8F9FA 背景 + 族群主色 ≥60%。
  关键：道具/姿势全部用抽象几何隐喻，禁任何真实物件名词（触发写实插画模式）。

用法：
  python tools/gen_portraits.py INTJ-A-O INTP-C-O ...
  python tools/gen_portraits.py --all
  python tools/gen_portraits.py --force INTJ-A-O   # 覆盖已存在文件
"""

from __future__ import annotations

import base64, json, os, re, sys, time, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "portraits"
API = os.environ.get("PORTRAIT_API", "http://192.168.1.3:18189/v1/images/generations")
MODEL = os.environ.get("PORTRAIT_MODEL", "qwen-image-2.1")
SIZE = "1024x1024"

# ---------------------------------------------------------------- 数据契约

GROUP_COLOR = {
    "analyst":    "#88619D",  # 紫 分析师 NT
    "diplomat":   "#33A74C",  # 绿 外交家 NF
    "guardian":   "#5B9DD9",  # 蓝 守护者 SJ
    "adventurer": "#E4AE3A",  # 黄 冒险家 SP
}

GROUP_OF_BASE = {
    "INTJ": "analyst",  "INTP": "analyst",  "ENTJ": "analyst",  "ENTP": "analyst",
    "INFJ": "diplomat", "INFP": "diplomat", "ENFJ": "diplomat", "ENFP": "diplomat",
    "ISTJ": "guardian", "ISFJ": "guardian", "ESTJ": "guardian", "ESFJ": "guardian",
    "ISTP": "adventurer", "ISFP": "adventurer", "ESTP": "adventurer", "ESFP": "adventurer",
}

BASE_RE = re.compile(r"^(?P<base>[A-Z]{4})-(?P<a>[ACHO])-(?P<o>[ACHO])$")

# ---------------------------------------------------------------- 场景脚本（全部抽象几何隐喻，零真实物件名词）

SCENES = {
    # ========== 分析师 紫 #88619D ==========
    "INTJ": {
        "role_name": "Visionary Architect", "gender": "female",
        "hairstyle": "short neat dark brown hair with angular fringe",
        "pose_a": "standing tall, chest out, facing forward, sharp strategic gaze, assertive posture, one hand on hip",
        "pose_c": "sitting on edge of invisible floating block, leaning forward slightly, sharp thoughtful gaze",
        "o_prop": "Right hand hovering over a floating glowing isometric geometric city grid, left hand holding a golden compass",
        "h_prop": "Holding a golden compass with both hands, no grid present",
    },
    "INTP": {
        "role_name": "The Deconstructor", "gender": "male",
        "hairstyle": "messy slightly long dark brown hair, casual and unkempt",
        "pose_a": "leaning forward on one knee, hand touching chin, curious gaze fixed on prop",
        "pose_c": "sitting cross-legged, head tilted thoughtfully, hand touching chin",
        "o_prop": "Holding an abstract geometric puzzle cube that has small mechanical gears and glowing symbols floating out from it",
        "h_prop": "Stacking abstract geometric building blocks into a tall tower",
    },
    "ENTJ": {
        "role_name": "Grand Commander", "gender": "male",
        "hairstyle": "short clean black hair, neat military-style cut",
        "pose_a": "standing upright broad-shouldered, arms folded across chest, sharp commanding grin",
        "pose_c": "leaning on one elbow against an invisible flat surface, thoughtful gaze at prop",
        "o_prop": "Standing beside a towering holographic arrow-shaped staff planted in a floating geometric plinth",
        "h_prop": "Unrolling a long abstract scroll with both hands",
    },
    "ENTP": {
        "role_name": "Idea Juggler", "gender": "female",
        "hairstyle": "medium length dark brown hair, lively bouncy style with loose strands",
        "pose_a": "dynamic leaning pose, body tilted at angle, mischievous smirk, arms outstretched",
        "pose_c": "leaning against nothing, head tilted back laughing, relaxed posture",
        "o_prop": "Juggling four glowing abstract idea symbols (bulb-shape, gear-shape, question-mark, lightning-bolt) in mid-air",
        "h_prop": "Holding open a transparent geometric jar with colorful glowing symbols trapped inside",
    },

    # ========== 守护者 蓝 #5B9DD9 ==========
    "ISTJ": {
        "role_name": "Foundation Engineer", "gender": "male",
        "hairstyle": "short black hair partially visible under a geometric hard hat",
        "pose_a": "standing upright, holding a geometric measurement device, direct serious gaze",
        "pose_c": "squatting slightly, holding device close to eye, focused on precision",
        "o_prop": "Holding a floating geometric measurement device with extendable arms",
        "h_prop": "Unrolling a long geometric plan scroll with careful hands",
    },
    "ISFJ": {
        "role_name": "Silent Quartermaster", "gender": "female",
        "hairstyle": "low ponytail dark brown hair with soft fringe",
        "pose_a": "standing facing forward, holding a divided geometric container with four sections, gentle smile",
        "pose_c": "sitting cross-legged, arranging geometric items, soft downcast gaze",
        "o_prop": "Holding a floating geometric container divided into four equal sections",
        "h_prop": "Arranging three sealed geometric cylinders in a neat row",
    },
    "ESTJ": {
        "role_name": "Order Enforcer", "gender": "male",
        "hairstyle": "short clean black hair, neat military-style cut",
        "pose_a": "standing upright, one hand raised holding a geometric authority symbol, direct authoritative gaze",
        "pose_c": "sitting at attention on an invisible flat surface, geometric panel in hand, serious",
        "o_prop": "Holding a floating octagonal geometric symbol with one hand raised in directive pose",
        "h_prop": "Holding a flat geometric panel with both hands (panel surface blank)",
    },
    "ESFJ": {
        "role_name": "Relation Maintainer", "gender": "female",
        "hairstyle": "dark brown hair styled in a low bun with loose strands framing face",
        "pose_a": "standing facing forward, smiling warmly, holding a geometric gift container extended outward",
        "pose_c": "sitting on invisible surface, arranging geometric containers carefully, gentle focused smile",
        "o_prop": "Holding a floating geometric gift container with ribbon extended toward the viewer",
        "h_prop": "Stacking three identical empty geometric boxes neatly on top of each other",
    },

    # ========== 外交家 绿 #33A74C ==========
    "INFJ": {
        "role_name": "Silent Lantern Bearer", "gender": "female",
        "hairstyle": "shoulder-length dark brown hair, soft and flowing",
        "pose_a": "standing facing viewer with soft gentle gaze, one hand extended forward offering a glowing orb",
        "pose_c": "kneeling, head slightly bowed, holding glowing orb close to chest thoughtfully",
        "o_prop": "Holding a small glowing floating orb mounted on an invisible thin pole, extended in one hand",
        "h_prop": "Holding a single glowing geometric seed in open palm of both hands",
    },
    "INFP": {
        "role_name": "Inner Museum Curator", "gender": "male",
        "hairstyle": "medium length slightly wavy dark brown hair",
        "pose_a": "standing on tiptoe reaching up to adjust a geometric symbol, dreamy distant gaze",
        "pose_c": "sitting cross-legged, one hand supporting chin, distant gaze",
        "o_prop": "Adjusting a floating transparent dome containing a glowing geometric butterfly symbol",
        "h_prop": "Opening an empty small geometric container with both hands",
    },
    "ENFJ": {
        "role_name": "Harmony Weaver", "gender": "female",
        "hairstyle": "long dark brown hair pulled back into a loose ponytail",
        "pose_a": "standing with arms open wide, both hands weaving glowing light-threads in air, warm encouraging smile",
        "pose_c": "standing with hands clasped in front, listening intently, warm soft smile",
        "o_prop": "Both hands weaving glowing light-like threads together in mid-air forming a net",
        "h_prop": "Holding a cluster of simple glowing geometric leaf-symbols with both hands",
    },
    "ENFP": {
        "role_name": "Idea Captor", "gender": "male",
        "hairstyle": "messy wavy dark brown hair, lively and bouncy",
        "pose_a": "jumping excitedly in mid-air, arms spread wide, huge energetic smile, idea symbols orbiting around head",
        "pose_c": "sitting on invisible block, chin resting on fist, dreamy happy expression",
        "o_prop": "Surrounded by floating colorful glowing idea symbols that orbit around them in a ring",
        "h_prop": "Holding up an empty clear geometric vessel toward the sky with both hands",
    },

    # ========== 冒险家 黄 #E4AE3A ==========
    "ISTP": {
        "role_name": "Precision Craftsman", "gender": "male",
        "hairstyle": "short dark brown hair, natural messy style",
        "pose_a": "standing leaning forward, both hands working on an abstract geometric mechanism, focused gaze",
        "pose_c": "squatting low, working with both hands on abstract geometric shapes near ground, concentrated",
        "o_prop": "Working with a floating semicircle of abstract tool-shapes arranged around a central point",
        "h_prop": "Kneeling with a geometric container with compartments laid out neatly on invisible surface",
    },
    "ISFP": {
        "role_name": "Sensory Poet", "gender": "female",
        "hairstyle": "long wavy dark brown hair, flowing naturally",
        "pose_a": "standing with arms extended wide in expressive gesture, eyes closed, musical symbols floating around",
        "pose_c": "sitting cross-legged, hands resting on knees, eyes closed in relaxed contemplation",
        "o_prop": "Surrounded by a floating circle of glowing musical-note symbols arranged like a halo",
        "h_prop": "Holding a single curved abstract vessel-shape in two hands",
    },
    "ESTP": {
        "role_name": "Wildcard Troubleshooter", "gender": "male",
        "hairstyle": "short spiky dark brown hair, energetic look",
        "pose_a": "crouched in ready stance, one fist pounded into palm, determined gaze forward",
        "pose_c": "leaning against nothing, one foot propped up on invisible step, casual confident smirk",
        "o_prop": "Holding a floating cross-shaped balance tool with equal weights on both sides",
        "h_prop": "Holding a small abstract beacon symbol in one hand",
    },
    "ESFP": {
        "role_name": "Stage Generator", "gender": "female",
        "hairstyle": "high ponytail dark brown hair, playful energetic",
        "pose_a": "standing with one leg lifted in dynamic pose, arms outstretched, huge joyful smile",
        "pose_c": "sitting on invisible surface, legs crossed, head tilted back laughing",
        "o_prop": "Holding a glowing circular energy ring that pulses softly with color",
        "h_prop": "Holding an empty abstract vessel-shape tilted forward with both hands",
    },
}

# ---------------------------------------------------------------- 提示词模板（STYLE_CORE 前置，权重最高）

STYLE_CORE = """CRITICAL STYLE RULES -- the top priority, follow EXACTLY:
1) OUTLINE: Every single shape has a BOLD BLACK OUTLINE (thick strokes ~4px). Silhouette must read instantly at small size like a vinyl decal or sticker.
2) FLAT COLORS ONLY: 4-5 solid flat colors per figure. NO gradients anywhere -- not on clothing, not on props, not on skin, not on hair. NO cel shading, NO lighting, NO volume, NO 3D depth shadows. Every surface is one uniform flat color.
3) SKIN SEPARATION: Skin MUST be a normal light cartoon skin tone (peach/beige flat color). NEVER dye skin the theme color. Theme color covers ONLY clothing, props, and the aura ring.
4) FACE & EYES: Cartoon proportions, 5-head total height. Face has 2 proper cartoon eyes (white sclera + dark pupil visible, NOT dot eyes, NOT single black circles). Simple eyebrows and mouth drawn.
5) HAIR: Has natural short dark brown or black hair with clear outline. NOT bald, NOT hoodie-helmet, NOT purple hair.
6) CLOTHING: Separated garments (coat + inner + pants, or jacket + inner + pants). NOT one-piece bodysuit, NOT catsuit.
7) BACKGROUND: Solid off-white #F8F9FA. ONE faint theme-colored geometric ring/aura behind character (ring only, no center fill). NO ground, NO floor, NO table, NO chair, NO ground shadow -- character floats in isolation.
8) FORBIDDEN: 16Personalities MBTI avatar style, dot eyes, single black circle eyes, bald head, pixel art, chibi giant head, any text or writing anywhere."""


def normalize(code: str) -> tuple[str, str, str]:
    """规范编码：{base}-{A|C}-{O|H}。反序（如 ISTP-O-C）自动纠正。"""
    m = BASE_RE.match(code.upper())
    if not m:
        raise ValueError(f"非法编码 {code}")
    base, a, o = m.group("base"), m.group("a"), m.group("o")
    if a in "OH" and o in "AC":
        a, o = o, a
    if a not in "AC" or o not in "OH":
        raise ValueError(f"非法编码 {code}")
    return base, a, o


def prompt_for(code: str) -> str:
    base, ac, oh = normalize(code)
    p = SCENES[base]
    color = GROUP_COLOR[GROUP_OF_BASE[base]]
    pose_field = "pose_a" if ac == "A" else "pose_c"
    prop_field = "o_prop" if oh == "O" else "h_prop"
    prop_tag = "Explore-O" if oh == "O" else "Order-H"
    ac_tag = "Assertive-A" if ac == "A" else "Cautious-C"

    return f"""{STYLE_CORE}

Character: Modern cartoon character design, sticker-ready illustration. Square 1024x1024.
Role: {p['role_name']} ({ac_tag}, {prop_tag}). Gender: {p['gender']}.
Hairstyle: {p['hairstyle']} (dark brown or black, natural, with clear outline).

Posture & expression: {p[pose_field]}.
Core prop ({prop_tag}): {p[prop_field]}. NO text on props.

DOMINANT THEME COLOR: {color} (exact hex #, exact flat solid color).
60%+ of outerwear = this color. Inner layer = dark grey flat. Pants = {color} flat. Shoes = black flat. NO gradients.

Background: one faint geometric ring ({color}) on solid off-white #F8F9FA. Character floats, no floor."""


# ---------------------------------------------------------------- API 调用

def call_api(prompt: str) -> bytes:
    body = json.dumps(
        {"model": MODEL, "prompt": prompt, "size": SIZE, "n": 1, "response_format": "b64_json"}
    ).encode("utf-8")
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    last: Exception | None = None
    for attempt in (1, 2, 3):
        try:
            with urllib.request.urlopen(req, timeout=240) as resp:
                data = json.load(resp)
            return base64.b64decode(data["data"][0]["b64_json"])
        except Exception as exc:
            last = exc
            print(f"  ! attempt {attempt} failed: {exc}", flush=True)
            time.sleep(6 * attempt)
    raise RuntimeError(f"API failed 3 times: {last}")


# ---------------------------------------------------------------- 后处理

def tint(color: str, alpha: float = 0.08) -> tuple[int, int, int]:
    r, g, b = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
    return (
        round(255 * (1 - alpha) + r * alpha),
        round(255 * (1 - alpha) + g * alpha),
        round(255 * (1 - alpha) + b * alpha),
    )


def matte_white(im: Image.Image, thresh: float = 42.0) -> tuple[Image.Image, float]:
    """把 off-white #F8F9FA 背景 + 淡色光环一起抠成 alpha。"""
    rgb = im.convert("RGB")
    w, h = rgb.size
    SENT = (255, 0, 255)
    border = [(x, 0) for x in range(w)] + [(x, h-1) for x in range(w)] + [(0, y) for y in range(h)] + [(w-1, y) for y in range(h)]
    samples = sorted(rgb.getpixel(p) for p in border)
    bg = samples[len(samples) // 2]
    seeds = [p for p in border
             if sum(abs(rgb.getpixel(p)[i] - bg[i]) for i in range(3)) <= thresh]
    for seed in seeds:
        ImageDraw.floodfill(rgb, seed, SENT, thresh=thresh)
    px = rgb.load()
    mask = Image.new("L", rgb.size, 255)
    mpx = mask.load()
    removed = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] == SENT:
                mpx[x, y] = 0
                removed += 1
    out = rgb.convert("RGBA")
    out.putalpha(mask)
    return out, removed / (w * h)


def qc(master: Image.Image) -> dict:
    alpha = master.getchannel("A")
    px = alpha.load()
    w, h = master.size
    xs, ys = [], []
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            if px[x, y] >= 250:
                xs.append(x); ys.append(y)
    if not xs:
        return {"ok": False, "reason": "empty", "subject_ratio": 0}
    bbox = (min(xs), min(ys), max(xs), max(ys))
    area = (bbox[2]-bbox[0]) * (bbox[3]-bbox[1]) / (w * h)
    return {
        "ok": area >= 0.20,
        "subject_ratio": round(area, 3),
        "bbox": bbox,
    }


def make_card(master: Image.Image, color: str) -> Image.Image:
    bg = Image.new("RGBA", master.size, (*tint(color), 255))
    return Image.alpha_composite(bg, master)


def make_thumb(master: Image.Image) -> Image.Image:
    return master.resize((160, 160), Image.LANCZOS)


# ---------------------------------------------------------------- 主流程

def generate(code: str, retries: int = 1, force: bool = False) -> Image.Image:
    OUT.mkdir(parents=True, exist_ok=True)
    base, ac, oh = normalize(code)
    canonical = f"{base}-{ac}-{oh}"
    master_path = OUT / f"{canonical}.png"
    if master_path.exists() and not force:
        print(f"  - {canonical}: 已存在，跳过（加 --force 覆盖）", flush=True)
        return Image.open(master_path)
    prompt = prompt_for(code)
    raw = call_api(prompt)
    im = Image.open(__import__("io").BytesIO(raw))
    master, removed = matte_white(im)
    report = qc(master)

    if removed < 0.20 and retries > 0:
        print(f"  ! {canonical}: 背景杂（removed={removed:.0%}），重出", flush=True)
        return generate(code, retries - 1, force=True)
    if not report["ok"] and retries > 0:
        print(f"  ! {canonical}: 主体占比 {report['subject_ratio']} 过小，重出", flush=True)
        return generate(code, retries - 1, force=True)

    master.save(master_path, "PNG")
    make_card(master, GROUP_COLOR[GROUP_OF_BASE[base]]).save(OUT / f"{canonical}-card.png", "PNG")
    make_thumb(master).save(OUT / f"{canonical}-160.png", "PNG")
    print(f"  ✓ {canonical}: removed={removed:.0%} {report}", flush=True)
    return master


def main() -> None:
    args = sys.argv[1:]
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    if "--all" in args:
        bases = list(SCENES)
        codes = [f"{b}-{ac}-{oh}" for b in bases for ac in ("A","C") for oh in ("O","H")]
    else:
        codes = args
    if not codes:
        print("用法: python gen_portraits.py [--all] [--force] [codes...]")
        return
    print(f"共 {len(codes)} 张，force={force}，开始生成…", flush=True)
    for code in codes:
        print(f"→ {code}", flush=True)
        generate(code, force=force)


if __name__ == "__main__":
    main()
