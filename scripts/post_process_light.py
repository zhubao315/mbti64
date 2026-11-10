#!/usr/bin/env python3
"""Post-process Solar-Poly light-mode portraits.

Light mode has pure white bg — NO chroma-key needed. Just WebP encode.

For each code (XXXX-YY):
  thumb-512/{code}-thumb-512.png  → thumb-512/{code}-thumb-512.webp   (q=90)
  hero-1200x1600/{code}-hero-1200x1600.png → hero-1200x1600/{code}-hero-1200x1600.webp (q=90)
"""
import os, glob, time
from PIL import Image

BASE = r"D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn\public\assets\portraits-light"

def encode(src, quality=90):
    dst = os.path.splitext(src)[0] + ".webp"
    im = Image.open(src)
    # Ensure RGB for WebP (no alpha — pure white bg)
    if im.mode == "RGBA":
        im = im.convert("RGB")
    elif im.mode != "RGB":
        im = im.convert("RGB")
    im.save(dst, "WEBP", quality=quality, method=4)
    return dst, os.path.getsize(dst) // 1024

def main():
    t0 = time.time()
    thumb_dir = os.path.join(BASE, "thumb-512")
    hero_dir = os.path.join(BASE, "hero-1200x1600")
    thumbs = sorted(glob.glob(os.path.join(thumb_dir, "*-thumb-512.png")))
    heroes = sorted(glob.glob(os.path.join(hero_dir, "*-hero-1200x1600.png")))
    print(f"thumb: {len(thumbs)} pngs, hero: {len(heroes)} pngs")

    done = 0
    for i, src in enumerate(thumbs + heroes):
        dst, kb = encode(src, quality=90)
        done += 1
        if done % 20 == 0 or done == len(thumbs) + len(heroes):
            print(f"  [{done}/{len(thumbs)+len(heroes)}] {os.path.basename(dst)} {kb}KB")

    print(f"\n=== Done: {done} webp in {time.time()-t0:.0f}s ===")

if __name__ == "__main__":
    main()
