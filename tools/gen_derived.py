#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
64 型人格三尺寸派生资产生成器

产出（public/assets/portraits/{code}-...）：
  -160.png        160×160  现有缩略图（不变）
  -512.png        512×512  列表/头像缩略图（本地缩放，秒级）
  -1024x1280.png  1024×1280 详情页立绘（4:5，API 生成）
  -1080x1920.png  1080×1920 社交海报底图（9:16，API 生成）
"""

from __future__ import annotations
import base64, json, os, urllib.request, time, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "portraits"
API = os.environ.get("PORTRAIT_API", "http://192.168.1.3:18189/v1/images/generations")
MODEL = "qwen-image-2.1"

# ---------------------------------------------------------------- 枚举已有型别

def list_codes() -> list[str]:
    codes = []
    for p in OUT.glob("*.png"):
        name = p.name
        if "-" in name and not any(
            name.endswith(s) for s in ("-card.png", "-160.png", "-512.png", "-1024x1280.png", "-1080x1920.png")
        ):
            # 只取 canonical 主图（如 INTJ-A-O.png）
            base = name.rsplit(".", 1)[0]
            if len(base.split("-")) == 3:
                codes.append(base)
    return sorted(set(codes))

# ---------------------------------------------------------------- 512×512 本地缩放

def gen_512(codes: list[str]) -> None:
    print(f"\n=== 1. 512×512 头像/缩略图（本地缩放，共 {len(codes)} 张）===", flush=True)
    for code in codes:
        src = OUT / f"{code}.png"
        dst = OUT / f"{code}-512.png"
        if dst.exists():
            continue
        im = Image.open(src).convert("RGBA")
        # 取主体 bbox（非透明区域）然后缩放保持比例
        bbox = im.getchannel("A").getbbox()
        if bbox:
            im.crop(bbox).resize((512, 512), Image.LANCZOS).save(dst, "PNG")
        else:
            im.resize((512, 512), Image.LANCZOS).save(dst, "PNG")
    print("  ✓ 完成，全部秒级", flush=True)

# ---------------------------------------------------------------- API 调用

def call_api(prompt: str, size: str, n_retries: int = 2) -> bytes:
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": size, "n": 1, "response_format": "b64_json"}).encode("utf-8")
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    last = None
    for attempt in range(1, n_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.load(resp)
            return base64.b64decode(data["data"][0]["b64_json"])
        except Exception as e:
            last = e
            print(f"    ! attempt {attempt} failed: {e}", flush=True)
            time.sleep(5 * attempt)
    raise RuntimeError(f"API failed {n_retries} times: {last}")

# ---------------------------------------------------------------- 竖版 prompt（复用 gen_portraits.py 的 STYLE_CORE + SCENES 数据）

# 从 gen_portraits.py 导入
sys.path.insert(0, str(ROOT / "tools"))
import gen_portraits as gp

def vertical_prompt(code: str, target_aspect: str) -> str:
    """生成竖版 prompt。target_aspect = '4:5' (1024x1280) 或 '9:16' (1080x1920)"""
    base, ac, oh = gp.normalize(code)
    p = gp.SCENES[base]
    color = gp.GROUP_COLOR[gp.GROUP_OF_BASE[base]]
    pose_field = "pose_a" if ac == "A" else "pose_c"
    prop_field = "o_prop" if oh == "O" else "h_prop"
    prop_tag = "Explore-O" if oh == "O" else "Order-H"
    ac_tag = "Assertive-A" if ac == "A" else "Cautious-C"

    if target_aspect == "4:5":
        framing_line = (
            "Composition: the character is centered vertically but occupies roughly 55-65% of the frame height. "
            "There is clear empty space above and below. The character stands or sits as a full figure, "
            "with about 15% empty space at top and 20% empty space at bottom."
        )
        square = "1024x1280"
    else:  # 9:16
        framing_line = (
            "Composition: the character occupies roughly 40-45% of the frame height, positioned slightly above center. "
            "Large empty space above (35%) and below (25%). The character is a clear focal point, "
            "with the majority of the canvas being the off-white background and aura ring. "
            "This is a tall mobile phone poster format."
        )
        square = "1080x1920"

    return f"""{gp.STYLE_CORE}

Character: Modern cartoon character design, sticker-ready illustration. Square {square}.
Role: {p['role_name']} ({ac_tag}, {prop_tag}). Gender: {p['gender']}.
Hairstyle: {p['hairstyle']} (dark brown or black, natural, with clear outline).

{framing_line}
Posture & expression: {p[pose_field]}.
Core prop ({prop_tag}): {p[prop_field]}. NO text on props.

DOMINANT THEME COLOR: {color} (exact hex #, exact flat solid color).
60%+ of outerwear = this color. Inner layer = dark grey flat. Pants = {color} flat. Shoes = black flat. NO gradients.

Background: one faint geometric ring ({color}) on solid off-white #F8F9FA. Character floats, no floor."""

# ---------------------------------------------------------------- 1024×1280 / 1080×1920 API 生成

def gen_vertical(codes: list[str], out_suffix: str, target_aspect: str, api_size: str) -> None:
    print(f"\n=== {out_suffix}（{api_size} {target_aspect}，共 {len(codes)} 张）===", flush=True)
    for i, code in enumerate(codes, 1):
        dst = OUT / f"{code}-{out_suffix}.png"
        if dst.exists():
            continue
        print(f"  [{i}/{len(codes)}] {code} ...", end=" ", flush=True)
        try:
            prompt = vertical_prompt(code, target_aspect)
            raw = call_api(prompt, api_size)
            dst.write_bytes(raw)
            # 记录实际返回尺寸
            from PIL import Image
            im = Image.open(dst)
            print(f"✓ {im.size} ({len(raw)//1024} KB)")
        except Exception as e:
            print(f"✗ {e}")

# ---------------------------------------------------------------- main

def main() -> None:
    codes = list_codes()
    print(f"已发现 {len(codes)} 个型别主图", flush=True)
    if not codes:
        print("错误：未发现主图，请先运行 gen_portraits.py --all")
        return

    gen_512(codes)
    gen_vertical(codes, "1024x1280", "4:5", "1024x1280")
    gen_vertical(codes, "1080x1920", "9:16", "1080x1920")

    # 最终统计
    print(f"\n=== 完成 ===", flush=True)
    for suffix, label in [("-512", "512×512 缩略图"), ("-1024x1280", "1024×1280 立绘"), ("-1080x1920", "1080×1920 海报底")]:
        count = sum(1 for p in OUT.glob(f"*{suffix}.png"))
        print(f"  {label}: {count}/64", flush=True)

if __name__ == "__main__":
    main()
