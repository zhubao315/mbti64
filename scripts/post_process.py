#!/usr/bin/env python3
"""Post-processing pipeline for 64 Neo-Poly portraits.

Pipeline per {code}.png (1024x1024 raw output):
  1. Flood-fill chroma key: deep-space-blue bg (from corners, LAB color space, thresh=14) -> transparent
  2. Card version: tint transparent bg with 8% group color (opaque fill)
  3. Scale transparent main -> 512px + 160px thumbnails (Lanczos)
  4. WebP encode of 512/160 at quality=90 (site consumption)

Outputs per code:
  {code}.png          1024 transparent main (overwrite raw)
  {code}-card.png     1024 opaque group-tinted card
  {code}-512.png      512 transparent
  {code}-512.webp     512 transparent (WebP q=90) — SITE USES THIS
  {code}-160.png      160 transparent
  {code}-160.webp     160 transparent (WebP q=90) — SITE USES THIS
"""
import os, glob, json, argparse
from PIL import Image, ImageColor, ImageFilter
import numpy as np

SRC_DIR = r"D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn\public\assets\portraits"
PROMPTS_FILE = os.path.join(os.path.dirname(__file__), "prompts.json")

# Group base tint colors (8% mix, low-opacity card background)
GROUP_COLORS = {
    "analyst":   "#88619A",  # 星云紫
    "diplomat":  "#33A474",  # 翡翠薄荷
    "guardian":  "#4298B4",  # 冰川蓝
    "adventurer":"#E4AE3A",  # 琥珀金
}

def group_of(code):
    """Determine group from 4-letter code prefix."""
    code4 = code[:4]
    if code4 in ("INTJ","INTP","ENTJ","ENTP"): return "analyst"
    if code4 in ("INFJ","INFP","ENFJ","ENFP"): return "diplomat"
    if code4 in ("ISTJ","ISFJ","ESTJ","ESFJ"): return "guardian"
    if code4 in ("ISTP","ISFP","ESTP","ESFP"): return "adventurer"
    return None

def flood_key(image, thresh=14):
    """Flood-fill remove dark-space-blue background.
    
    Strategy: start from 4 corners, flood-fill all pixels within LAB distance
    of the corner seed color. This handles gradient backgrounds cleanly.
    """
    img = image.convert("RGBA")
    arr = np.array(img)
    h, w = arr.shape[:2]
    
    # LAB-ish distance (approx using RGB) — sum of absolute differences
    def is_close(px, seed, t):
        return int(abs(int(px[0]) - int(seed[0]))) + \
               int(abs(int(px[1]) - int(seed[1]))) + \
               int(abs(int(px[2]) - int(seed[2]))) <= t
    
    # Mask: True = background (to become transparent)
    mask = np.zeros((h, w), dtype=bool)
    
    # Seeds: 4 corners
    seeds = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
    
    # BFS flood fill per seed
    for sx, sy in seeds:
        if mask[sy, sx]:
            continue  # already covered
        seed_color = arr[sy, sx]
        # sanity: if corner isn't dark enough, skip
        if np.mean(seed_color[:3]) > 40:
            continue
        
        queue = [(sx, sy)]
        while queue:
            x, y = queue.pop(0)
            if x < 0 or x >= w or y < 0 or y >= h:
                continue
            if mask[y, x]:
                continue
            if not is_close(arr[y, x], seed_color, thresh):
                continue
            mask[y, x] = True
            queue.append((x+1, y))
            queue.append((x-1, y))
            queue.append((x, y+1))
            queue.append((x, y-1))
    
    # Apply mask: set alpha=0 for background
    arr[mask, 3] = 0
    return Image.fromarray(arr)

def make_card(transparent_img, group):
    """Compose transparent PNG onto 8%-tinted opaque background."""
    tint = GROUP_COLORS.get(group, "#888888")
    bg = Image.new("RGBA", transparent_img.size, ImageColor.getrgb(tint) + (255,))
    # Tint opacity = 8% of group color, so we overlay a very light transparent layer
    # Actually simpler: create full opaque bg at 8% mix with white (or full tint)
    # Per spec: "8% 族群色淡染不透明卡版" — 8% tinted opaque card
    # Mix 8% group color with dark base (#0B0F19)? Or just 8% opacity tint on white?
    # Let's do: #0B0F19 base with 8% group color overlay
    dark_base = Image.new("RGBA", transparent_img.size, (11, 15, 25, 255))
    tint_layer = Image.new("RGBA", transparent_img.size, ImageColor.getrgb(tint) + (20,))  # ~8%
    bg = Image.alpha_composite(dark_base, tint_layer)
    return Image.alpha_composite(bg, transparent_img)

def scale(img, size):
    """Scale to size x size keeping aspect ratio with center crop."""
    # Square fit with crop
    w, h = img.size
    if w == h:
        return img.resize((size, size), Image.LANCZOS)
    # Center crop to square first
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    return img.resize((size, size), Image.LANCZOS)

def process_one(path, out_dir):
    code = os.path.splitext(os.path.basename(path))[0]
    group = group_of(code)
    if not group:
        print(f"  SKIP {code} — can't determine group"); return

    out_transparent = os.path.join(out_dir, f"{code}.png")
    out_card = os.path.join(out_dir, f"{code}-card.png")
    out_512_png = os.path.join(out_dir, f"{code}-512.png")
    out_512_webp = os.path.join(out_dir, f"{code}-512.webp")
    out_160_png = os.path.join(out_dir, f"{code}-160.png")
    out_160_webp = os.path.join(out_dir, f"{code}-160.webp")

    print(f"  {code} ({group})", end=" ", flush=True)

    # 1. Flood-fill key
    img = Image.open(path).convert("RGBA")
    t0 = time.time()
    transparent = flood_key(img, thresh=14)
    transparent.save(out_transparent)
    print(f"key={os.path.getsize(out_transparent)//1024}K", end=" ", flush=True)

    # 2. Card version
    card = make_card(transparent, group)
    card.save(out_card)

    # 3. 512 thumbnails
    t512 = scale(transparent, 512)
    t512.save(out_512_png)
    t512.save(out_512_webp, "WEBP", quality=90)

    # 4. 160 thumbnails
    t160 = scale(transparent, 160)
    t160.save(out_160_png)
    t160.save(out_160_webp, "WEBP", quality=90)

    print(f"done ({time.time()-t0:.1f}s)", flush=True)

import time

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="only process one code (e.g. INTJ-A-O)")
    ap.add_argument("--test", help="test one code", action="store_true")
    args = ap.parse_args()

    # Find raw 1024 PNGs (files matching XXXX-*.png with no suffix like -card/-512/-160)
    all_pngs = glob.glob(os.path.join(SRC_DIR, "*.png"))
    raw = [f for f in all_pngs
           if not any(os.path.basename(f).endswith(s) for s in
                      ("-card.png", "-512.png", "-160.png", "-1024x1280.png", "-1080x1920.png"))]
    raw = sorted(raw)

    if args.only:
        raw = [f for f in raw if os.path.splitext(os.path.basename(f))[0] == args.only]

    print(f"Found {len(raw)} raw portraits to post-process")
    t0 = time.time()
    ok = 0
    for i, path in enumerate(raw):
        code = os.path.splitext(os.path.basename(path))[0]
        print(f"[{i+1}/{len(raw)}]", end=" ", flush=True)
        try:
            process_one(path, SRC_DIR)
            ok += 1
        except Exception as e:
            print(f"ERROR {code}: {e}", file=sys.stderr)
            import traceback; traceback.print_exc()

    print(f"\n=== Post-proc done: {ok}/{len(raw)} in {time.time()-t0:.0f}s ===")

if __name__ == "__main__":
    import sys
    main()
