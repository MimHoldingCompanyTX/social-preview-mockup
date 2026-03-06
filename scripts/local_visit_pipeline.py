#!/usr/bin/env python3
"""Local Initial Visit Notes Pipeline for any common image formats (jpg/jpeg/png/heic/gif/bmp)."""
import base64, json, requests, os, glob, hashlib, time, sys
FOLDER = os.path.expanduser("~/Desktop/chip_bath")
CACHE_FILE = os.path.join(FOLDER, ".image_cache.json")
VISION_MODEL = "llava-llama3:latest"
TEXT_MODEL = "llama3.2:3b"
OLLAMA = "http://localhost:11434/api/generate"
TIMEOUT = 600

def md5(path):
    import hashlib
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b"" ** 2):
            h.update(chunk)
    return h.hexdigest()

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

def next_version():
    existing = glob.glob(os.path.join(FOLDER, "client_notes_ver_*.md"))
    nums = []
    for p in existing:
        base = os.path.basename(p)
        try:
            n = int(base.replace("client_notes_ver_", "").replace(".md", ""))
            nums.append(n)
        except: pass
    return max(nums) + 1 if nums else 1

def ext_list():
    exts = ["jpg","jpeg","png","gif","heic","bmp"]
    return [f"*.{e}" for e in exts]

def find_images(folder):
    imgs = []
    for mask in ext_list():
        imgs.extend(glob.glob(os.path.join(folder, mask)))
    return sorted(imgs)

def extract_features(img_path, img_b64):
    prompt = """Describe every visible detail in this bathroom image for an interior designer. Be explicit about colors, materials and condition; only what is visible.

"""
    resp = None
    try:
        resp = requests.post(OLLAMA, json={"model": VISION_MODEL, "prompt": prompt, "images": [img_b64], "stream": False}, timeout=TIMEOUT)
    except Exception as e:
        return f"[FAILED: {e}]"
    if not resp or resp.status_code != 200:
        return f"[FAILED: HTTP {resp.status_code if resp else 'no-response'}]"
    text = resp.json().get("response", "").strip()
    return text if text else "[FAILED: empty response]"

def generate_notes(all_features):
    combined = "\n".join([f"--- Photo {i+1}: {name} ---\n{feat}" for i,(name,feat) in enumerate(all_features)])
    prompt = f"""You are Designer. You received {len(all_features)} photos. Produce a detailed, local-note draft in the exact structure:

# Client Visit Notes — Chip, Initial Visit
**Date:** 2026-02-28
**Designer:** Designer

---

## Room: Bathroom

## Dimensions
Estimated

## Observations

{combined}

## Address (approx)
Include approximate address if GPS data can be inferred from EXIF, otherwise omit.

## Mood Board Direction
3-5 vibes

## Color Palette
4-6 colors with hex codes

## Next Steps
Action items

"""

    resp = requests.post(OLLAMA, json={"model": TEXT_MODEL, "prompt": prompt, "stream": False}, timeout=TIMEOUT)
    if resp.status_code != 200:
        return None
    return resp.json().get("response", "").strip()

print("[1/4] Scanning folder for images...")
# gather images recursively in case of nested folders (but primarily top-level)
images = find_images(FOLDER)
if not images:
    print("NO IMAGES FOUND"); sys.exit(1)
print(f"Found {len(images)} images: {images[:3]}...")

print("[2/4] Extracting features (vision)")
cache = load_cache()
all_features = []
for img_path in images:
    name = os.path.basename(img_path)
    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
    feats = extract_features(img_path, img_b64)
    all_features.append((name, feats))

print("[3/4] Generating notes (text model)")
notes = generate_notes(all_features)
if not notes:
    print("FAILED: notes generation returned empty"); sys.exit(1)
ver = next_version()
out_path = os.path.join(FOLDER, f"client_notes_ver_{ver}.md")
with open(out_path, "w") as f:
    f.write(notes)
print(f"[4/4] Wrote {len(notes)} chars to {out_path}")
with open(os.path.join(FOLDER, "last_run_confirmation.txt"), "w") as c:
    c.write(f"Last run: local, {ver}, images: {len(images)}\nOutput: {out_path}\n")
print("DONE")
