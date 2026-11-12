#!/usr/bin/env python3
"""把真实封面合成到 AI 生成的写实书模上

【为什么需要这一步】
AI 直接画书模会把封面文字画错（实测 minimax-h3-image 把书脊上的竖排书名
改写成「封面你」「作者 音它」）。而 AI 又不做图片编辑（moss-image 只支持文生图），
没法直接拿真封面去做「立体化」。

于是反过来：让 AI 画一本**封面是纯色空白**的书 —— 透视、材质、光影、纸页厚度、
投影全部由 AI 给（这部分正是 AI 比脚本强的地方），我们只负责把**真实的封面**
按检测到的封面四边形透视贴回去。文字因此逐像素准确。

【检测原理】
1. AI 被要求把封面画成指定色相的纯色（默认青绿），其余全是白/灰/木色/米白纸页
   → 按 HSV 的 H 通道就能把封面挑出来；
2. 取最大连通区域 → 凸包 → 凸包内面积最大的四边形 = 封面四边形；
3. 用四边形四条边附近的轮廓点做最小二乘直线拟合，再求相邻直线交点 → 精修角点。

用法：
    python3 scripts/apply_cover.py --base base.png --cover 装帧/封面.png --out out.jpg
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_book_mockup as rbm  # noqa: E402  (同目录，复用单应矩阵/透视变换)


# ================================================================ 颜色
def rgb_to_hsv(arr: np.ndarray):
    """(H,W,3) uint8 → (H,W,3) float，H∈[0,360)，S,V∈[0,1]"""
    a = arr.astype(np.float32) / 255.0
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    df = mx - mn
    h = np.zeros_like(mx)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (df > 1e-6)
    idx = m & (mx == r)
    h[idx] = (60 * ((g[idx] - b[idx]) / df[idx])) % 360
    idx = m & (mx == g)
    h[idx] = 60 * ((b[idx] - a[..., 2][idx]) / df[idx]) + 120
    idx = m & (mx == b)
    h[idx] = 60 * ((r[idx] - g[idx]) / df[idx]) + 240
    s = np.where(mx > 1e-6, df / np.maximum(mx, 1e-6), 0)
    return np.stack([h, s, mx], axis=2)


def hue_mask(rgb: np.ndarray, h_lo: float, h_hi: float, s_min: float, v_min: float):
    hsv = rgb_to_hsv(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # 色相环绕：青绿在 150~200，避开两端
    m = (h >= h_lo) & (h <= h_hi) & (s >= s_min) & (v >= v_min)
    return m


# ================================================================ 连通域
def largest_component(mask: np.ndarray):
    """返回最大连通区域的布尔掩膜（8 邻域）。纯 numpy 实现，不用 scipy。"""
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    cur = 0
    best_id, best_size = 0, 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        cur += 1
        stack = [(y0, x0)]
        lab[y0, x0] = cur
        size = 0
        while stack:
            y, x = stack.pop()
            size += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur
                        stack.append((ny, nx))
        if size > best_size:
            best_id, best_size = cur, size
    return lab == best_id


def convex_hull(points: np.ndarray):
    """Andrew monotone chain，返回逆时针凸包顶点 (N,2) int。"""
    pts = sorted(map(tuple, points.tolist()))
    if len(pts) <= 2:
        return np.array(pts, dtype=int)

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return np.array(lower[:-1] + upper[:-1], dtype=int)


def mask_hull(mask: np.ndarray):
    """从二值掩膜求凸包。

    不要直接把全部像素喂给凸包 —— 几十万点慢；而按固定步长抽稀又会漏掉
    尖锐的角（实测封底那张图左上角偏了 73px，合成后左上角露出底色）。
    凸包的顶点必然是「每一行的最左 / 最右像素」，按行取极值既精确又快。
    """
    h = mask.shape[0]
    pts = []
    for y in range(h):
        row = np.nonzero(mask[y])[0]
        if len(row):
            pts.append((int(row[0]), y))
            pts.append((int(row[-1]), y))
    if len(pts) < 3:
        return None
    return convex_hull(np.array(pts, dtype=int))


def quad_from_hull_edges(hull: np.ndarray, angle_tol=14.0):
    """从凸包的主边方向求出四边形。

    「凸包内面积最大的四边形」对弯曲的窄条不可靠 —— 书脊条在底部是弯的，
    凸包顶点会多出一堆，最大面积四边形就会切掉底部一块，合成后露出底色。

    正确做法：把凸包的边按方向聚类（对边平行 → 方向差 180°，折到 [0,180) 后同簇），
    取总长度最大的两个方向簇，每个簇里最外侧的两条边就是四边形的一对对边，
    四条直线两两求交即得四边形。
    """
    n = len(hull)
    edges = []
    for i in range(n):
        p, q = hull[i], hull[(i + 1) % n]
        e = q - p
        L = float(np.linalg.norm(e))
        if L < 2:
            continue
        u = e / L
        ang = math.degrees(math.atan2(u[1], u[0])) % 180.0
        edges.append((p, q, u, L, ang))

    if len(edges) < 4:
        return None

    clusters = []
    for e in edges:
        p, q, u, L, ang = e
        for c in clusters:
            if abs(((ang - c["ang"] + 90) % 180) - 90) < angle_tol:
                c["members"].append(e)
                c["ang"] = (c["ang"] * (len(c["members"]) - 1) + ang) / len(c["members"])
                break
        else:
            clusters.append({"ang": ang, "members": [e]})
    clusters.sort(key=lambda c: -sum(m[3] for m in c["members"]))
    if len(clusters) < 2:
        return None

    # 每个方向簇取最外侧的两条边
    pair = []
    for c in clusters[:2]:
        offs = []
        for p, q, u, L, ang in c["members"]:
            nrm = np.array([-u[1], u[0]])
            offs.append((float(nrm @ p), p, nrm))
        offs.sort(key=lambda t: t[0])
        lo, hi = offs[0], offs[-1]
        if abs(hi[0] - lo[0]) < 4:
            return None
        pair.append(((lo[1], lo[2]), (hi[1], hi[2])))
    if len(pair) < 2:
        return None

    # 相邻的两条边才能求交点：把两组对边交叉排列（A近, B近, A远, B远）
    (a_lo, a_hi), (b_lo, b_hi) = pair[0], pair[1]
    lines = [a_lo, b_lo, a_hi, b_hi]

    corners = []
    for t in range(4):
        (p1, n1), (p2, n2) = lines[(t - 1) % 4], lines[t]
        try:
            pt = np.linalg.solve(np.array([n1, n2]), np.array([n1 @ p1, n2 @ p2]))
        except np.linalg.LinAlgError:
            return None
        corners.append(pt)
    corners = np.array(corners, dtype=float)
    if not np.isfinite(corners).all():
        return None
    # 自检：角点必须落在凸包附近，不能出现跑到画面外的交点
    xmin, xmax = float(hull[:, 0].min()), float(hull[:, 0].max())
    ymin, ymax = float(hull[:, 1].min()), float(hull[:, 1].max())
    pad = 0.12 * max(xmax - xmin, ymax - ymin) + 8
    if ((corners[:, 0] < xmin - pad).any() or (corners[:, 0] > xmax + pad).any()
            or (corners[:, 1] < ymin - pad).any() or (corners[:, 1] > ymax + pad).any()):
        return None
    return corners


def quad_coverage(quad, comp: np.ndarray) -> float:
    """四边形盖住了多少比例的目标区域。

    用来在两种拟合方式之间做选择：
    - 「凸包内最大面积四边形」：对规整的四边形面（正面 / 封底）很准，
      但对弯曲的窄条（书脊）会切掉一块；
    - 「按凸包主边方向求交」：对窄条准，但会把书的封面板切口一起框进去。
    所以不预设哪种对，而是量一下谁盖得多。
    """
    q = np.asarray(quad, dtype=float)
    H, W = comp.shape
    yy, xx = np.mgrid[0:H, 0:W]
    area = sum(q[t][0] * q[(t + 1) % 4][1] - q[(t + 1) % 4][0] * q[t][1] for t in range(4))
    sign = 1.0 if area > 0 else -1.0
    inside = np.ones(comp.shape, dtype=bool)
    for t in range(4):
        a = q[t]
        e = q[(t + 1) % 4] - a
        cross = e[0] * (yy - a[1]) - e[1] * (xx - a[0])
        inside &= (sign * cross >= 0)
    total = int(comp.sum())
    if total == 0:
        return 0.0
    return float((comp & inside).sum()) / total


def pick_quad(candidates, comp):
    """在候选四边形里挑盖得最全的那个（盖不全的退回覆盖最高的）。"""
    best, best_cov = None, -1.0
    for cand in candidates:
        if cand is None:
            continue
        try:
            q = order_quad(cand)
        except Exception:
            continue
        if not np.isfinite(q).all():
            continue
        cov = quad_coverage(q, comp)
        if cov > best_cov:
            best, best_cov = q, cov
    return best, best_cov


def max_area_quad(hull: np.ndarray):
    """凸包内面积最大的四边形（暴力枚举，凸包点数不多时够快）。"""
    n = len(hull)
    if n < 4:
        return None
    best, best_area = None, 0.0
    for i in range(n - 3):
        for j in range(i + 1, n - 2):
            for k in range(j + 1, n - 1):
                for l in range(k + 1, n):
                    p = [hull[i], hull[j], hull[k], hull[l]]
                    a = 0.0
                    for t in range(4):
                        x1, y1 = p[t]
                        x2, y2 = p[(t + 1) % 4]
                        a += x1 * y2 - x2 * y1
                    a = abs(a) / 2
                    if a > best_area:
                        best_area, best = a, p
    return best


def order_quad(quad):
    """按左上、右上、右下、左下排序（人读顺序）。

    按绕质心的极角排序天然得到 [左上,右上,右下,左下]；再用有向面积确认方向。
    注意**不能**用「取 y 最小那个点」当起点 —— 封面倾斜时最��的点可能在右边，
    那样会把整张图转 90°。
    """
    q = np.array(quad, dtype=float)
    c = q.mean(axis=0)
    ang = np.arctan2(q[:, 1] - c[1], q[:, 0] - c[0])
    q = q[np.argsort(ang)]
    area = sum(q[t][0] * q[(t + 1) % 4][1] - q[(t + 1) % 4][0] * q[t][1]
               for t in range(4))
    if area < 0:
        q = q[::-1]
    return q


def to_ul_ll_lr_ur(q):
    """左上/右上/右下/左下 → 贴图要的 左上/左下/右下/右上。

    顺序错了不会报错，只会画出一个旋转 90° 的怪东西 —— 必须显式换。
    """
    q = np.asarray(q, dtype=float)
    return [q[0], q[3], q[2], q[1]]


def refine_quad(quad, comp, band=0.06, min_pts=24):
    """用四边形各边附近的轮廓点做直线拟合，再求相邻直线交点 → 精修角点。"""
    q = np.array(quad, dtype=float)
    c = q.mean(axis=0)
    # 让顶点按逆时针
    area = 0.0
    for t in range(4):
        x1, y1 = q[t]; x2, y2 = q[(t + 1) % 4]
        area += x1 * y2 - x2 * y1
    if area < 0:
        q = q[::-1]
        c = q.mean(axis=0)

    ys, xs = np.nonzero(comp)
    if len(xs) == 0:
        return q
    pts = np.stack([xs, ys], axis=1).astype(float)

    lines = []
    for t in range(4):
        a = q[t]; b = q[(t + 1) % 4]
        e = b - a
        L = np.linalg.norm(e)
        if L < 1e-6:
            lines.append(None)
            continue
        u = e / L
        # 相对该边的法向距离
        rel = pts - a
        dist = rel[:, 0] * (-u[1]) + rel[:, 1] * u[0]
        along = rel[:, 0] * u[0] + rel[:, 1] * u[1]
        # 只取边内侧、且不超出边两端太远的轮廓点
        sel = (dist > -band * L) & (dist < band * L) & (along > -0.06 * L) & (along < 1.06 * L)
        if sel.sum() < min_pts:
            lines.append(None)
            continue
        P = pts[sel]
        # 最小二乘拟合直线：P ≈ p0 + t*u
        t_par = (P - a) @ u
        p0 = (P * t_par[:, None]).sum(axis=0) / max(1e-9, (t_par ** 2).sum())
        n = np.array([-u[1], u[0]])
        lines.append((p0, n))

    corners = []
    for t in range(4):
        l1 = lines[(t - 1) % 4]
        l2 = lines[t]
        if l1 is None or l2 is None:
            corners.append(q[t])
            continue
        (p1, n1), (p2, n2) = l1, l2
        A = np.array([n1, n2])
        b = np.array([n1 @ p1, n2 @ p2])
        try:
            pt = np.linalg.solve(A, b)
        except np.linalg.LinAlgError:
            pt = q[t]
        # 不让精修跑太远
        if np.linalg.norm(pt - q[t]) > 0.12 * np.linalg.norm(q[(t + 1) % 4] - q[t]):
            pt = q[t]
        corners.append(pt)
    return np.array(corners, dtype=float)


# ================================================================ 合成
def expand_quad(q, n):
    """把四边形向外扩 n 像素（逐边平移后求交点）。

    AI 画的封面边缘有一圈更深的倒角，检测出的四边形会略小于实际封面，
    不外扩就会在成品上留一圈底色的边。
    """
    q = np.asarray(q, dtype=float)
    c = q.mean(axis=0)
    lines = []
    for t in range(4):
        a = q[t]
        b = q[(t + 1) % 4]
        e = b - a
        L = np.linalg.norm(e)
        if L < 1e-6:
            lines.append(None)
            continue
        u = e / L
        nrm = np.array([u[1], -u[0]])
        mid = (a + b) / 2
        if np.dot(mid + nrm - c, mid - c) < 0:
            nrm = -nrm
        lines.append((a + nrm * n, nrm))
    out = []
    for t in range(4):
        l1, l2 = lines[(t - 1) % 4], lines[t]
        if l1 is None or l2 is None:
            out.append(q[t])
            continue
        (p1, n1), (p2, n2) = l1, l2
        try:
            pt = np.linalg.solve(np.array([n1, n2]), np.array([n1 @ p1, n2 @ p2]))
        except np.linalg.LinAlgError:
            pt = q[t]
        out.append(pt)
    return np.array(out, dtype=float)


def fill_rim(out: Image.Image, base: Image.Image, quad, teal_mask: np.ndarray,
             cover_area: np.ndarray, edge_rgb=(233, 229, 219), reach=16):
    """把封面四周残留的底色（书板切口）改成封面板的纸质颜色。

    AI 画的封面是纯色的，所以书的封面板切口（正面四周、翻到背面的那一条）也是那个
    纯色；换成真封面后这些切口会留一圈异色边。切口本身是真实的 3D 特征（板厚），
    不能靠外扩四边形盖掉 —— 那会啃掉书脊和纸页。这里只把切口那一圈重新上色。

    判据用「饱和度」而不是色相：切口是高饱和纯色（S>0.4），而背景、纸页、
    地面反光都是低饱和（S<0.2），分得很开。切口受光不同色相会漂（H 从 120
    漂到 184），所以这里放宽色相窗口。
    """
    H, W = out.size[1], out.size[0]
    if not teal_mask.any() or not cover_area.any():
        return out, 0

    # 只处理贴着封面四边形的一圈底色（先竖向膨胀再横向膨胀 —— 必须串行，
    # 两边同时算再用 & 交集，得到的不是膨胀而是缩小）
    near = cover_area.copy()
    for _ in range(max(1, reach // 4)):
        near = np.logical_or.reduce([np.roll(near, dy, axis=0) for dy in (-4, 0, 4)])
        near = np.logical_or.reduce([np.roll(near, dx, axis=1) for dx in (-4, 0, 4)])
    rim = teal_mask & near & ~cover_area
    n = int(rim.sum())
    if n == 0:
        return out, 0

    arr = np.asarray(out, dtype=np.float32)
    base_lum = np.asarray(base.convert("RGB"), dtype=np.float32) @ np.array(
        [0.299, 0.587, 0.114], dtype=np.float32)
    ref = base_lum[cover_area]
    med = float(np.median(ref)) if ref.size else 1.0
    shade = np.clip(base_lum / max(1e-3, med), 0.55, 1.3)
    col = np.array(edge_rgb, dtype=np.float32)
    arr[rim] = col[None, :] * shade[rim][:, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB"), n


def neutralize_tint(out: Image.Image, hsv: np.ndarray, protect=None,
                    lo=0.09, hi=0.34, keep=0.25):
    """去掉纯色封面在台面/背景上留下的冷色反光。

    AI 画的封面是青绿色的，所以它在浅色台面上留了一圈绿调的反光。
    真封面是白的，不会有这种反光 —— 留着会让人一眼看出是贴图。
    判据用「低饱和的青蓝色」：反光区 S 在 0.12~0.16，背景本身 S 只有 0.04~0.06，
    分得开。

    `protect` 是必须保护起来的区域（封面本体）—— 封面上也有青色和蓝色的图形，
    色相窗口跟反光区是重叠的，绝不能一起改。
    """
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = (h >= 150) & (h <= 215) & (s >= lo) & (s <= hi)
    if protect is not None:
        m &= ~protect
    n = int(m.sum())
    if n == 0:
        return out, 0
    arr = np.asarray(out, dtype=np.float32)
    gray = (arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32))[..., None]
    mixed = arr * keep + gray * (1 - keep)
    arr[m] = mixed[m]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB"), n


def push_white(out: Image.Image, threshold=248):
    """把近白的像素推到纯 255（平台白底图要求 RGB 255 255 255）。

    moss 画的「纯白背景」实测是 249~253 之间（带一点很淡的暗角），
    平台的白底校验更严，直接推到 255 更稳妥。
    """
    arr = np.asarray(out).copy()
    m = arr >= threshold
    arr[m] = 255
    return Image.fromarray(arr, out.mode)


def composite(base: Image.Image, cover: Image.Image, quad, shrink=0.0):
    """把 cover 透视贴到 quad 上，按底图里的光照做明暗匹配，再合成回底图。"""
    W, H = base.size
    q = np.array(quad, dtype=float)
    if shrink:
        c = q.mean(axis=0)
        q = c + (q - c) * (1 - shrink)

    # 1) 贴图（注意角点顺序：贴图要 左上/左下/右下/右上）
    layer = rbm.warp_layer(cover, to_ul_ll_lr_ur(q), (W, H))

    # 2) 光照匹配：底图里那块纯色封面本身就是「同一材质在同一光照下」的样本，
    #    它的亮度分布就是这张图该有的明暗。取亮度比值作为系数乘到真封面上。
    base_arr = np.asarray(base.convert("RGB"), dtype=np.float32)
    lum = base_arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

    inside = np.asarray(layer.split()[3]) > 8
    if inside.any():
        med = float(np.median(lum[inside]))
        if med > 1e-3:
            # 只用四边形内侧 80% 拟合平面，避开边缘暗边
            c = q.mean(axis=0)
            u = (q[1] - q[0]) + (q[2] - q[3])
            v = (q[3] - q[0]) + (q[2] - q[1])
            u = u / max(1e-6, np.linalg.norm(u))
            v = v / max(1e-6, np.linalg.norm(v))
            rel = np.stack(np.meshgrid(np.arange(W) - c[0], np.arange(H) - c[1]),
                           axis=-1)
            uu = rel @ u
            vv = rel @ v
            # 缩到四边形内部
            su = np.linalg.norm(q[2] - q[0]) * 0.4
            sv = np.linalg.norm(q[3] - q[0]) * 0.4
            core = inside & (np.abs(uu) < su) & (np.abs(vv) < sv)
            if core.sum() > 200:
                A = np.stack([uu[core], vv[core], np.ones(core.sum())], axis=1)
                coef, *_ = np.linalg.lstsq(A, lum[core], rcond=None)
                grid = np.stack([uu.ravel(), vv.ravel(), np.ones(uu.size)], axis=1)
                plane = (grid @ coef).reshape(uu.shape)
                s = np.clip(plane / med, 0.62, 1.25)
                s = np.where(inside, s, 1.0)
                # 注意：s 可能 >1，缩放后不能超出 uint8 上限，否则回绕成黑块。
                # 用 200 当满量程（1.25*200 = 250，安全）。
                s = np.asarray(Image.fromarray((s * 200).astype(np.uint8)).filter(
                    ImageFilter.GaussianBlur(6)), dtype=np.float32) / 200.0
            else:
                s = np.where(inside, np.clip(lum / med, 0.62, 1.25), 1.0)
                s = np.asarray(Image.fromarray((s * 200).clip(0, 255).astype(np.uint8)),
                               dtype=np.float32) / 200.0

        arr = np.asarray(layer, dtype=np.float32)
        arr[..., :3] *= s[..., None]
        layer = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    else:
        s = None

    # 3) 边缘：印刷封面的边是硬的，不要羽化 —— 羽化会让底图从半透明处透出来，
    #    在封面四周留下一圈底色的线。四边形外扩一点点，让封面压住那条线。
    alpha = layer.split()[3]
    layer.putalpha(alpha)

    out = base.convert("RGBA")
    out.paste(layer, (0, 0), layer)
    return out.convert("RGB"), s


def parse_size(text: str):
    """'1536x1536' → (1536, 1536)"""
    m = re.fullmatch(r"(\d+)x(\d+)", text.strip())
    if not m:
        raise SystemExit(f"--resize 需要形如 1536x1536，收到 {text!r}")
    return int(m.group(1)), int(m.group(2))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="AI 生成的空白封面书模")
    ap.add_argument("--cover", required=True, help="要贴上去的真实封面 PNG")
    ap.add_argument("--out", required=True)
    ap.add_argument("--h-lo", type=float, default=150.0, help="色相下界（青绿）")
    ap.add_argument("--h-hi", type=float, default=200.0, help="色相上界")
    ap.add_argument("--s-min", type=float, default=0.25)
    ap.add_argument("--v-min", type=float, default=0.12)
    ap.add_argument("--shrink", type=float, default=0.0, help="四边形向内收缩比例")
    ap.add_argument("--expand", type=float, default=5.0,
                    help="四边形向外扩多少像素（盖住 AI 画的封面倒角）")
    ap.add_argument("--reach", type=int, default=45,
                    help="封面板切口改色的作用范围（像素）")
    ap.add_argument("--square", action="store_true",
                    help="裁成正方形（电商主图 1:1），以封面为中心")
    ap.add_argument("--resize", default=None, help="输出尺寸，如 1536x1536")
    ap.add_argument("--white-bg", action="store_true",
                    help="把近白像素推到纯 255（平台白底图要求）")
    ap.add_argument("--white-threshold", type=int, default=248)
    ap.add_argument("--debug", action="store_true", help="额外输出检测结果图")
    args = ap.parse_args()

    base = Image.open(args.base).convert("RGB")
    arr = np.asarray(base)
    mask = hue_mask(arr, args.h_lo, args.h_hi, args.s_min, args.v_min)
    print(f"色相命中像素：{mask.sum()} / {mask.size}")
    if mask.sum() < 500:
        sys.exit("ERROR: 没找到目标色相区域，检查 --h-lo/--h-hi 或换个底图")

    comp = largest_component(mask)
    print(f"最大连通区域：{comp.sum()} 像素")

    hull = mask_hull(comp)
    cands = [max_area_quad(hull) if hull is not None else None,
             quad_from_hull_edges(hull) if hull is not None else None]
    quad, cov = pick_quad(cands, comp)
    if quad is None:
        sys.exit("ERROR: 未能从凸包求出四边形")
    print(f"四边形覆盖目标区域：{cov * 100:.1f}%")
    quad = order_quad(quad)
    quad = refine_quad(quad, comp)
    quad = order_quad(quad)
    if args.expand:
        quad = order_quad(expand_quad(quad, args.expand))
    print("封面四边形：")
    for name, p in zip(("左上", "右上", "右下", "左下"), quad):
        print(f"  {name} ({p[0]:.0f}, {p[1]:.0f})")

    cover = Image.open(args.cover).convert("RGBA")
    out, _ = composite(base, cover, quad, shrink=args.shrink)

    # 封面板切口：把四周残留的底色改成纸质白。
    # 切口用更宽的色相窗口 + 更高饱和度阈值（切口受光会偏色，地面反光饱和度低）
    rim_mask = hue_mask(arr, 90, 210, 0.30, 0.10)
    layer = rbm.warp_layer(cover, to_ul_ll_lr_ur(quad), base.size)
    cover_area = np.asarray(layer.split()[3]) > 8
    out, n = fill_rim(out, base, quad, rim_mask, cover_area, reach=args.reach)
    if n:
        print(f"封面板切口改色：{n} 像素")

    # 台面/背景上的青绿反光（纯色封面的残留，真封面是白的）
    out, n2 = neutralize_tint(out, rgb_to_hsv(np.asarray(out, dtype=np.uint8)),
                              protect=cover_area)
    if n2:
        print(f"冷色反光中和：{n2} 像素")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 方形主图（淘宝 / 京东主图要 1:1）：以封面中心为圆心裁正方形
    if args.square:
        W, H = out.size
        side = min(W, H)
        cx = float(np.mean(quad[:, 0]))
        cy = float(np.mean(quad[:, 1]))
        x0 = int(round(min(max(0, cx - side / 2), W - side)))
        y0 = int(round(min(max(0, cy - side / 2), H - side)))
        out = out.crop((x0, y0, x0 + side, y0 + side))
        if args.resize:
            rw, rh = parse_size(args.resize)
            out = out.resize((rw, rh), Image.LANCZOS)
        print(f"方形裁切：{side}×{side} → {out.size}")

    if args.white_bg:
        out = push_white(out, args.white_threshold)
        print(f"白底归一：≥{args.white_threshold} 的像素推到 255")

    out.save(out_path, "JPEG", quality=94, subsampling=0)
    print(f"✓ {out_path}  {out.size}")

    if args.debug:
        dbg = base.copy()
        from PIL import ImageDraw
        d = ImageDraw.Draw(dbg)
        d.polygon([tuple(p) for p in quad], outline=(255, 0, 0), width=5)
        d.text((10, 10), "cover quad", fill=(255, 0, 0))
        dbg.save(out_path.with_suffix(".debug.jpg"), "JPEG", quality=90)


if __name__ == "__main__":
    main()
