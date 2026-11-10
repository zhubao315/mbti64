#!/usr/bin/env python3
"""Native GGUF workflow for qwen-image-2.1 — batch generator.

FIX: use CLIPLoader (safetensors), NOT CLIPLoaderGGUF. Negative prompt must be EMPTY.
"""
import json, urllib.request, urllib.error, urllib.parse, time, sys, os, random

COMFY = "http://192.168.1.3:18188"
OUTPUT_DIR = r"D:\Zhu_Bao\zhubao\02-BUILD\24-项目支持\64personalities-cn\docs\试做图"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Per spec: negative prompt MUST be empty for this model
NEG_EMPTY = ""

def build_workflow(prompt, width=1024, height=1024, seed=None, steps=25, cfg=1.0):
    if seed is None:
        seed = random.randint(0, 2**30)
    w = {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "qwen-image-2.1-Q8_0.gguf"}},
        "2": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "qwen3vl_8b_int8_convrot.safetensors",
            "type": "qwen_image"
        }},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
        "4": {"class_type": "TextEncodeQwenImage21", "inputs": {
            "clip": ["2", 0],
            "prompt": prompt,
            "negative_prompt": NEG_EMPTY,
            "resolution": 1024,
            "images": []
        }},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0],
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": "euler",
            "scheduler": "simple",
            "positive": ["4", 0],
            "negative": ["4", 1],
            "latent_image": ["5", 0],
            "denoise": 1.0
        }},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["3", 0]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "neo"}}
    }
    return w, seed

def submit(workflow):
    payload = json.dumps({"prompt": workflow, "client_id": "batch"}).encode()
    req = urllib.request.Request(f"{COMFY}/prompt", data=payload, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"HTTP {e.code}: {body[:400]}", file=sys.stderr)
        return None

def wait_prompt(pid, max_wait=900):
    start = time.time()
    while time.time() - start < max_wait:
        try:
            r = urllib.request.urlopen(f"{COMFY}/history/{pid}", timeout=10)
            hist = json.loads(r.read())
            if pid in hist:
                s = hist[pid].get("status", {})
                if s.get("status_str") == "error":
                    return hist[pid]
                if s.get("completed") or "outputs" in hist[pid]:
                    return hist[pid]
        except Exception:
            pass
        time.sleep(3)
    return None

def download_and_rename(filename, subfolder, out_dir, out_name):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    url = f"{COMFY}/view?{params}"
    tmp = os.path.join(out_dir, f"_tmp_{filename}")
    urllib.request.urlretrieve(url, tmp)
    final = os.path.join(out_dir, out_name)
    if os.path.exists(final):
        os.remove(final)
    os.rename(tmp, final)
    return final

def generate(prompt, out_name, seed=None, width=1024, height=1024):
    wf, seed = build_workflow(prompt, width, height, seed)
    print(f"[GEN] seed={seed} {width}x{height} -> {out_name}")
    result = submit(wf)
    if not result:
        print("  submit fail"); return None, seed
    pid = result.get("prompt_id")
    if not pid:
        print(f"  no pid: {result}"); return None, seed
    print(f"  pid={pid} waiting...")
    hist = wait_prompt(pid)
    if not hist:
        print("  timeout"); return None, seed
    if hist.get("status", {}).get("status_str") == "error":
        print(f"  error: {hist.get('status',{})}"); return None, seed
    for nid, out in hist.get("outputs", {}).items():
        if "images" in out:
            for img in out["images"]:
                path = download_and_rename(img["filename"], img.get("subfolder",""), OUTPUT_DIR, out_name)
                kb = os.path.getsize(path) / 1024
                print(f"  OK {path} ({kb:.0f}KB)")
                return path, seed
    print(f"  no images. outputs={list(hist.get('outputs',{}).keys())}"); return None, seed

if __name__ == "__main__":
    test = """「棱镜心智 Neo-Poly 64」AI时代几何矢量卡通人物IP，对应人格类型「INTJ-A-O 冷焰策士·盛夏破局态」，中性偏青年形象，五官采用极简几何切面与灵动点状眼眸设计，面部由干净利落的多边形低多边形色块折面构成，无写实毛孔。
身着结构硬朗、高立领设计的暗紫色与炭黑几何切面长风衣；单手虚托一枚悬浮的半透明磨砂玻璃国际象棋战车多面体棋子，棋子下方延展出全息网格推演路径，底座升腾着冷冽的紫蓝色几何折面冷焰。
角色昂首直视前方，双肩带有棱角分明的发光几何肩甲；身后向外呈放射状飞散出大量动态的多巴胺发光三角形碎片与向前破壁的光束箭头，风衣下摆扬起；右上角悬浮一枚极简发光几何角标「A-O」。
16personalities经典扁平几何折面插画风格的AI时代升级版Neo-Geometric Vector与2.5D Translucent Glassmorphism结合，硬边几何矢量切面结合局部半透明磨砂毛玻璃材质与发光神经元网络线条，边缘锐利干净，大师级UI角色卡牌构图，半身至全身居中。
主色调采用星云紫与深空靛蓝，搭配深邃太空暗夜蓝极简纯色背景，柔和的体积光与边缘轮廓高光，8K超高清矢量渲染质感。"""
    generate(test, "NEO_INTJ-A-O_v2.png")
