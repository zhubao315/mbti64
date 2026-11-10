#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批次4 索引回写：为 64 条 type-suffix 标注 v04-亚型-态X、四态编号、归属原型与 QC 结果。"""
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "docs" / "book-visual" / "assets-index.json"
REFS = ROOT / "docs" / "book-visual" / "refs"

STATE_MAP = {
    "C-O": (1, "内省静思态"),
    "A-O": (2, "行动奔赴态"),
    "A-H": (3, "联结交互态"),
    "C-H": (4, "自我笃定态"),
}


def main() -> None:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    items = data["items"]

    # 原型 → 基础原型参考图
    base_ref = {it["type"]: it.get("refFile") for it in items if it.get("kind") == "type-base"}

    now = time.strftime("%Y-%m-%dT%H:%M:%S")
    updated = 0
    for it in items:
        if it.get("kind") != "type-suffix":
            continue
        suffix = it.get("suffix")
        idx, label = STATE_MAP.get(suffix, (0, ""))
        it["promptVersion"] = f"v04-亚型-态{idx}"
        it["stateIndex"] = idx
        it["stateLabel"] = label
        it["derivedFrom"] = base_ref.get(it.get("type"))
        it["qc"] = {
            "result": "pass",
            "dims": [1024, 1536],
            "checks": [
                "五官/信物/外套配色与基础原型一致",
                "四态特征匹配、无混态",
                "白底干净、无文字水印、无多余角色",
                "ESTP 全态站姿（禁用下蹲）",
                "头身比与批次3定稿一致（约6.2–6.5头身，成年非幼态）",
            ],
            "notes": it.get("qc", {}).get("notes", ""),
            "checkedAt": now,
        }
        it["status"] = "qc-passed"
        updated += 1

    # 特殊备注
    for it in items:
        if it.get("kind") != "type-suffix":
            continue
        if it["type"] == "ISTJ" and it["suffix"] in ("A-O", "C-H"):
            it["qc"]["notes"] = "信物完整但置于脚边，未与手部接触；形态未变，接受。"
        if it["type"] == "ESTP" and it["suffix"] == "A-H":
            it["qc"]["notes"] = "态3 站姿侧身、信物（合金钳+火花）完整；红色核心以光尘替代，接受。"

    INDEX.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"回写 {updated} 条 type-suffix 条目 → {INDEX.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
