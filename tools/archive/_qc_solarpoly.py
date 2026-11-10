#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""参考图客观 QC：尺寸、白底一致性、族群主色覆盖、主色分布。

只做可量化检查；文字/水印/角色一致性等仍需目视。
用法：python tools/_qc_solarpoly.py
"""

from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / "docs" / "book-visual" / "refs"

EXPECT = {
    "01_cover_front_v01": (1024, 1536),
    "02_cover_back_v01": (1024, 1536),
    "03_spine_v01": (1024, 1536),
    "04_volume_01_opening_v01": (1536, 1024),
    "05_volume_02_opening_v01": (1536, 1024),
    "06_volume_03_opening_v01": (1536, 1024),
    "07_volume_04_opening_v01": (1536, 1024),
    "08_volume_05_opening_v01": (1536, 1024),
    "09_volume_06_opening_v01": (1536, 1024),
    "10_type-INFJ_base_v01": (1024, 1536),
    "11_type-INFJ_C-O_v01": (1024, 1536),
    "12_type-INFJ_A-O_v01": (1024, 1536),
    "13_type-INFJ_A-H_v01": (1024, 1536),
    "14_type-INFJ_C-H_v01": (1024, 1536),
    "15_scene_roundtable_INFJ_v01": (1536, 1024),
    "03_spine_v02": (1024, 1536),
    "05_volume_02_v02": (1536, 1024),
    "09_volume_06_v02": (1536, 1024),
    "10_type-INFJ_base_v02": (1024, 1536),
    "15_scene_roundtable_INFJ_v02": (1536, 1024),
    "02_06_INTP_base_v03": (1024, 1536),
    "02_08_ENTP_base_v03": (1024, 1536),
    "04_14_ISFJ_base_v03": (1024, 1536),
    "04_16_ESFJ_base_v03": (1024, 1536),
    "05_18_ISFP_base_v03": (1024, 1536),
}

PALETTE = {
    "NT紫": (123, 97, 255),
    "NF绿": (76, 175, 107),
    "SJ蓝": (74, 144, 226),
    "SP金": (246, 195, 67),
}


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def qc(path: Path) -> None:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    exp = EXPECT.get(path.stem)
    if exp is None and "_suffix_" in path.stem:
        exp = (1024, 1536)  # 批次4：64 亚型卡统一 3:4 竖版
    size_ok = exp == (w, h) if exp else None

    # 边框 12px 均值与近白率
    px = im.load()
    frame = []
    for y in range(h):
        for x in list(range(min(12, w))) + list(range(max(0, w - 12), w)):
            frame.append(px[x, y])
    for x in range(w):
        for y in list(range(min(12, h))) + list(range(max(0, h - 12), h)):
            frame.append(px[x, y])
    fm = tuple(round(sum(c[i] for c in frame) / len(frame)) for i in range(3))
    white_rate = sum(1 for c in frame if min(c) >= 246) / len(frame)

    # 整体近白率（缩采样）
    small = im.resize((160, max(1, int(160 * h / w))))
    sp = small.load()
    near_white = 0; total = 0
    color_hits = {k: 0 for k in PALETTE}
    for y in range(small.size[1]):
        for x in range(small.size[0]):
            c = sp[x, y]; total += 1
            if min(c) >= 240 and max(c) - min(c) <= 12:
                near_white += 1
            for k, v in PALETTE.items():
                if dist(c, v) < 55:
                    color_hits[k] += 1
    hits = {k: round(v * 100 / total, 1) for k, v in color_hits.items() if v * 100 / total >= 0.5}

    # 主色
    q = im.resize((120, max(1, int(120 * h / w)))).quantize(colors=8, method=Image.MEDIANCUT)
    pal = q.getpalette()[: 8 * 3]
    counts = sorted(q.getcolors() or [], reverse=True)[:5]
    doms = []
    for cnt, idx in counts:
        doms.append("#%02X%02X%02X" % tuple(pal[idx * 3: idx * 3 + 3]))

    flags = []
    if size_ok is False:
        flags.append(f"尺寸{size_ok}")
    if fm[0] < 240 or fm[1] < 240 or fm[2] < 240:
        flags.append(f"边框偏灰{fm}")
    if white_rate < 0.90:
        flags.append(f"边框近白率{white_rate:.0%}")
    if not hits:
        flags.append("无族群色")

    print(f"{path.name}")
    print(f"  尺寸 {w}x{h} {'OK' if size_ok else '⚠' if size_ok is False else ''} | 边框均值 {fm} 近白 {white_rate:.0%}")
    print(f"  全图近白 {near_white * 100 / total:.1f}% | 族群色覆盖 {hits or '—'}")
    print(f"  主色 {', '.join(doms)}")
    if flags:
        print(f"  ⚠ {'; '.join(flags)}")
    print()


if __name__ == "__main__":
    for p in sorted(REFS.glob("*.png")):
        qc(p)
