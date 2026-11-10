# -*- coding: utf-8 -*-
"""
P1 第一轮（续）：清理图鉴章末尾的写作自检表 + 标题级神经化措辞

背景：16 个图鉴章末尾保留了生成流程的「本章验证 / 标杆章验证」自检表，
其中含「神经科学…准确映射」这类确定性科学断言，以及若干与权威表漂移的
稀有度数值。这类元数据不应进入出版正文。

处理：
- 统一替换为读者向的「## 本章核对」表（保留章末二级标题锚点，见
  scripts/extract-book-data.mjs 板块五终点正则已同步兼容）
- 第 21/23 章标题中的「神经机制 / 神经回路最匹配」改为行为语言
- 第 19 章两处无出处的神经影像/研究者断言降级为场景描写

幂等 + 固定 LF 写入。运行：python scripts/p1_chapter_tail.py
"""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent / "书-千分之一的你"
FILES = {}
for p in ROOT.rglob("*.md"):
    FILES.setdefault(p.name, p)

NEW_SECTION = """## 本章核对

| 核对项 | 说明 |
|:---|:---|
| 证据边界 | 本章出现的脑科学与神经术语均为帮助理解认知过程的通俗类比，不代表该组合拥有专属神经结构，也不构成诊断、测评或医疗建议 |
| 模型设定 | A/C 为决策姿态、O/H 为变化策略；四种调节状态可相互转换，不是人生阶段或发展定律 |
| 稀有度取值 | 四态标题中的档位与「每千人约 X.X 人」为模型计算值，取自 `docs/64型稀有度权威表.md`；并列名次见卷末附录 C，不代表真实人口分布 |
| 练习性质 | 本章行为实验属【练习】假设，不承诺天数、概率或任何生理改变；请以自己的记录判断适用性 |
"""

HEAD_RX = re.compile(r"(?m)^## .*$")
TAIL_KEY = re.compile(r"验证|自检|定稿确认")


def read(name: str) -> str:
    return FILES[name].read_text(encoding="utf-8")


def write(name: str, text: str) -> None:
    FILES[name].write_bytes(text.encode("utf-8"))


def sub(name: str, old: str, new: str, label: str) -> bool:
    t = read(name)
    if old not in t:
        if new in t:
            return True
        print(f"  ⚠️  未命中: {label}")
        return False
    write(name, t.replace(old, new))
    return True


replaced = 0
skipped = 0
for p in sorted(ROOT.rglob("*.md")):
    name = p.name
    if not re.match(r"第(0[5-9]|1\d|20)章", name):
        continue
    t = read(name)
    if "## 本章核对" in t:
        skipped += 1
        continue
    heads = list(HEAD_RX.finditer(t))
    if not heads or not TAIL_KEY.search(heads[-1].group()):
        print(f"  ⚠️  章末不是验证节，跳过: {name} | {heads[-1].group() if heads else '无标题'}")
        continue
    write(name, t[: heads[-1].start()] + NEW_SECTION)
    replaced += 1

print(f"=== 章末自检表替换：{replaced} 章（已处理 {skipped} 章） ===")

# ---------------------------------------------------- 标题级神经化措辞
TITLE_SUBS = [
    ("第21章-双环演进实操入门.md",
     "## 四、跨族镜像「借假修真」的三步神经机制:强制接地、延迟决策、镜像练习",
     "## 四、跨族镜像「借假修真」的三步行为练习:强制接地、延迟决策、镜像练习"),
    ("第23章-二阶跨族镜像对标手册.md",
     "## 二、亲密关系潜台词翻译器:20 组吵架台词 + 神经机制",
     "## 二、亲密关系潜台词翻译器:20 组吵架台词 + 换位解读"),
]
for name, old, new in TITLE_SUBS:
    ok = sub(name, old, new, f"{name} 标题")
    print(("  ✅ " if ok else "  ❌ ") + name + " 标题")

# 第 23 章四个象限小标题
p23 = "第23章-二阶跨族镜像对标手册.md"
t = read(p23)
n = 0
t2, n = re.subn(r"(?m)^(### 第[一二三四]象限:[^\n]*?)——神经回路最匹配:", r"\1——常见组合:", t)
if n:
    write(p23, t2)
print(f"  ✅ {p23} 象限小标题：{n} 处")

# --------------------------------------- 第 19 章无出处神经影像/研究者断言
C19 = "第19章-ESTP-局面拆弹手.md"


def line_replace(name: str, prefix: str, new: str, label: str) -> bool:
    t = read(name)
    if new in t:
        return True
    pat = re.compile(r"(?m)^" + re.escape(prefix) + r".*$")
    t2, n = pat.subn(lambda _m: new, t, count=1)
    if n == 0:
        print(f"  ⚠️  整行未命中: {label}")
        return False
    write(name, t2)
    return True


ok = line_replace(
    C19,
    "压住它的东西，是主导功能 **Se（外倾实感）**",
    '压住它的东西，是主导功能 **Se（外倾实感）**。它不是一个"反应快"这么笼统的词。'
    '用本书的比喻来说，Se 更像一套"此刻什么最值得注意"的现场扫描：当抢救室的三台监护仪同时报警，'
    "很多人会本能地收窄视野、优先处理最刺耳的那一个信号；而韩锋反而把通道全部打开"
    "——他同时听见三个心率、看见三张脸的血色、闻到柴油和消毒水如何在空气里分层。"
    "压力没有让他变慢，反而让他更专注，这是 ESTP 最容易被误读的一种反应方式："
    "**危机不是他的敌人，危机是他的开关。** 以上只是帮助理解行为差异的描写，不是脑成像结论。",
    "第19章 神经影像研究断言",
)
print(("  ✅ " if ok else "  ❌ ") + "第19章 神经影像研究断言降级")

ok = line_replace(
    C19,
    "研究者倾向于把这种体质追溯到",
    '有人会把这种反应解释成"对刺激的阈值偏高"——通俗地说，普通人在电影院看一场爆炸戏就会心跳加速，'
    '而他要站到真正的火场边缘，才觉得"这回是真事"。这只是本书为叙事方便打的比方，'
    "不对应任何受体、激素或可测量的生理指标，也别把它当成对某个人的诊断。"
    "真到了要命的时刻，别人已经手忙脚乱，他反而更容易进入状态——这是场景里的观察，不是生理定律。",
    "第19章 研究者断言",
)
print(("  ✅ " if ok else "  ❌ ") + "第19章 研究者断言降级")

# 同章另外两段脑区归因：只改归因句，保留后半段叙事
for old, new in [
    ("它对应的回路是**背外侧前额叶（DLPFC）**与**顶叶**的空间—数量运算区，但在 ESTP 身上，它很少以",
     "本书只把它当作一种描述习惯的说法，不对应任何具体脑区；在 ESTP 身上，它很少以"),
    ("它由**颞顶联合区（TPJ）**与镜像神经元系统支撑，让韩锋在抢救室里不只是看见",
     "用本书的比喻来说，它让韩锋在抢救室里不只是看见"),
]:
    sub(C19, old, new, "第19章 脑区归因句")

# ------------------------ 跨章悬空引用与虚构数字（出版前最后一轮）
TAIL_SUBS = [
    ("第21章-双环演进实操入门.md",
     '> - 不能证明：相近型与互补型对应不同脑区、练习会改变灰质密度、或存在"三到五倍"的速度差。',
     '> - 不能证明：相近型与互补型对应不同脑区、练习会改变灰质密度、或存在任何固定的速度倍数。'),
    ("第24章-30天微行为重塑计划.md",
     "> - 不能证明：21 天 / 30 天自动化阈值、90 天人格跃迁、任何神经回路改造时间表。",
     "> - 不能证明：21 天 / 30 天自动化阈值、固定天数的人格跃迁承诺、任何神经改造时间表。"),
    ("第24章-30天微行为重塑计划.md",
     "读第 21 章的阻尼不对称定律,",
     "读第 21 章关于「切换难度不同」的那一节,"),
    ("04-参考文献.md",
     "初稿中「600 名 INFJ」「四种神经聚类」「重复验证」等表述已在出版前审校中删除。",
     "初稿中把 EEG 探索写成大样本、已成定论的分类学表述，已在出版前审校中删除。"),
]
for name, old, new in TAIL_SUBS:
    sub(name, old, new, f"{name} 悬空引用/虚构数字")
print(f"  ✅ 跨章悬空引用与虚构数字：{len(TAIL_SUBS)} 条规则")

# ------------------------------------------------------------------ 终检
print("\n=== 终检 ===")
left_selfcheck = []
left_science = []
for p in sorted(ROOT.rglob("*.md")):
    if "00-总控" in str(p) or "99-附件" in str(p) or "07-卷末" in str(p) or "完整定稿" in p.name:
        continue
    t = p.read_text(encoding="utf-8")
    for i, l in enumerate(t.splitlines(), 1):
        if re.search(r"\|\s*神经科学(?:铁律)?\s*\||防偏铁律|验证完成", l):
            left_selfcheck.append(f"{p.name}:{i}")
        if re.search(r"神经影像研究|研究者倾向于|准确映射", l):
            left_science.append(f"{p.name}:{i}")
print(f"  自检表残留: {len(left_selfcheck)} {left_selfcheck[:5]}")
print(f"  无出处科学断言残留: {len(left_science)} {left_science[:5]}")
print(f"  图鉴章『## 本章核对』: {sum('## 本章核对' in FILES[n].read_text(encoding='utf-8') for n in FILES if re.match(r'第(0[5-9]|1\d|20)章', n))} 章")
