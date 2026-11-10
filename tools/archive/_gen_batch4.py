#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批次4 · 64 亚型卡生成器（ComfyUI 原生 Qwen-Image-2.1 + 原型级 seed 锁定）

提示词唯一事实源：docs/book-visual/06-批次4-亚型卡提示词.md
输出：docs/book-visual/refs/<ID>.png

用法：
  python tools/_gen_batch4.py --group NT          # 整组 16 张
  python tools/_gen_batch4.py --only 02_05_INTJ-C-O_suffix_v01,...
  python tools/_gen_batch4.py --group NT --force  # 覆盖重出
  python tools/_gen_batch4.py --dry               # 只解析
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "docs" / "book-visual" / "06-批次4-亚型卡提示词.md"
OUT = ROOT / "docs" / "book-visual" / "refs"
SEED_FILE = OUT / "_seeds_batch4.json"
LOG_FILE = OUT / "_gen_log_batch4.json"

COMFY = os.environ.get("SOLARPOLY_COMFY", "http://192.168.1.3:18188")
TIMEOUT = int(os.environ.get("SOLARPOLY_TIMEOUT_S", "900"))

GROUP_BY_PREFIX = {
    "02_05": "NT", "02_06": "NT", "02_07": "NT", "02_08": "NT",
    "03_09": "NF", "03_10": "NF", "03_11": "NF", "03_12": "NF",
    "04_13": "SJ", "04_14": "SJ", "04_15": "SJ", "04_16": "SJ",
    "05_17": "SP", "05_18": "SP", "05_19": "SP", "05_20": "SP",
}

RE_BLOCK = re.compile(
    r"```prompt\s+([^|\n]+?)\s*\|\s*(\d+x\d+)\s*\|\s*([^\n]+?)\s*\n([\s\S]*?)```"
)


def parse_spec() -> list[dict]:
    md = SPEC.read_text(encoding="utf-8")
    items = []
    for m in RE_BLOCK.finditer(md):
        ident, size, file, prompt = m.group(1).strip(), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
        w, h = (int(x) for x in size.split("x"))
        prefix = ident.split("_", 2)[0] + "_" + ident.split("_", 2)[1]
        proto = ident.split("_")[2].split("-")[0]
        state = ident.split("-")[1] if "-" in ident else ""
        items.append({
            "id": ident, "file": file, "width": w, "height": h,
            "prompt": prompt, "group": GROUP_BY_PREFIX.get(prefix, "?"),
            "prototype": proto, "state": state, "size": size,
        })
    return items


def load_seeds(items: list[dict]) -> dict[str, int]:
    seeds: dict[str, int] = {}
    if SEED_FILE.exists():
        seeds = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    changed = False
    for it in items:
        if it["prototype"] not in seeds:
            seeds[it["prototype"]] = random.randint(0, 2 ** 30)
            changed = True
    if changed:
        SEED_FILE.write_text(json.dumps(dict(sorted(seeds.items())), indent=2, ensure_ascii=False), encoding="utf-8")
    return seeds


def build_workflow(prompt: str, w: int, h: int, seed: int) -> dict:
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "qwen-image-2.1-Q8_0.gguf"}},
        "2": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "qwen3vl_8b_int8_convrot.safetensors", "type": "qwen_image"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
        "4": {"class_type": "TextEncodeQwenImage21", "inputs": {
            "clip": ["2", 0], "prompt": prompt, "negative_prompt": "",
            "resolution": 1024, "images": []}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "6": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "seed": seed, "steps": 25, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple",
            "positive": ["4", 0], "negative": ["4", 1],
            "latent_image": ["5", 0], "denoise": 1.0}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["3", 0]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "b4"}},
    }


def submit(wf: dict) -> str | None:
    payload = json.dumps({"prompt": wf, "client_id": "batch4"}).encode("utf-8")
    req = urllib.request.Request(f"{COMFY}/prompt", data=payload,
                                 headers={"Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read()).get("prompt_id")
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"    HTTP {e.code}: {body[:300]}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"    submit error: {e}", file=sys.stderr)
        return None


def wait_history(pid: str) -> dict | None:
    t0 = time.time()
    while time.time() - t0 < TIMEOUT:
        try:
            hist = json.loads(urllib.request.urlopen(f"{COMFY}/history/{pid}", timeout=10).read())
            if pid in hist:
                st = hist[pid].get("status", {})
                if st.get("status_str") == "error":
                    return hist[pid]
                if st.get("completed") or "outputs" in hist[pid]:
                    return hist[pid]
        except Exception:
            pass
        time.sleep(3)
    return None


def fetch_image(hist: dict, dst: Path) -> bool:
    for _, node_out in hist.get("outputs", {}).items():
        for img in node_out.get("images", []):
            params = urllib.parse.urlencode({
                "filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": "output"})
            tmp = dst.with_name("_tmp_" + dst.name)
            urllib.request.urlretrieve(f"{COMFY}/view?{params}", tmp)
            if dst.exists():
                dst.unlink()
            tmp.rename(dst)
            return True
    return False


def png_dim(path: Path) -> tuple[int, int] | None:
    with open(path, "rb") as f:
        head = f.read(24)
    if len(head) < 24 or head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")


def generate_one(item: dict, seed: int, force: bool) -> dict:
    dst = OUT / item["file"]
    if not force and dst.exists():
        dim = png_dim(dst)
        return {"id": item["id"], "skipped": True, "file": item["file"],
                "dim": dim, "seed": seed, "ok": True}
    wf = build_workflow(item["prompt"], item["width"], item["height"], seed)
    t0 = time.time()
    pid = submit(wf)
    if not pid:
        return {"id": item["id"], "file": item["file"], "ok": False, "error": "submit failed", "seed": seed}
    hist = wait_history(pid)
    if not hist:
        return {"id": item["id"], "file": item["file"], "ok": False, "error": "timeout", "seed": seed}
    if hist.get("status", {}).get("status_str") == "error":
        return {"id": item["id"], "file": item["file"], "ok": False, "error": "workflow error", "seed": seed}
    if not fetch_image(hist, dst):
        return {"id": item["id"], "file": item["file"], "ok": False, "error": "no image", "seed": seed}
    dim = png_dim(dst)
    return {"id": item["id"], "file": item["file"], "ok": True, "dim": dim,
            "sizeMatches": dim == (item["width"], item["height"]) if dim else None,
            "bytes": dst.stat().st_size, "seconds": round(time.time() - t0, 1), "seed": seed}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--group", choices=["NT", "NF", "SJ", "SP"])
    ap.add_argument("--only", help="逗号分隔 ID")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    all_items = parse_spec()
    if len(all_items) != 64:
        print(f"⚠ 解析到 {len(all_items)} 个 prompt 块（预期 64），请检查文档格式", file=sys.stderr)

    items = all_items
    if args.group:
        items = [i for i in items if i["group"] == args.group]
    if args.only:
        want = {s.strip() for s in args.only.split(",") if s.strip()}
        items = [i for i in items if i["id"] in want]

    if not items:
        print("没有匹配的任务项", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    seeds = load_seeds(all_items)

    print(f"任务 {len(items)} 张 | 通道 {COMFY}")
    for it in items:
        print(f"  {it['id']} | {it['size']} | {it['group']} | {it['prototype']} | seed={seeds[it['prototype']]}")
    if args.dry:
        return 0

    report = []
    for idx, it in enumerate(items, 1):
        print(f"[{idx}/{len(items)}] {it['id']} ...", flush=True)
        r = generate_one(it, seeds[it["prototype"]], args.force)
        report.append(r)
        if r.get("ok"):
            tag = "skip" if r.get("skipped") else f"{r.get('dim')} {r.get('bytes', 0)//1024}KB {r.get('seconds')}s"
            print(f"  ok {tag}" + ("  ⚠尺寸不符" if r.get("sizeMatches") is False else ""))
        else:
            print(f"  FAIL {r.get('error')}", file=sys.stderr)

    prev = json.loads(LOG_FILE.read_text(encoding="utf-8")) if LOG_FILE.exists() else []
    prev.append({"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "group": args.group, "items": report})
    LOG_FILE.write_text(json.dumps(prev, indent=2, ensure_ascii=False), encoding="utf-8")

    failed = [r for r in report if not r.get("ok")]
    ok_n = len(report) - len(failed)
    print(f"\n完成：成功 {ok_n} / {len(report)}" + (f"，失败：{', '.join(r['file'] for r in failed)}" if failed else ""))
    return 2 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
