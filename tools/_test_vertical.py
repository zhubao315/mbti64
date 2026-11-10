#!/usr/bin/env python3
"""快速竖版 framing 测试：4 张 1024x1280 + 4 张 1080x1920"""
import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1] / "tools"))
import gen_derived as gd

OUT = __import__("pathlib").Path("d:/Zhu_Bao/zhubao/02-BUILD/24-项目支持/64personalities-cn/public/assets/portraits")

test_codes = ["INTJ-A-O", "ENFP-A-O", "ISTP-A-O", "ISFJ-A-O"]
for code in test_codes:
    prompt_45 = gd.vertical_prompt(code, "4:5")
    raw = gd.call_api(prompt_45, "1024x1280")
    dst = OUT / f"test-{code}-1024x1280.png"
    dst.write_bytes(raw)
    print(f"✓ 4:5 {code}: {len(raw)//1024} KB")

for code in test_codes:
    prompt_916 = gd.vertical_prompt(code, "9:16")
    raw = gd.call_api(prompt_916, "1080x1920")
    dst = OUT / f"test-{code}-1080x1920.png"
    dst.write_bytes(raw)
    print(f"✓ 9:16 {code}: {len(raw)//1024} KB")
