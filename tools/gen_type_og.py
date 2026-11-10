"""批量生成 64 型详情页 OG 图（1200×630，插画 + 中文名称 + 稀有度）。

输入：tools/_types.json（由 tools/_export_types.ts 导出）
输出：public/og/{CODE}.png
运行：python tools/gen_type_og.py
"""

from __future__ import annotations
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og"
PORTRAITS = ROOT / "public" / "assets" / "portraits"

W, H = 1200, 630
BG = (248, 250, 252)
NAVY = (15, 39, 71)
MUTED = (100, 116, 139)
LINE = (232, 232, 232)
WHITE = (255, 255, 255)

MSYH_BD = "C:/Windows/Fonts/msyhbd.ttc"
MSYH = "C:/Windows/Fonts/msyh.ttc"
MONO = "C:/Windows/Fonts/consola.ttf"


def font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def mix(color: tuple[int, int, int], alpha: float, base=(255, 255, 255)) -> tuple[int, int, int]:
    return tuple(int(c * alpha + b * (1 - alpha)) for c, b in zip(color, base))


def hex_rgb(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))


def wrap(text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines, cur = [], ""
    for ch in text:
        if f.getlength(cur + ch) <= max_w:
            cur += ch
        else:
            lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines[:3]


def portrait(code: str) -> Image.Image:
    im = Image.open(PORTRAITS / f"{code}.png").convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox) if bbox else im


def build(row: dict) -> None:
    color = hex_rgb(row["color"])
    img = Image.new("RGBA", (W, H), BG + (255,))
    draw = ImageDraw.Draw(img)

    # 右侧软色块（族群色 10%），承载插画
    draw.ellipse([760, 40, 1320, 600], fill=mix(color, 0.10) + (255,))
    draw.ellipse([840, 470, 1140, 620], fill=mix(color, 0.06) + (255,))

    # 插画卡片
    card = [830, 105, 1130, 525]
    draw.rounded_rectangle(card, 16, fill=WHITE + (255,), outline=LINE + (255,), width=2)
    art = portrait(row["code"]).convert("RGBA")
    art.thumbnail((272, 272), Image.LANCZOS)
    plate = Image.new("RGBA", (280, 280), WHITE + (255,))
    offset = ((280 - art.width) // 2, (280 - art.height) // 2)
    plate.alpha_composite(art, offset)
    mask = Image.new("L", (280, 280), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 279, 279], 8, fill=255)
    img.paste(plate, (840, 120), mask)

    f_name = font(MSYH_BD, 66)
    f_code = font(MONO, 34)
    f_eyebrow = font(MSYH_BD, 22)
    f_tag = font(MSYH, 26)
    f_meta = font(MSYH, 22)
    f_small = font(MSYH, 19)

    # 顶部品牌字
    draw.text((84, 62), "MBTI64", font=font(MSYH_BD, 26), fill=NAVY)
    draw.text((84, 94), "64 PERSONALITIES · ONE UNIQUE YOU", font=f_small, fill=MUTED)

    # 族群标签
    label = f"{row['groupCn']} · {row['groupEn'].upper()}"
    tw = f_eyebrow.getlength(label)
    draw.rounded_rectangle([84, 150, 84 + tw + 40, 196], 23, fill=mix(color, 0.12) + (255,))
    draw.text((104, 159), label, font=f_eyebrow, fill=color)

    # 名称
    draw.text((84, 220), row["name"], font=f_name, fill=NAVY)
    draw.text((86, 310), row["code"], font=f_code, fill=MUTED)

    # 稀有度
    meta = f"{row['per1000']} · 稀有度第 {row['rankLabel']} 位"
    draw.rounded_rectangle([84, 372, 84 + f_meta.getlength(meta) + 36, 418], 8, fill=WHITE + (255,), outline=LINE + (255,), width=2)
    draw.text((102, 383), meta, font=f_meta, fill=NAVY)

    # 一句话钩子（最多 2 行，右侧插画区留白）
    y = 450
    for line in wrap(row["tagline"], f_tag, 700)[:2]:
        draw.text((84, y), line, font=f_tag, fill=MUTED)
        y += 42

    # 页脚
    draw.line([84, 556, 1130, 556], fill=LINE + (255,), width=2)
    draw.text((84, 574), "120 道情景题 · 6 个维度 · 7 档稀有度", font=f_small, fill=MUTED)
    draw.text((1130, 574), "zhubao315.github.io/mbti64", font=f_small, fill=MUTED, anchor="ra")

    img.convert("RGB").save(OUT / f"{row['code']}.png", optimize=True)


def main() -> None:
    rows = json.loads((ROOT / "tools" / "_types.json").read_text(encoding="utf-8"))
    for row in rows:
        build(row)
    print(f"generated {len(rows)} og images")


if __name__ == "__main__":
    main()
