"""MBTI64 品牌资源生成器（一次性脚本，产物直接写入 public/）。

运行：python tools/gen_brand_assets.py
依赖：Pillow（项目环境已具备）
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "assets" / "brand"
PUBLIC = ROOT / "public"

NAVY = "#0F2747"
BG = "#F8FAFC"
MUTED = "#64748B"
SECONDARY = "#64748B"

GROUPS = {
    "analyst": "#7B61FF",
    "diplomat": "#4CAF6B",
    "guardian": "#4A90E2",
    "adventurer": "#F6C343",
}

FONT_STACK = "Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"


def icon_paths(colors):
    """四象限风车圆角方块。colors = (tl, tr, bl, br)。"""
    tl, tr, bl, br = colors
    return [
        ("M 8 2 H 30 V 30 H 2 V 8 A 6 6 0 0 1 8 2 Z", tl),
        ("M 34 2 H 56 A 6 6 0 0 1 62 8 V 30 H 34 Z", tr),
        ("M 2 34 H 30 V 62 H 8 A 6 6 0 0 1 2 56 Z", bl),
        ("M 34 34 H 62 V 56 A 6 6 0 0 1 56 62 H 34 Z", br),
    ]


def icon_svg(tone="color"):
    if tone == "color":
        colors = (GROUPS["analyst"], GROUPS["diplomat"], GROUPS["guardian"], GROUPS["adventurer"])
    elif tone == "dark":
        colors = (NAVY,) * 4
    elif tone == "black":
        colors = ("#000000",) * 4
    elif tone == "white":
        colors = ("#FFFFFF",) * 4
    else:
        raise ValueError(tone)
    body = "\n".join(
        f'  <path d="{d}" fill="{c}"/>' for d, c in icon_paths(colors)
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" '
        'role="img" aria-label="MBTI64">\n'
        f"{body}\n</svg>\n"
    )


def wordmark_svg(x, y, size, fill, anchor="start"):
    return (
        f'  <text x="{x}" y="{y}" font-family="{FONT_STACK}" font-size="{size}" '
        f'font-weight="800" letter-spacing="-0.02em" text-anchor="{anchor}" fill="{fill}">MBTI64</text>'
    )


def logo_svg(variant, tone="color"):
    if variant == "primary":
        w, h = 236, 64
        icon = icon_svg(tone if tone != "light" else "color")
        icon_body = "\n".join(icon.splitlines()[1:-1]).replace(' viewBox="0 0 64 64"', "")
        word_fill = "#FFFFFF" if tone == "light" else ("#000000" if tone == "black" else NAVY)
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            'role="img" aria-label="MBTI64">\n'
            f"{icon_body}\n"
            f"{wordmark_svg(78, 47, 31, word_fill)}\n"
            "</svg>\n"
        )
    if variant == "stacked":
        icon = icon_svg(tone if tone != "light" else "color")
        icon_body = "\n".join(icon.splitlines()[1:-1])
        word_fill = "#FFFFFF" if tone == "light" else ("#000000" if tone == "black" else NAVY)
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 136" width="160" height="136" '
            'role="img" aria-label="MBTI64">\n'
            f'  <g transform="translate(48 4)">\n{icon_body}\n  </g>\n'
            f"{wordmark_svg(80, 116, 27, word_fill, 'middle')}\n"
            "</svg>\n"
        )
    raise ValueError(variant)


def write_svgs():
    BRAND.mkdir(parents=True, exist_ok=True)
    (BRAND / "logo-icon.svg").write_text(icon_svg("color"), encoding="utf-8")
    (BRAND / "logo-primary.svg").write_text(logo_svg("primary", "color"), encoding="utf-8")
    (BRAND / "logo-stacked.svg").write_text(logo_svg("stacked", "color"), encoding="utf-8")
    (BRAND / "logo-light.svg").write_text(logo_svg("primary", "light"), encoding="utf-8")
    (BRAND / "logo-dark.svg").write_text(logo_svg("primary", "dark"), encoding="utf-8")
    (BRAND / "logo-mono-black.svg").write_text(logo_svg("primary", "black"), encoding="utf-8")
    (BRAND / "logo-mono-white.svg").write_text(logo_svg("primary", "white"), encoding="utf-8")
    (BRAND / "favicon.svg").write_text(icon_svg("color"), encoding="utf-8")
    (ROOT / "app" / "icon.svg").write_text(icon_svg("color"), encoding="utf-8")


# ---------------------------------------------------------------- raster helpers

def _quadrant_colors(tone):
    if tone == "color":
        return (GROUPS["analyst"], GROUPS["diplomat"], GROUPS["guardian"], GROUPS["adventurer"])
    if tone == "white":
        return ("#FFFFFF",) * 4
    return (NAVY,) * 4


def draw_pinwheel(img, box, colors):
    """在 RGBA 图上绘制四象限图标（box = (x0, y0, size)）。"""
    x0, y0, size = box
    draw = ImageDraw.Draw(img)
    gap = size * 0.034
    cell = (size - gap * 3) / 2
    r = cell * 0.2
    positions = [(0, 0), (1, 0), (0, 1), (1, 1)]
    for (cx, cy), color in zip(positions, colors):
        x = x0 + gap + cx * (cell + gap)
        y = y0 + gap + cy * (cell + gap)
        draw.rounded_rectangle([x, y, x + cell, y + cell], radius=r, fill=color)


def make_icon_png(path, size, background=None, padding_ratio=0.08, tone="color"):
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    pad = int(s * padding_ratio)
    draw_pinwheel(img, (pad, pad, s - pad * 2), _quadrant_colors(tone))
    if background:
        base = Image.new("RGBA", (s, s), background)
        base.alpha_composite(img)
        img = base
    img = img.resize((size, size), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def load_font(path, size, index=0):
    try:
        return ImageFont.truetype(str(path), size, index=index)
    except Exception:
        return ImageFont.load_default()


def make_og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # 64 点矩阵背景装饰
    for row in range(8):
        for col in range(8):
            x = 840 + col * 40
            y = 96 + row * 40
            draw.ellipse([x, y, x + 8, y + 8], fill="#E6ECF3")

    # 大图标
    draw_pinwheel(img, (880, 300, 220), _quadrant_colors("color"))

    # 顶部品牌
    draw_pinwheel(img, (80, 64, 60), _quadrant_colors("color"))
    font_bold = load_font(Path("C:/Windows/Fonts/msyhbd.ttc"), 40)
    font_h1 = load_font(Path("C:/Windows/Fonts/msyhbd.ttc"), 58)
    font_sub = load_font(Path("C:/Windows/Fonts/msyh.ttc"), 26)
    font_small = load_font(Path("C:/Windows/Fonts/msyh.ttc"), 22)
    font_label = load_font(Path("C:/Windows/Fonts/msyh.ttc"), 18)

    draw.text((160, 84), "MBTI64", font=font_bold, fill=NAVY)

    draw.text((80, 176), "64 PERSONALITIES · ONE UNIQUE YOU", font=font_label, fill=MUTED)
    draw.text((80, 236), "你的性格，在 64 型里有多稀有？", font=font_h1, fill=NAVY)
    draw.text((80, 330), "六维倾向 × 自我姿态 × 变化偏好，探索独特的自己。", font=font_sub, fill=SECONDARY)

    # 四族群图例
    legend = [("分析师", GROUPS["analyst"]), ("外交家", GROUPS["diplomat"]),
              ("守护者", GROUPS["guardian"]), ("冒险家", GROUPS["adventurer"])]
    x = 80
    for name, color in legend:
        draw.ellipse([x, 414, x + 16, 430], fill=color)
        draw.text((x + 26, 406), name, font=font_small, fill=SECONDARY)
        x += 190

    # 底部
    draw.line([80, 518, 1120, 518], fill="#E7ECF2", width=2)
    draw.text((80, 548), "120 道情景题 · 6 个维度 · 7 档稀有度", font=font_small, fill=MUTED)
    draw.text((1120, 548), "zhubao315.github.io/mbti64", font=font_small, fill=MUTED, anchor="ra")

    img.save(PUBLIC / "og" / "home.png", optimize=True)


def main():
    write_svgs()
    for size in (16, 32, 48):
        make_icon_png(BRAND / f"favicon-{size}.png", size, None, 0.04)
    make_icon_png(BRAND / "apple-touch-icon.png", 180, BG, 0.16)
    make_icon_png(BRAND / "icon-192.png", 192, BG, 0.16)
    make_icon_png(BRAND / "icon-512.png", 512, BG, 0.16)
    make_og()
    print("brand assets generated")


if __name__ == "__main__":
    main()
