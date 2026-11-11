#!/usr/bin/env python3
"""印刷版 3D 立体效果图 · 电商上架用（确定性渲染）

【为什么不用 AI 直接画】
电商主图必须和实物一致。封面上的「千分之一的你」「从16型到64型：人格画像、
差异理解与成长练习」「朱宝 著」一个字都不能错 —— AI 会把它们画成乱码
（实测 minimax-h3-image 在第六卷扉页上写过「心理学书设第六卷扁」，
在 3D 主图上还把副标题的词序换了）。

所以反过来做：把书当成一个真实的盒子建模 —— 尺寸、旋转、透视、光影、
纸页厚度、投影全部由脚本算准，封面本体是把真实的 封面.png 透视变换贴上去，
逐像素一致，不会有错字。
AI 的立体效果图另存为 mood shot（scripts/gen-book-mockup.mjs），
只用于详情页氛围图，不做主图。

【依赖】numpy + Pillow（不依赖 OpenCV；PIL 的 Image.QUAD 语义不符合预期，
透视变换这里用 numpy 解单应矩阵自己实现）

用法：
    python3 scripts/render_book_mockup.py                 # 出全部视角
    python3 scripts/render_book_mockup.py --only hero-3q  # 只出某个
    python3 scripts/render_book_mockup.py --bg white      # 纯白底（电商主图规范）
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BINDING = ROOT / "书-千分之一的你" / "装帧"

W_PX, H_PX = 2048, 1536
SS = 2  # 超采样倍数，最后缩小 → 边缘平滑

# ---------------------------------------------------------------- 书本尺寸
# 宽高比严格取自 封面.png（1200×1600 = 0.75），贴图时不会被拉伸
BOOK_W = 150.0          # mm
BOOK_H = BOOK_W * 1600 / 1200
BOOK_D = 24.0           # mm，装订厚度

# 书脊条（书脊.png 543×3437）里真正的设计带。
# 条子按 46 × 291mm @300dpi 制作（11.804 px/mm），内容落在 x 222–440、y 282–3325。
# 但书脊条是「印刷拼版」，不是书脊本身 —— 直接贴到书脊面上会把字压扁。
# 做法：把设计带整体缩放到「书脊面高 BOOK_H」，宽度按比例，居中贴进
# BOOK_D 宽的书脊面，其余部分补封面纸色。
STRIP_PX_PER_MM = 543 / 46.0
SPINE_BAND = (222, 282, 440, 3325)   # 设计带（含菱形、虚线、书名、作者）
SPINE_T = 12                         # 纹理分辨率 px/mm


# ================================================================ 几何
def rot_x(deg: float) -> np.ndarray:
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=float)


def rot_y(deg: float) -> np.ndarray:
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=float)


def rot_z(deg: float) -> np.ndarray:
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=float)


def project(pts: np.ndarray, R: np.ndarray, dist: float, focal: float) -> np.ndarray:
    """透视投影：相机在 +Z 看向原点，画面中心为光轴。返回 (N,2) 像素坐标。"""
    rv = (R @ pts.T).T
    z = rv[:, 2] + dist
    x = focal * rv[:, 0] / z
    y = -focal * rv[:, 1] / z
    return np.stack([x, y], axis=1)


def box_corners() -> np.ndarray:
    """8 个角：0–3 为下排（后左, 后右, 前右, 前左），4–7 为上排同序。"""
    x, y, z = BOOK_W / 2, BOOK_H / 2, BOOK_D / 2
    return np.array([
        [-x, -y, -z],  # 0 后左下
        [+x, -y, -z],  # 1 后右下
        [+x, -y, +z],  # 2 前右下
        [-x, -y, +z],  # 3 前左下
        [-x, +y, -z],  # 4 后左上
        [+x, +y, -z],  # 5 后右上
        [+x, +y, +z],  # 6 前右上
        [-x, +y, +z],  # 7 前左上
    ], dtype=float)


# ================================================================ 透视贴图
def homography(src, dst) -> np.ndarray:
    """求把 src 四点映射到 dst 四点的单应矩阵（DLT，8 个未知数最小二乘）。"""
    A, b = [], []
    for (x, y), (X, Y) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.append(X)
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.append(Y)
    h = np.linalg.lstsq(np.array(A, dtype=float), np.array(b, dtype=float), rcond=None)[0]
    H = np.append(h, 1.0).reshape(3, 3)
    return H / H[2, 2]


def warp_into(canvas: Image.Image, src: Image.Image, quad) -> None:
    """把 src 透视贴到 canvas 的 quad 上（quad 顺序：左上, 左下, 右下, 右上）。"""
    sw, sh = src.size
    ul, ll, lr, ur = quad
    srect = [(0, 0), (0, sh), (sw, sh), (sw, 0)]
    H = homography(srect, [ul, ll, lr, ur])
    Hi = np.linalg.inv(H)

    xs = [p[0] for p in quad]
    ys = [p[1] for p in quad]
    x0 = max(0, int(min(xs)) - 2)
    x1 = min(canvas.size[0], int(max(xs)) + 2)
    y0 = max(0, int(min(ys)) - 2)
    y1 = min(canvas.size[1], int(max(ys)) + 2)
    if x1 <= x0 or y1 <= y0:
        return

    # numpy 保持 PIL 的 (H, W, C) 布局，fromarray 才能直接接
    src_arr = np.asarray(src, dtype=float)
    assert src_arr.shape[0] == sh and src_arr.shape[1] == sw, (src_arr.shape, (sw, sh))
    yy, xx = np.mgrid[y0:y1, x0:x1]
    v = Hi @ np.stack([xx.ravel(), yy.ravel(), np.ones(xx.size)])
    u = (v[0] / v[2]).reshape(xx.shape)
    w = (v[1] / v[2]).reshape(xx.shape)

    inside = (u >= 0) & (u <= sw - 1) & (w >= 0) & (w <= sh - 1)
    if not inside.any():
        return

    u0 = np.floor(u).astype(int); w0 = np.floor(w).astype(int)
    du = u - u0; dw = w - w0
    u0c = np.clip(u0, 0, sw - 1); w0c = np.clip(w0, 0, sh - 1)
    u1c = np.clip(u0 + 1, 0, sw - 1); w1c = np.clip(w0 + 1, 0, sh - 1)
    top = src_arr[w0c, u0c] * (1 - du[..., None]) + src_arr[w0c, u1c] * du[..., None]
    bot = src_arr[w1c, u0c] * (1 - du[..., None]) + src_arr[w1c, u1c] * du[..., None]
    px = top * (1 - dw[..., None]) + bot * dw[..., None]
    # 四边形之外一律清零（alpha 也清，避免半透明边缘拖影）
    px = np.where(inside[..., None], px, 0.0)

    assert px.shape == (y1 - y0, x1 - x0, 4), px.shape
    layer = Image.fromarray(px.astype(np.uint8), "RGBA")
    canvas.paste(layer, (x0, y0), layer)


# ================================================================ 绘制工具
def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vertical_gradient(size, top, bottom) -> Image.Image:
    w, h = size
    g = Image.new("RGB", (1, h))
    d = ImageDraw.Draw(g)
    for y in range(h):
        d.point((0, y), fill=lerp(top, bottom, y / max(1, h - 1)))
    return g.resize(size, Image.BICUBIC)


def poly(quad):
    return [(int(round(p[0])), int(round(p[1]))) for p in quad]


def shade(layer: Image.Image, factor: float, bbox, mode="diag", amount=0.26) -> Image.Image:
    """给一整层加受光：整体亮度系数 + 沿指定方向的线性渐变。

    mode: 'x' 沿宽度方向渐变（窄侧面用）/ 'y' 沿高度方向 / 'diag' 左上亮、右下暗
    """
    arr = np.asarray(layer, dtype=float)
    h, w = arr.shape[:2]
    x0, y0, x1, y1 = bbox
    yy, xx = np.mgrid[0:h, 0:w]
    tx = np.clip((xx - x0) / max(1e-6, x1 - x0), 0, 1)
    ty = np.clip((yy - y0) / max(1e-6, y1 - y0), 0, 1)
    if mode == "x":
        t = tx
    elif mode == "y":
        t = ty
    else:
        t = 0.62 * tx + 0.38 * ty
    mul = factor * (1 - amount * t)
    arr[:, :, :3] *= mul[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def build_spine_texture(strip: Image.Image, board=(250, 248, 243)) -> Image.Image:
    """把书脊拼版条重排成「书脊面」的纹理：设计带等比缩放到书高，居中。"""
    band = strip.crop(SPINE_BAND)
    face_w = int(round(BOOK_D * SPINE_T))
    face_h = int(round(BOOK_H * SPINE_T))
    new_w = max(1, int(round(band.size[0] * face_h / band.size[1])))
    band = band.resize((new_w, face_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (face_w, face_h), board + (255,))
    canvas.paste(band, ((face_w - new_w) // 2, 0), band)
    return canvas


def page_block_texture(size, base=(247, 241, 229), edge=(214, 202, 180), lines=26, vertical=True):
    """纸页切面：米白纸色 + 细密页纹（页纹要弱 —— 强了像条码）。"""
    w, h = size
    img = Image.new("RGBA", (w, h), base + (255,))
    d = ImageDraw.Draw(img)
    for i in range(lines + 1):
        t = i / lines
        if vertical:
            x = int(t * (w - 1))
            d.line([(x, 0), (x, h)], fill=edge + (95,), width=max(1, w // 700))
        else:
            y = int(t * (h - 1))
            d.line([(0, y), (w, y)], fill=edge + (95,), width=max(1, h // 700))
    return img


# ================================================================ 视角定义
# yaw：绕竖轴。负值 = 右侧（书口）转向镜头；正值 = 左侧（书脊）转向镜头
# pitch：绕横轴。正值 = 俯视（能看到顶面），负值 = 仰视（能看到底面）
SCENES = {
    "mockup-hero-3q": dict(
        label="3/4 立体主图",
        yaw=-27.0, pitch=8.0, roll=0.0,
        target_h=1090, cx=0.50, ground=0.85, bg="soft",
    ),
    "mockup-spine": dict(
        label="书脊与厚度",
        yaw=78.0, pitch=6.0, roll=0.0,
        target_h=1060, cx=0.50, ground=0.85, bg="soft",
    ),
    "mockup-front": dict(
        label="正面平视",
        yaw=0.0, pitch=3.0, roll=0.0,
        target_h=1180, cx=0.50, ground=0.87, bg="soft",
    ),
    "mockup-back": dict(
        label="封底",
        yaw=180.0, pitch=6.0, roll=0.0,
        target_h=1010, cx=0.50, ground=0.85, bg="soft",
    ),
}


def build_faces(R, proj, textures):
    """定义书盒的 6 个面（含法线与贴图角点顺序）。"""
    x, y, z = BOOK_W / 2, BOOK_H / 2, BOOK_D / 2
    faces = [
        # 正面：贴封面。角点顺序 = 贴图 (左上, 左下, 右下, 右上)
        dict(name="front", normal=(0, 0, 1),
             quad=[(7, 0), (3, 0), (2, 0), (6, 0)],
             texture=("cover", textures["cover"]),
             factor=1.00, amount=0.09, grad="diag"),
        # 封底：翻到背面看。贴图左右与正面镜像（背面视角里 +X 在观察者左侧）
        dict(name="back", normal=(0, 0, -1),
             quad=[(5, 0), (1, 0), (0, 0), (4, 0)],
             texture=("back", textures["back"]),
             factor=0.96, amount=0.11, grad="diag"),
        # 书脊（-X 面）：贴图左端接封底、右端接封面
        dict(name="spine", normal=(-1, 0, 0),
             quad=[(4, 0), (0, 0), (3, 0), (7, 0)],
             texture=("spine", textures["spine"]),
             factor=0.90, amount=0.16, grad="x"),
        # 书口（+X 面）：纸页切面，页纹竖向
        dict(name="fore", normal=(1, 0, 0),
             quad=[(5, 0), (1, 0), (2, 0), (6, 0)],
             texture=("pages_v", None),
             factor=0.94, amount=0.20, grad="x"),
        # 顶面：纸页顶切口，页纹横向
        dict(name="head", normal=(0, 1, 0),
             quad=[(7, 0), (6, 0), (5, 0), (4, 0)],
             texture=("pages_h", None),
             factor=1.00, amount=0.14, grad="x"),
        # 底面：精装书底是封面板的切口，不是纸页切口
        dict(name="tail", normal=(0, -1, 0),
             quad=[(3, 0), (2, 0), (1, 0), (0, 0)],
             texture=("board", None),
             factor=0.82, amount=0.18, grad="x"),
    ]
    for f in faces:
        f["quad"] = [proj[i] for i, _ in f["quad"]]
        f["normal_cam"] = (R @ np.array(f["normal"], dtype=float))[2]
    return faces


def render(scene: dict, name: str, out_dir: Path, textures: dict) -> None:
    CW, CH = W_PX * SS, H_PX * SS

    # 旋转顺序：先绕自身竖轴转（yaw），再在世界坐标里俯仰（pitch）。
    # 反过来写的话，翻到封底看时俯仰方向会跟着书转，俯视会变成仰视。
    R = rot_z(scene["roll"]) @ rot_x(scene["pitch"]) @ rot_y(scene["yaw"])
    proj = project(box_corners(), R, dist=BOOK_H * 3.4,
                   focal=scene["target_h"] * SS * BOOK_H * 3.4 / BOOK_H)

    # 居中 + 落地
    minx, maxx = proj[:, 0].min(), proj[:, 0].max()
    miny, maxy = proj[:, 1].min(), proj[:, 1].max()
    shift_x = scene["cx"] * CW - (minx + maxx) / 2
    shift_y = scene["ground"] * CH - maxy
    proj = [(p[0] + shift_x, p[1] + shift_y) for p in proj]
    # 注意：maxy 是投影原始坐标，落地后的书底要重新取 —— 影子锚在书上，不能锚在原点
    ground_y = max(p[1] for p in proj)

    # ---------------------------------------------------------- 背景
    # 电商主图惯例：干净的无缝浅底，不加地平线（加了会在书身后面横一道墙缝）
    if scene.get("bg") == "white":
        bg = Image.new("RGB", (CW, CH), (255, 255, 255))
    else:
        bg = vertical_gradient((CW, CH), (253, 252, 250), (240, 237, 231))
        # 左上柔光：弱一点，只用来提亮，不要在背景上留接缝
        glow_mask = Image.new("L", (CW, CH), 0)
        dg = ImageDraw.Draw(glow_mask)
        for i in range(60, 0, -1):
            r = int(CW * 0.78 * i / 60)
            a = int(255 * 0.40 * (1 - i / 60) ** 2.0)
            dg.ellipse([CW * 0.22 - r, CH * 0.02 - r, CW * 0.22 + r, CH * 0.02 + r], fill=a)
        glow_mask = glow_mask.filter(ImageFilter.GaussianBlur(int(CW * 0.12)))
        bg = Image.composite(Image.new("RGB", (CW, CH), (255, 255, 255)), bg, glow_mask)
    canvas = bg.convert("RGBA")

    # ---------------------------------------------------------- 影子
    faces = build_faces(R, proj, textures)
    visible = [f for f in faces if f["normal_cam"] > 0.02]

    silhouette = Image.new("L", (CW, CH), 0)
    ds = ImageDraw.Draw(silhouette)
    for f in visible:
        ds.polygon(poly(f["quad"]), fill=255)

    # 投影：把轮廓压扁贴到台面上（影子是躺在地上的，不是竖着的一块）
    # PIL 的 AFFINE 是「输出坐标 → 输入坐标」：要竖向压扁 k 倍并锚在 ground_y，
    # 输出行 = k*输入行 + (1-k)*ground_y，反解输入行 = (输出行-(1-k)*ground_y)/k
    k = 0.22
    cast = silhouette.transform(
        (CW, CH), Image.AFFINE,
        (1, 0, -int(76 * SS), 0, 1 / k, -ground_y * (1 - k) / k),
        resample=Image.BILINEAR,
    )
    cast = cast.filter(ImageFilter.GaussianBlur(int(34 * SS)))
    cast = cast.point(lambda v: int(v * 0.40))
    canvas = Image.composite(Image.new("RGBA", (CW, CH), (88, 83, 74, 255)), canvas, cast)

    # 接触影：紧贴书底的一条实影 —— 这一条决定书「站得住」还是「浮着」
    contact = Image.new("L", (CW, CH), 0)
    dc = ImageDraw.Draw(contact)
    bx = [p[0] for p in proj]
    dc.ellipse([min(bx) - 16 * SS, ground_y - 14 * SS,
                max(bx) + 16 * SS, ground_y + 22 * SS], fill=255)
    contact = contact.filter(ImageFilter.GaussianBlur(int(11 * SS)))
    contact = contact.point(lambda v: int(v * 0.60))
    canvas = Image.composite(Image.new("RGBA", (CW, CH), (86, 81, 72, 255)), canvas, contact)

    # ---------------------------------------------------------- 书体
    # 凸体：各可见面的投影互不重叠，仍按由远及近画，避免边缘接缝处露底
    cam_z = (R @ box_corners().T).T[:, 2]          # 越大越靠近镜头

    def face_depth(f):
        idx_map = {"front": [7, 3, 2, 6], "back": [5, 1, 0, 4], "spine": [4, 0, 3, 7],
                   "fore": [5, 1, 2, 6], "head": [7, 6, 5, 4], "tail": [3, 2, 1, 0]}
        return float(np.mean([cam_z[i] for i in idx_map[f["name"]]]))

    ordered = sorted(visible, key=face_depth)       # 远的先画

    for f in ordered:
        kind, tex = f["texture"]
        layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        if kind == "cover":
            src = tex
        elif kind == "back":
            src = tex
        elif kind == "spine":
            src = build_spine_texture(tex)
        elif kind == "pages_v":
            xs = [p[0] for p in f["quad"]]; ys = [p[1] for p in f["quad"]]
            src = page_block_texture((max(2, int(max(xs) - min(xs))),
                                      max(2, int(max(ys) - min(ys)))),
                                     vertical=True)
        elif kind == "board":
            xs = [p[0] for p in f["quad"]]; ys = [p[1] for p in f["quad"]]
            src = Image.new("RGBA", (max(2, int(max(xs) - min(xs))),
                                     max(2, int(max(ys) - min(ys)))), (250, 247, 240, 255))
        else:
            xs = [p[0] for p in f["quad"]]; ys = [p[1] for p in f["quad"]]
            src = page_block_texture((max(2, int(max(xs) - min(xs))),
                                      max(2, int(max(ys) - min(ys)))),
                                     vertical=False)
        warp_into(layer, src, f["quad"])
        xs = [p[0] for p in f["quad"]]; ys = [p[1] for p in f["quad"]]
        layer = shade(layer, f["factor"], (min(xs), min(ys), max(xs), max(ys)),
                      mode=f["grad"], amount=f["amount"])
        canvas = Image.alpha_composite(canvas, layer)

    # 封面边缘：一条极淡的暗边，让白封面在浅底上不糊掉
    front = next((f for f in faces if f["name"] == "front"), None)
    if front is not None and front["normal_cam"] > 0.02:
        edge = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        ImageDraw.Draw(edge).polygon(poly(front["quad"]), outline=(120, 116, 108, 70),
                                     width=max(1, 2 * SS))
        canvas = Image.alpha_composite(canvas, edge)

    # ---------------------------------------------------------- 收尾
    out = canvas.convert("RGB").resize((W_PX, H_PX), Image.LANCZOS)
    out_path = out_dir / f"{name}.jpg"
    out.save(out_path, "JPEG", quality=93, subsampling=0)
    print(f"  {out_path.name}  {out.size}  {out_path.stat().st_size // 1024}KB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", default=None, help="只渲染指定视角名")
    ap.add_argument("--bg", choices=["soft", "white"], default=None, help="覆盖背景")
    ap.add_argument("--out", default=None, help="输出目录")
    args = ap.parse_args()

    out_dir = Path(args.out) if args.out else BINDING
    out_dir.mkdir(parents=True, exist_ok=True)

    textures = {
        "cover": Image.open(BINDING / "封面.png").convert("RGBA"),
        "back": Image.open(BINDING / "封底.png").convert("RGBA"),
        "spine": Image.open(BINDING / "书脊.png").convert("RGBA"),
    }

    names = args.only or list(SCENES.keys())
    print("✓ 3D 效果图已生成：")
    for name in names:
        if name not in SCENES:
            print(f"  ! 未知视角 {name}，可用：{', '.join(SCENES)}")
            continue
        scene = dict(SCENES[name])
        if args.bg:
            scene["bg"] = args.bg
        render(scene, name, out_dir, textures)


if __name__ == "__main__":
    main()
