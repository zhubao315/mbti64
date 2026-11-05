#!/usr/bin/env python3
"""Batch generator for Solar-Poly 64 light-mode portraits (thumb-512 + hero-1200x1600).

Reads prompts_light.json. Generates both sizes per (prototype, suffix) pair.
Uses same GGUF workflow as batch_gen.py but passes negative_prompt and varied sizes.
"""
import json, urllib.request, urllib.error, urllib.parse, time, sys, os, random

COMFY = "http://192.168.1.3:18188"
THUMB_DIR = r"D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn\public\assets\portraits-light\thumb-512"
HERO_DIR = r"D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn\public\assets\portraits-light\hero-1200x1600"
PROMPTS_FILE = os.path.join(os.path.dirname(__file__), "prompts_light.json")
SEEDS_FILE = os.path.join(os.path.dirname(__file__), "seeds_light.json")

os.makedirs(THUMB_DIR, exist_ok=True)
os.makedirs(HERO_DIR, exist_ok=True)

def build_workflow(prompt, negative, width, height, seed):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "qwen-image-2.1-Q8_0.gguf"}},
        "2": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "qwen3vl_8b_int8_convrot.safetensors",
            "type": "qwen_image"
        }},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
        "4": {"class_type": "TextEncodeQwenImage21", "inputs": {
            "clip": ["2", 0],
            "prompt": prompt,
            "negative_prompt": negative,
            "resolution": max(1024, (width // 32) * 32),
            "images": []
        }},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "seed": seed, "steps": 25, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple",
            "positive": ["4", 0], "negative": ["4", 1],
            "latent_image": ["5", 0], "denoise": 1.0
        }},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["3", 0]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "sol"}}
    }

def submit(wf):
    payload = json.dumps({"prompt": wf, "client_id": "batch_light"}).encode()
    req = urllib.request.Request(f"{COMFY}/prompt", data=payload, headers={"Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  HTTP {e.code}: {body[:300]}", file=sys.stderr)
        return None

def wait(pid, max_wait=900):
    t0 = time.time()
    while time.time() - t0 < max_wait:
        try:
            r = urllib.request.urlopen(f"{COMFY}/history/{pid}", timeout=10)
            hist = json.loads(r.read())
            if pid in hist:
                s = hist[pid].get("status", {})
                if s.get("status_str") == "error": return hist[pid]
                if s.get("completed") or "outputs" in hist[pid]: return hist[pid]
        except Exception:
            pass
        time.sleep(3)
    return None

def download_and_rename(filename, subfolder, out_dir, out_name):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    url = f"{COMFY}/view?{params}"
    tmp = os.path.join(out_dir, f"_tmp_{os.path.basename(filename)}")
    urllib.request.urlretrieve(url, tmp)
    final = os.path.join(out_dir, out_name)
    if os.path.exists(final): os.remove(final)
    os.rename(tmp, final)
    return final

def one(entry, variant, out_dir, seed):
    wf = build_workflow(entry["prompt"], entry.get("negative", ""),
                        variant["width"], variant["height"], seed)
    t0 = time.time()
    r = submit(wf)
    if not r: return False
    pid = r.get("prompt_id")
    if not pid: return False
    hist = wait(pid)
    if not hist: return False
    if hist.get("status", {}).get("status_str") == "error":
        print(f"  error: {hist.get('status',{})}", file=sys.stderr); return False
    for nid, out in hist.get("outputs", {}).items():
        if "images" in out:
            for img in out["images"]:
                path = download_and_rename(img["filename"], img.get("subfolder",""), out_dir, variant["filename"])
                kb = os.path.getsize(path) / 1024
                print(f"    OK {variant['filename']} {kb:.0f}KB {time.time()-t0:.0f}s", flush=True)
                return True
    print(f"    no images", file=sys.stderr); return False

def load_seeds(needed_codes):
    if os.path.exists(SEEDS_FILE):
        with open(SEEDS_FILE) as f:
            s = json.load(f)
    else:
        s = {}
    # fill missing
    changed = False
    for c in needed_codes:
        if c not in s:
            s[c] = random.randint(0, 2**30)
            changed = True
    if changed:
        with open(SEEDS_FILE, "w") as f:
            json.dump(s, f, indent=2)
    return s

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="single prototype e.g. INFJ")
    ap.add_argument("--suffix", help="single suffix e.g. A-O")
    ap.add_argument("--variant", choices=["thumb","hero","both"], default="both")
    args = ap.parse_args()

    with open(PROMPTS_FILE, encoding="utf-8") as f:
        data = json.load(f)

    scope = [d for d in data
             if (not args.only or d["prototype"] == args.only)
             and (not args.suffix or d["suffix"] == args.suffix)]

    # Each prototype needs a seed; thumb-512 and hero-1200x1600 of same (proto+suffix) share seed
    proto_codes = sorted({d["prototype"] for d in scope})
    seeds = load_seeds(proto_codes)
    print(f"Targets: {len(scope)} entries, variants={args.variant}")

    done = fail = 0
    total = len(scope) * (1 if args.variant != "both" else 2)
    idx = 0

    for d in scope:
        proto = d["prototype"]
        suf = d["suffix"]
        seed = seeds[proto]

        variants = []
        if args.variant in ("thumb", "both"):
            variants.append(("thumb", d["thumb"], THUMB_DIR))
        if args.variant in ("hero", "both"):
            variants.append(("hero", d["hero"], HERO_DIR))

        for vname, v, out_dir in variants:
            idx += 1
            full_code = f"{proto}-{suf}"
            out_file = os.path.join(out_dir, v["filename"])
            if os.path.exists(out_file) and os.path.getsize(out_file) > 102400:
                print(f"[{idx}/{total}] SKIP {full_code} {vname}")
                done += 1; continue
            print(f"[{idx}/{total}] GEN {full_code} {vname} {v['width']}x{v['height']}", flush=True)
            ok = one(v, v, out_dir, seed)
            if ok: done += 1
            else: fail += 1
            time.sleep(1)

    print(f"\n=== Done: {done} ok, {fail} failed ===")

if __name__ == "__main__":
    main()
