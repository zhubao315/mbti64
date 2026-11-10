#!/usr/bin/env python3
"""P2 收尾 · 清掉出版级抽查暴露的最后一批 P0 残留（幂等、固定 LF）

1. 第 03 章：「模型内平均名次 第 21 名」等单一名次 + 塔尖/塔身/塔底等级化表述
2. 图鉴卷 8 章：「金字塔尖 / 绝对塔尖 / 真正的塔尖」降级为模型内相对次序
3. 第 22 章：两处错乱的 ** 粗体标记与一行孤立 **
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOOK = ROOT / "书-千分之一的你"

STATS = {"sub": 0, "block": 0, "line": 0, "miss": []}


def find(name: str) -> pathlib.Path:
    hits = list(BOOK.rglob(name))
    if not hits:
        raise FileNotFoundError(name)
    return hits[0]


def read(name: str) -> tuple[pathlib.Path, str]:
    p = find(name)
    return p, p.read_text(encoding="utf-8")


def save(p: pathlib.Path, text: str) -> None:
    p.write_bytes(text.encode("utf-8"))  # 固定 LF


def sub(name: str, old: str, new: str, label: str) -> None:
    p, t = read(name)
    if old in t:
        p.write_bytes(t.replace(old, new).encode("utf-8"))
        STATS["sub"] += 1
        print(f"  ✅ {label}")
    elif new in t:
        print(f"  ⏭️  {label}（已应用）")
    else:
        STATS["miss"].append(label)
        print(f"  ⚠️  {label}（未命中）")


def block(name: str, start: str, end: str, new: str, label: str) -> None:
    """按起止锚点整块替换（保留起止之外的内容）"""
    p, t = read(name)
    a = t.find(start)
    b = t.find(end, a + len(start)) if a >= 0 else -1
    if a >= 0 and b >= 0:
        p.write_bytes((t[:a] + new + t[b + len(end):]).encode("utf-8"))
        STATS["block"] += 1
        print(f"  ✅ {label}")
    elif new.strip() in t:
        print(f"  ⏭️  {label}（已应用）")
    else:
        STATS["miss"].append(label)
        print(f"  ⚠️  {label}（锚点未命中）")


# ------------------------------------------------------- 1. 第 03 章单一名次表
C3 = "第03章-稀有度金字塔.md"
TABLE_OLD = """| 后缀 | 模型内平均名次 | 每千人平均人数（模型值） | 模型内档位 |
|:---|:---|:---|:---|
| **C-O** | 第 21 名 | 11.25 | 稀有度金字塔塔尖 |
| **C-H** | 第 27 名 | 13.75 | 塔身 |
| **A-O** | 第 39 名 | 16.88 | 塔身 |
| **A-H** | 第 44 名 | 20.63 | 塔底 |"""
TABLE_NEW = """| 后缀 | 每千人平均人数（模型值） | 模型内相对次序 |
|:---|:---|:---|
| **C-O** | 11.25 | 更靠前（相对少见） |
| **C-H** | 13.75 | 偏前 |
| **A-O** | 16.88 | 偏后 |
| **A-H** | 20.63 | 更靠后（相对常见） |

> 这里的「相对次序」只描述模型内的计算结果，不是名次排行榜，也不代表任何等级或优越性；
> 所有组合都存在同概率并列，因此不设「第 N 名」。"""

sub(C3, TABLE_OLD, TABLE_NEW, "第03章 · 单一名次表改为相对次序")
sub(C3, "没有像 NT/NF 那样被 C 后缀拉到塔尖",
    "没有像 NT/NF 那样被 C 后缀算到更靠前的位置", "第03章 · SP 段落降级")
sub(C3, "而稀有度金字塔的底部——ESTJ-A-H 和 ESFJ-A-H",
    "而模型内次序的另一端——ESTJ-A-H 和 ESFJ-A-H", "第03章 · 金字塔底部降级")

# ------------------------------------------------------- 2. 图鉴卷 8 章塔尖表述
ATLAS = [
    ("第05章-INTJ-冷焰策士.md", "也是金字塔尖梯队。", "也属于模型内更稀有的档位。"),
    ("第06章-INTP-拆解者.md", "也是64型金字塔的**绝对塔尖**。", "也属于模型内最稀有的档位。"),
    ("第07章-ENTJ-推土机型统帅.md", "也是金字塔尖梯队。", "也属于模型内更稀有的档位。"),
    ("第08章-ENTP-变量制造者.md", "也是金字塔尖梯队。", "也属于模型内更稀有的档位。"),
    ("第09章-INFJ-深夜点灯人.md", "让你成为 64 型金字塔尖最特殊的矛盾体之一",
     "让你成为 64 型里一组少见的矛盾体之一"),
    ("第10章-INFP-内心博物馆.md", "也是64型金字塔真正的塔尖。", "也属于模型内最稀有的档位。"),
    ("第11章-ENFP-火种捕手.md", "也是64型金字塔真正的塔尖梯队。", "也属于模型内更稀有的档位。"),
    ("第12章-ENFJ-情绪调度师.md", "也是金字塔尖梯队。", "也属于模型内更稀有的档位。"),
]
for name, old, new in ATLAS:
    sub(name, old, new, f"{name[:6]} · 塔尖表述降级")

# ------------------------------------------------------- 3. 第 22 章粗体破损
C22 = "第22章-一阶同源微调手册.md"
sub(C22,
    "**社交低耗能进化的核心,从来不是让你变成一个会来事的人,而是让你拥有一套**「",
    "**社交低耗能进化的核心**,从来不是让你变成一个会来事的人,而是让你拥有一套「",
    "第22章 · 粗体起点修复")
sub(C22, "低耗能保护程序」**。", "低耗能保护程序」。", "第22章 · 粗体终点修复")

p, t = read(C22)
lines = t.split("\n")
kept = [l for l in lines if l.strip() != "**"]
if len(kept) != len(lines):
    save(p, "\n".join(kept))
    STATS["line"] += len(lines) - len(kept)
    print(f"  ✅ 第22章 · 删除孤立 ** 行 {len(lines) - len(kept)} 行")
else:
    print("  ⏭️  第22章 · 孤立 ** 行（已清理）")

# ------------------------------------------------------- 终检
print("\n=== 终检 ===")
import re
rx = re.compile(r"第\s*\d+\s*名|塔尖|塔身|塔底|^\*\*\s*$")
hits = []
for p in sorted(BOOK.rglob("*.md")):
    if "完整定稿" in p.name or "00-总控" in str(p) or "99-附件" in str(p):
        continue
    for i, l in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        if rx.search(l):
            hits.append(f"{p.name}:{i} | {l.strip()[:110]}")
print(f"  单一名次 / 塔尖等级 / 孤立粗体：{len(hits)} 处")
for h in hits[:10]:
    print("   ", h)
print(f"  改写 {STATS['sub']} 处短语、{STATS['block']} 处整块、{STATS['line']} 行；"
      f"未命中 {len(STATS['miss'])} 项")
if STATS["miss"]:
    for m in STATS["miss"]:
        print("   ⚠️", m)
sys.exit(1 if (hits or STATS["miss"]) else 0)
