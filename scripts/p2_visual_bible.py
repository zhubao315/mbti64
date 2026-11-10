#!/usr/bin/env python3
"""P2 · 视觉圣经口径同步（幂等，固定 LF）

把 P0/P1 已确立的新书名、新维度名与证据边界写回视觉规范，
避免后续按旧规范生成带「脑神经亚型」字样的装帧物料。
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "docs" / "book-visual" / "01-视觉圣经.md"

RULES: list[tuple[str, str, str]] = [
    (
        "拓扑线去医学化",
        "细金属神经拓扑线",
        "细金属拓扑线",
    ),
    (
        "稀有度边界",
        "稀有度只表达分布与生态位，不表达等级优越",
        "稀有度只表达模型内相对次序与位置差异，不表达等级优越或真实人口分布",
    ),
    (
        "四态不是生命阶段（标题）",
        "## 4. 四种后缀的视觉状态（同一角色的四种生命阶段）",
        "## 4. 四种后缀的视觉状态（同一角色的四种调节状态）",
    ),
    (
        "四态不是生命阶段（正文）",
        "16 个角色 × 4 种生命状态",
        "16 个角色 × 4 种调节状态",
    ),
    (
        "色彩 token 名称",
        "| `metal-line` | 神经拓扑线 |",
        "| `metal-line` | 拓扑细线 |",
    ),
    (
        "新副标题",
        "| 副标题 | 64 型人格认知模型与脑神经亚型全书 | 深灰，字号约主标题 0.38 |",
        "| 副标题 | 从16型到64型：人格画像、差异理解与成长练习 | 深灰，字号约主标题 0.38；过长时折两行，不缩到不可读 |",
    ),
    (
        "证据边界（视觉侧）",
        '| "脑神经"处理 | 不用医学影像语言 | 用神经拓扑细线与节点，不用扫描图、不用脑解剖 |',
        "| 证据边界（视觉侧） | 图形不承载科学证据含义 | 只用几何拓扑细线与节点作装饰；不用脑解剖、脑成像、EEG 分型或任何医学影像语言 |",
    ),
    (
        "英文品牌标识与作者",
        "| 作者/出版 | 作者名、出版社标识 | 置于底部 12% 安全区 |",
        "| 英文品牌标识 | 64 PERSONALITIES · ONE UNIQUE YOU | 小字置于主标题下方，字距拉开，不参与主视觉竞争 |\n"
        "| 作者/出版 | 朱宝 / 出版社标识 | 置于底部 12% 安全区 |",
    ),
    (
        "图注禁止项补足",
        "6. 不出现：真人照片、写实场景、写实大脑、恐怖神经元、水印、随机 logo、随机英文标题、多余角色、无意义装饰。",
        "6. 不出现：真人照片、写实场景、写实大脑、恐怖神经元、水印、随机 logo、随机英文标题、多余角色、无意义装饰；"
        "亦不出现「脑区激活」「神经亚型」「EEG 分型」「真实人口占比」「已被科学证明」等表述。",
    ),
]


def main() -> int:
    if not TARGET.exists():
        print(f"❌ 找不到 {TARGET}")
        return 1
    text = TARGET.read_text(encoding="utf-8")
    applied = 0
    for label, old, new in RULES:
        if old in text:
            text = text.replace(old, new, 1)
            applied += 1
            print(f"  ✅ {label}")
        elif new in text:
            print(f"  ⏭️  {label}（已应用）")
        else:
            print(f"  ⚠️  {label}（未命中，请人工核对）")
    TARGET.write_bytes(text.encode("utf-8"))  # 固定 LF
    print(f"\n视觉圣经口径同步完成：本轮 {applied} 处改写，旧副标题残留 "
          f"{text.count('脑神经亚型全书')} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
