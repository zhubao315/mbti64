#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把参考图拼成 2×2 联系表，便于快速目视 QC（临时工具，输出 _sheet_*.png）。

用法：python tools/_contact_sheet.py 02_05_INTJ_base_v01.png ...
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / "docs" / "book-visual" / "refs"
CELL = (512, 768)
GAP = 12


def sheet(files: list[Path], out: Path) -> None:
    canvas = Image.new("RGB", (CELL[0] * 2 + GAP * 3, CELL[1] * 2 + GAP * 3), (235, 235, 235))
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB")
        im.thumbnail(CELL)
        x = GAP + (i % 2) * (CELL[0] + GAP) + (CELL[0] - im.width) // 2
        y = GAP + (i // 2) * (CELL[1] + GAP) + (CELL[1] - im.height) // 2
        canvas.paste(im, (x, y))
        ImageDraw.Draw(canvas).text((x + 4, y + 4), f.stem[:34], fill=(20, 20, 20))
    canvas.save(out)
    print(out.name, canvas.size)


if __name__ == "__main__":
    names = sys.argv[1:]
    files = [REFS / n for n in names if (REFS / n).exists()]
    for i in range(0, len(files), 4):
        sheet(files[i : i + 4], REFS / f"_sheet_b3_{i // 4 + 1}.png")
