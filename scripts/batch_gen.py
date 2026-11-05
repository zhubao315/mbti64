#!/usr/bin/env python3
"""Batch generator for all 64 Neo-Poly personality portraits.

Strategy:
  - 16 base prototypes, each gets one anchor seed from A-O variant
  - 4 suffix variants of same base share that seed for consistent face/costume
  - 1024x1024 output, raw PNG for post-processing pipeline

Usage:
  python3 batch_gen.py                  # generate everything
  python3 batch_gen.py --only INTJ      # one prototype, all 4 suffixes
  python3 batch_gen.py --only INTJ --seeds 123456  # reuse specific seed
"""
import json, urllib.request, urllib.error, urllib.parse, time, sys, os, random, argparse

COMFY = "http://192.168.1.3:18188"
OUTPUT_DIR = r"D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn\public\assets\portraits"
PROMPTS_FILE = os.path.join(os.path.dirname(__file__), "prompts.json")
SEEDS_FILE = os.path.join(os.path.dirname(__file__), "seeds.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------- workflow ----------------
def build_workflow(prompt, width=1024, height=1024, seed=0):
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
            "negative_prompt": "",
            "resolution": 1024,
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
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "poly"}}
    }

def submit(wf):
    payload = json.dumps({"prompt": wf, "client_id": "batch_gen"}).encode()
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

def one(prompt, out_name, seed, width=1024, height=1024):
    wf = build_workflow(prompt, width, height, seed)
    t0 = time.time()
    r = submit(wf)
    if not r: return False, seed
    pid = r.get("prompt_id")
    if not pid: return False, seed
    print(f"    pid={pid} seed={seed}", flush=True)
    hist = wait(pid)
    if not hist: return False, seed
    if hist.get("status", {}).get("status_str") == "error":
        print(f"    error: {hist.get('status',{})}", file=sys.stderr); return False, seed
    for nid, out in hist.get("outputs", {}).items():
        if "images" in out:
            for img in out["images"]:
                path = download_and_rename(img["filename"], img.get("subfolder",""), OUTPUT_DIR, out_name)
                secs = time.time() - t0
                kb = os.path.getsize(path) / 1024
                print(f"    OK {out_name} {kb:.0f}KB {secs:.0f}s", flush=True)
                return True, seed
    print(f"    no images", file=sys.stderr); return False, seed

# ---------------- main ----------------
def load_or_init_seeds(prototypes, seed_file):
    if os.path.exists(seed_file):
        with open(seed_file, "r") as f:
            return json.load(f)
    seeds = {p: random.randint(0, 2**30) for p in prototypes}
    with open(seed_file, "w") as f:
        json.dump(seeds, f, indent=2)
    return seeds

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="generate one base prototype (e.g. INTJ)")
    ap.add_argument("--seed-file", default=SEEDS_FILE)
    args = ap.parse_args()

    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        all_prompts = json.load(f)

    # determine scope
    if args.only:
        scope = [args.only]
    else:
        scope = sorted({p["prototype"] for p in all_prompts})

    seeds = load_or_init_seeds(scope, args.seed_file)
    print(f"Targets: {len(scope)} prototypes, seeds loaded")
    for p, s in seeds.items():
        print(f"  {p}: seed={s}")

    todo = [p for p in all_prompts if p["prototype"] in scope]
    print(f"\nTotal images to generate: {len(todo)}")

    done = fail = 0
    for i, entry in enumerate(todo):
        code = entry["code"]
        proto = entry["prototype"]
        seed = seeds.get(proto, random.randint(0, 2**30))
        out_name = f"{code}.png"
        # skip if already exists and looks valid (>100KB = not a leftover placeholder)
        full = os.path.join(OUTPUT_DIR, out_name)
        if os.path.exists(full) and os.path.getsize(full) > 102400:
            print(f"[{i+1}/{len(todo)}] SKIP exists {out_name}")
            done += 1; continue
        print(f"[{i+1}/{len(todo)}] GEN {code} ({entry['group_cn']}·{entry['title_cn']}·{entry['season_cn']})", flush=True)
        ok, _ = one(entry["prompt"], out_name, seed)
        if ok: done += 1
        else:
            fail += 1
            print(f"  FAILED {code}", file=sys.stderr)
        # brief cooldown
        time.sleep(1)

    print(f"\n=== Done: {done} ok, {fail} failed ===")

if __name__ == "__main__":
    main()
