#!/usr/bin/env python3
"""快速检查全部 64 张主体占比"""
from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"

ok_codes = []
fail_codes = []
for master_path in sorted(OUT.glob("*.png")):
    if not master_path.name.endswith(".png") or master_path.name.endswith("-card.png") or master_path.name.endswith("-160.png") or master_path.name.startswith("test-"):
        continue
    if "-" not in master_path.name:
        continue
    im = Image.open(master_path).convert("RGBA")
    alpha = im.getchannel("A")
    px = alpha.load()
    w, h = im.size
    xs, ys = [], []
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            if px[x, y] >= 250:
                xs.append(x); ys.append(y)
    if not xs:
        fail_codes.append((master_path.stem, "empty", 0))
        continue
    bbox = (min(xs), min(ys), max(xs), max(ys))
    ratio = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) / (w * h)
    if ratio >= 0.30:
        ok_codes.append((master_path.stem, round(ratio, 3)))
    else:
        fail_codes.append((master_path.stem, "small", round(ratio, 3)))

print(f"OK (>30%): {len(ok_codes)}")
for code, r in ok_codes:
    print(f"  {code}: {r}")
print(f"FAIL (<30%): {len(fail_codes)}")
for code, reason, r in fail_codes:
    print(f"  {code}: {reason} {r}")
