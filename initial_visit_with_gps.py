#!/usr/bin/env python3
"""
Initial Visit Notes skill with GPS EXIF extraction and Nominatim reverse‑geocoding.
"""

import os, json, base64, urllib.request, datetime, glob, time, math
from PIL import Image, ExifTags

FOLDER = os.path.expanduser("~/Desktop/Sheila_living")
VISION_MODEL = "llava-llama3"
TEXT_MODEL = "llama3.2:3b"
OLLAMA_URL = "http://localhost:11434/api/generate"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

# Vision prompt from SKILL.md (exact)
VISION_PROMPT = """You are an expert interior designer conducting a detailed site visit. Describe EVERYTHING visible in this photo with exhaustive specificity. Cover every category below:

ROOM TYPE: What room or space does this appear to be? Base this only on visible evidence.

LAYOUT & SPATIAL FLOW: How is the space organized? Where are entry points, traffic paths, and furniture groupings relative to each other? Note any cramped areas or wasted space.

WALLS: Exact color description (e.g., "warm beige", "cool gray"), material (paint, tile, wallpaper, wood paneling), condition (clean, scuffed, peeling), trim color, any accent walls.

FLOORING: Material (carpet, hardwood, tile, vinyl, stone), color/pattern, condition, grout color if tile.

CEILING: Estimated height, color, features (beams, fans, recessed lighting, crown molding).

FURNITURE: Every piece visible — type, style, material, color, condition, approximate size. Include sofas, chairs, tables, shelving, desks, beds, dressers, etc.

FIXTURES & FITTINGS: Sinks, toilets, tubs, vanities, mirrors, towel bars, built-ins, fireplace details, TV mounts, etc. Note finish (chrome, brushed nickel, brass, matte black).

LIGHTING: Every light source — natural (windows, skylights) and artificial (overhead, lamps, sconces, recessed, under-cabinet). Note fixture style, finish, and any dark zones.

TEXTILES: Curtains/drapes, rugs, towels, throw pillows, blankets, upholstery fabrics. Note colors, patterns, and condition.

DECOR & ART: Wall art, plants, books, decorative objects, personal items. Describe placement and style.

STORAGE: Visible storage solutions — cabinets, shelves, closets, baskets, bins.

CONDITION & WEAR: Any damage, dated elements, water stains, peeling paint, worn carpet, outdated fixtures.

ESTIMATED DIMENSIONS: Rough room size based on scale of visible furniture and fixtures.

Be brutally specific about colors — use descriptive names like "warm honey oak" not just "brown". Only describe what is literally visible. No assumptions or fabrications."""

def ollama_generate(model, prompt, images=None):
    payload = {"model": model, "prompt": prompt, "stream": False}
    if images:
        payload["images"] = images
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("response", "")
    except Exception as e:
        return f"ERROR: {e}"

def dms_to_decimal(dms, ref):
    """Convert GPS DMS tuple (deg, min, sec) to decimal degrees."""
    if not dms: return None
    try:
        deg, min_, sec = dms
        dec = float(deg) + float(min_)/60 + float(sec)/3600
        if ref in ['S', 'W']:
            dec = -dec
        return dec
    except:
        return None

def get_gps_from_exif(path):
    """Extract GPS coordinates from image EXIF."""
    try:
        img = Image.open(path)
        exif = img._getexif()
        if not exif:
            return None, None
        gps = exif.get(34853)  # GPSInfo tag
        if not gps:
            return None, None
        
        lat = dms_to_decimal(gps.get(2), gps.get(1))  # 2 = latitude, 1 = N/S
        lon = dms_to_decimal(gps.get(4), gps.get(3))  # 4 = longitude, 3 = E/W
        return lat, lon
    except Exception as e:
        print(f"  EXIF error for {os.path.basename(path)}: {e}")
        return None, None

def reverse_geocode(lat, lon):
    """Call Nominatim to get an approximate address."""
    if lat is None or lon is None:
        return None
    try:
        params = {
            'lat': lat,
            'lon': lon,
            'format': 'json',
            'zoom': 16,  # neighborhood-level detail
            'addressdetails': 1
        }
        query = '&'.join([f'{k}={v}' for k, v in params.items()])
        url = f'{NOMINATIM_URL}?{query}'
        req = urllib.request.Request(url, headers={
            'User-Agent': 'SheilaDesigns/1.0 (clawdallen@gmail.com)'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'display_name' in data:
                return data['display_name']
    except Exception as e:
        print(f"  Nominatim error: {e}")
    return None

print(f"Found {len([f for f in os.listdir(FOLDER) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.heic'))])} images")

# Extract GPS from first image (assuming all are from same location)
address_approx = None
exts = ('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.heic')
images = sorted([f for f in os.listdir(FOLDER) if os.path.splitext(f)[1].lower() in exts])
if images:
    first_img = os.path.join(FOLDER, images[0])
    lat, lon = get_gps_from_exif(first_img)
    if lat and lon:
        print(f"GPS coordinates: {lat:.6f}, {lon:.6f}")
        address_approx = reverse_geocode(lat, lon)
        if address_approx:
            print(f"Reverse‑geocoded address: {address_approx}")
        else:
            print("  No address found from Nominatim")
    else:
        print(f"No GPS coordinates found in {images[0]}")

# Process each image through vision model
observations = []
for i, img_name in enumerate(images):
    img_path = os.path.join(FOLDER, img_name)
    print(f"\n--- Processing image {i+1}/{len(images)}: {img_name} ---")
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    result = ollama_generate(VISION_MODEL, VISION_PROMPT, images=[b64])
    print(f"  Result length: {len(result)} chars")
    observations.append(f"### Photo {i+1} ({img_name}):\n{result}")

all_obs = "\n\n".join(observations)
print(f"\n--- All observations collected: {len(all_obs)} chars ---")

# Synthesis prompt from SKILL.md (with actual address)
today = datetime.date.today().strftime("%B %d, %Y")
address_line = f"**Address (approx):** {address_approx}" if address_approx else "**Address (approx):** [No GPS data]"
synth_prompt = f"""You are an interior designer who just completed an initial visit to a client's home. You took {len(images)} photos of one room. Here are your raw observations from each photo:

{all_obs}

Now write polished, professional client visit notes. Synthesize ALL observations into unified paragraphs — do NOT list per-photo. Write as one designer describing one room in your own voice.

Follow this EXACT format and fill EVERY section with rich, specific detail:

# Client Visit Notes — Sheila Living Room, Initial Visit
**Date:** {today}
**Designer:** Designer
{address_line}

---

## Room: [identify the room type from observations — Living Room, Study, Kitchen, Bathroom, etc.]

## Dimensions
Estimate the room size from what you observed. Include width, length, and ceiling height estimates. Clearly label as "estimated."

## Observations

Write these as cohesive narrative paragraphs, NOT bullet lists. Each subsection must be a minimum of 4-6 sentences synthesizing details from ALL photos.

### Layout & Flow
How the room is organized. Entry points, traffic flow, furniture groupings, spatial relationships. Note any cramped areas or wasted space. Describe as one coherent paragraph.

### Surfaces
Walls (color, material, condition), flooring (type, color, pattern, condition), ceiling (height, color, features like beams or molding). Be specific — "warm beige painted walls in good condition" not "beige walls." One substantial paragraph.

### Fixtures & Features
Every fixture and furniture piece as a unified inventory. For each: type, style, material, finish color, condition. Include fireplace details, TV placement, built-ins, hardware finishes. One substantial paragraph.

### Lighting
Every light source — natural (windows, their size, treatments) and artificial (overhead, lamps, sconces, recessed). Note fixture styles and finishes. Identify any dark zones or areas needing better light. One substantial paragraph.

### Textiles & Decor
Curtains, rugs, throw pillows, blankets, wall art, plants, books, decorative objects. Note colors, patterns, textures, placement, and condition. One substantial paragraph.

## Pain Points
List 3-5 specific, observable issues:
- Each must reference something actually seen in the photos
- Examples: dated fixtures, lighting gaps, clutter, worn surfaces, lack of cohesion, limited storage

## Designer's Initial Impressions
Write in first person as the designer. Must include:
- What works well (minimum 3 specific items)
- What needs attention (minimum 3 specific items)
- Key design opportunities (minimum 2 specific items)

## Mood Board Direction
3-5 specific design vibes. Format each as:
"Vibe Name: brief description referencing elements observed in the room"
Example: "Cozy Elegance: warm tones, natural textures, and sophisticated comfort inspired by the existing wood beams and neutral palette"

## Color Palette
4-6 colors drawn DIRECTLY from observable elements in the room. Format each as:
#HEXCODE Descriptive Name
Example: #F7F7F7 Soft Beige

Include at least one accent color suggestion that complements existing tones.

## Next Steps
5-7 specific, actionable items prioritized by impact. Each must be concrete and tied to observations.

CRITICAL RULES:
- Every statement must originate from the photo observations. If not seen, do not write it.
- Do NOT invent client background, lifestyle, pets, occupation, or biographical details.
- Do NOT include a "Client Background" section.
- Sound like a human designer writing professional field notes, not an AI generating a report.
- Minimum total output: 1500 words. Be thorough."""

print("\n--- Running synthesis with llama3.2:3b ---")
final_notes = ollama_generate(TEXT_MODEL, synth_prompt)
print(f"  Synthesis length: {len(final_notes)} chars")

# Determine version number
existing = glob.glob(os.path.join(FOLDER, "client_notes_ver_*.md"))
vers = []
for f in existing:
    try:
        ver = int(f.split("ver_")[1].split(".md")[0])
        vers.append(ver)
    except:
        continue
next_ver = max(vers) + 1 if vers else 1
out_path = os.path.join(FOLDER, f"client_notes_ver_{next_ver}.md")
with open(out_path, "w") as f:
    f.write(final_notes)

# Confirmation
with open(os.path.join(FOLDER, "last_run_confirmation.txt"), "w") as f:
    f.write(f"Date: {today}\nVision Model: {VISION_MODEL}\nText Model: {TEXT_MODEL}\nImages: {len(images)}\nOutput: client_notes_ver_{next_ver}.md\nSize: {len(final_notes)} chars\n")
    if address_approx:
        f.write(f"Address (approx): {address_approx}\n")

print(f"\n✅ DONE — saved to {out_path} ({len(final_notes)} chars)")
if address_approx:
    print(f"   Address: {address_approx}")