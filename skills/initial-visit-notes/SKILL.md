---
name: initial-visit-notes
description: Process photos AND videos from a specified local folder to generate professional interior design client visit notes, mood board direction, and color palette. Operates entirely locally on this machine using Ollama (no external API costs). Automatically detects room type, extracts features, and synthesizes unified designer-voice notes. Supports JPG, JPEG, PNG, HEIC, GIF, and BMP. Extracts approximate address from GPS EXIF when available. Use when asked to process a folder of visit media or "Run Initial Visit Notes".
---

# Initial Visit Notes

You are a professional interior designer. This skill automates the extraction of field notes from a folder of site visit images and videos using local AI.

## Workflow

### 1. Verify Environment & Folder
- **Pre-check:** Ensure Ollama is running and `llava-llama3:latest` (vision) and `llama3.2:3b` (text) are installed.
- **Target Folder:** Identify the target local folder from the user's request. Verify the folder exists and perform a live scan (no cached lists).
- **Clean State:** Before processing, remove any stale cache files (.image_cache.json, last_run_confirmation.txt) and verify only the intended source images are present. Never read from cached or temp files.
- **Identify Media:** Gather all supported image and video files (JPG, JPEG, PNG, HEIC, GIF, BMP).
- **HEIC/Color Note:** iPhone HEIC files contain 10‑bit color and wider gamut. For best color accuracy, convert HEIC to lossless PNG (or high‑quality JPEG) before analysis. Avoid aggressive compression (quality < 90) which distorts colors. Recommended conversion: `sips -Z 1024 -s format png input.heic --out output.png` or `sips -Z 1024 -s format jpeg -s formatOptions 95 input.heic --out output.jpg`.

### 2. Feature Extraction (Local Vision)
- Process each image individually through the local vision model (`llava-llama3`).
- **EXIF Check:** Extract GPS metadata from images. If present, reverse-geocode via Nominatim or similar to produce an "Address (approx)" field. This MUST appear in the final output when GPS data exists.
- **Model Awareness:** The `llava‑llama3` vision model tends to hallucinate common room features (fireplaces, windows, artwork). Counter this by: (1) using the skeptical prompt above, (2) cross‑referencing across multiple photos, (3) excluding items that appear in only one photo unless unmistakable, (4) preferring "cannot determine" over invented details.
- **Visual Analysis Prompt (use this exact prompt for each image):**

```
You are an expert interior designer conducting a detailed site visit. You are skeptical and factual — you only describe what is **unambiguously, literally visible**. If something is unclear, partially obscured, or cannot be determined, state "not clearly visible" or "cannot determine". Never guess, assume, or fill in common room features that aren't present. Use phrases like "appears to be" only when you have strong visual evidence.

Describe EVERYTHING visible in this photo with exhaustive specificity. Cover every category below:

ROOM TYPE: What room or space does this appear to be? Base this only on visible evidence. If ambiguous, note the ambiguity.

LAYOUT & SPATIAL FLOW: How is the space organized? Where are entry points, traffic paths, and furniture groupings relative to each other? Note any cramped areas or wasted space.

WALLS: Exact color description (e.g., "warm beige", "cool gray"), material (paint, tile, wallpaper, wood paneling), condition (clean, scuffed, peeling), trim color, any accent walls.

FLOORING: Material (carpet, hardwood, tile, vinyl, stone), color/pattern, condition, grout color if tile.

CEILING: Estimated height, color, features (beams, fans, recessed lighting, crown molding).

FURNITURE: Every piece visible — type, style, material, color, condition, approximate size. Include sofas, chairs, tables, shelving, desks, beds, dressers, etc.

FIXTURES & FIXED ELEMENTS: Fireplace details, TV mounts, built-ins, mirrors, shelving, lighting fixtures, and any other permanent or semi-permanent elements. **CRITICAL: Do NOT list sinks, toilets, tubs, vanities, or any bathroom fixture unless it is unambiguously visible in the photo. If no such fixtures are visible, write "No bathroom fixtures visible."** Note finish (chrome, brushed nickel, brass, matte black) if applicable.

LIGHTING: Every light source — natural (windows, skylights) and artificial (overhead, lamps, sconces, recessed, under-cabinet). Note fixture style, finish, and any dark zones.

TEXTILES: Curtains/drapes, rugs, towels, throw pillows, blankets, upholstery fabrics. Note colors, patterns, and condition.

DECOR & ART: Wall art, plants, books, decorative objects, personal items. Describe placement and style.

STORAGE: Visible storage solutions — cabinets, shelves, closets, baskets, bins.

CONDITION & WEAR: Any damage, dated elements, water stains, peeling paint, worn carpet, outdated fixtures.

ESTIMATED DIMENSIONS: Rough room size based on scale of visible furniture and fixtures.

**COLOR ACCURACY IS CRITICAL.** Be brutally specific about colors — use descriptive names like "sage green", "navy blue", "cream", "charcoal gray", "warm honey oak" not just "green", "blue", "white", "gray", "brown". 

**For walls:** Note if there are accent walls of different colors. Distinguish between light/dark shades.

**For furniture:** Specify exact color of upholstery/finish (e.g., "deep navy blue velvet sofa", "black leather chair").

**For textiles:** Note exact colors and patterns of pillows, rugs, curtains.

**If lighting makes color ambiguous,** state "color appears to be X but could be Y due to lighting". Never guess; if uncertain, describe the hue (e.g., "blue-green" rather than just "green").

**Only describe what is literally, unambiguously visible. No assumptions or fabrications. Missing information is better than invented information.** If you cannot see something clearly, do NOT include it in your description.
```

- **Floor Plans:** Scan specifically for Magic Plan sketches or architectural drawings; extract literal dimensions if found.

### 2.5 Cross‑Image Validation & Reality Check
- **Consistency Analysis:** After collecting all photo observations, compare furniture, fixtures, and major features across images.
- **Hallucination Filter:** Flag any item that appears in only one photo (for sets of 3 or more images) as "requires verification." If the item is not clearly visible in at least two different photos, exclude it from the synthesis unless it's a large, unmistakable feature (e.g., a bed in a bedroom).
- **Discrepancy Handling:** If observations conflict (e.g., one photo shows hardwood floors, another shows carpet), note the discrepancy in the synthesis rather than inventing a unified surface. State: "Flooring appears inconsistent across photos: image X shows hardwood, image Y shows carpet."
- **Verification Set:** Create a cleaned set of observations that:
  1. Removes generic phrases like "cozy atmosphere," "inviting space" without specific visual evidence
  2. Eliminates sentences containing uncertainty markers: "likely," "probably," "seems to have," "might be" (unless qualified with "appears to be" based on strong evidence)
  3. Flags items not mentioned in at least 2 different photo observations (for multi‑image sets) as potentially hallucinated
- **Reality Anchor:** For each major claim in the final report, maintain a reference to which photo(s) support it. If a claim has no supporting photo observation, remove it.

### 3. Synthesis (Local Text Model)
- Pass all raw visual observations to the local text model (`llama3.2:3b`).
- **Unified Voice:** Synthesize ALL photo observations into a single, cohesive designer field note. Do NOT list observations per photo. Write as one designer describing one room.
- **Room Identification:** Analyze the majority of visual evidence to correctly identify the room type (e.g., Study, Kitchen, Master Bath, Living Room).
- **No Fabrication:** Ground the report strictly in observable data. Never invent client background, family details, or pet names.
- **Synthesis Prompt (use this exact structure):**

```
You are documenting existing conditions of a property after an initial visit. You took [N] photos of one room. Here are your raw observations from each photo:

[INSERT ALL PHOTO OBSERVATIONS]

Now write a factual, as‑is property description. This is **NOT** a design proposal—it is documentation of what exists. Synthesize ALL observations into unified paragraphs — do NOT list per‑photo. Write as a professional documenting existing conditions.

Follow this EXACT format and fill ONLY sections where you have visible evidence:

# Property Visit Notes — [Client/Folder Name], Initial Visit
**Date:** [current date]
**Address (approx):** [reverse‑geocoded address from EXIF — include ONLY if GPS data is present and accurate; otherwise omit entirely]

---

## Room: [identify the room type from observations — Living Room, Study, Kitchen, Bathroom, etc. If ambiguous, state "Ambiguous: could be X or Y"]

## Dimensions
Estimate the room size from what you observed. Include width, length, and ceiling height estimates. **Clearly label as "estimated."** If scale cannot be determined, write "Scale unclear—unable to estimate dimensions."

## Observations

Write these as concise, factual paragraphs. **Omit any subsection for which you have no visible evidence.** Do NOT invent content to fill sections.

### Layout & Flow
How the room is organized. Entry points, traffic paths, furniture groupings, spatial relationships. Note any cramped areas or wasted space. **If layout is not clearly visible, omit this subsection.**

### Surfaces
Walls (color, material, condition), flooring (type, color, pattern, condition), ceiling (height, color, features like beams or molding). Be specific — "warm beige painted walls in good condition" not "beige walls." **If a surface is not visible (e.g., ceiling out of frame), omit that part.**

### Fixtures & Features
Every fixture and furniture piece **that is unambiguously visible**. For each: type, style, material, finish color, condition. Include fireplace details, TV placement, built‑ins, hardware finishes. **Do NOT list items that are partially obscured or uncertain.**

### Lighting
Every light source — natural (windows, their size, treatments) and artificial (overhead, lamps, sconces, recessed). Note fixture styles and finishes. Identify any dark zones or areas needing better light. **If lighting is not visible, omit this subsection.**

### Textiles & Decor
Curtains, rugs, throw pillows, blankets, wall art, plants, books, decorative objects. Note colors, patterns, textures, placement, and condition. **If none are visible, omit this subsection.**

## Pain Points
List specific, observable issues **that are clearly visible in the photos**:
- Each must reference something actually seen
- Examples: dated fixtures, lighting gaps, clutter, worn surfaces, limited storage
- **If no pain points are visible, write "No obvious pain points observed."**

## Existing Conditions Summary
Write in third person as a factual summary. **DO NOT include "Designer's Initial Impressions" or subjective opinions.** Include:
- What is present (minimum 3 specific items)
- What is missing or unclear (minimum 3 specific items)
- Notable conditions (wear, damage, maintenance status)

**NO MOOD BOARD DIRECTION — This is an as‑is report, not a design proposal.**
**NO COLOR PALETTE — This is an as‑is report, not a design proposal.**
**NO NEXT STEPS — This is an as‑is report, not a design proposal.**

## CRITICAL RULES — STRICTLY ENFORCED:
- **NO HALLUCINATIONS:** Every statement must originate from the photo observations. If not seen, do not write it.
- **NO FABRICATIONS:** Do not guess, assume, or fill in common room features that aren't present.
- **NO GUESSING:** If something is unclear, partially obscured, or cannot be determined, state "not clearly visible" or "cannot determine".
- **Cross‑image verification:** For sets of 3 or more photos, any furniture/fixture/feature should be mentioned in at least 2 different photo observations to be included in the final report. If an item appears in only one photo, exclude it unless it's a large, unmistakable feature.
- **No interpolation:** Do not invent hybrid features by merging details from different photos. If photos show different surfaces, note the discrepancy.
- **Avoid uncertainty markers:** Eliminate phrases like "likely," "probably," "seems to have," "might be," "appears to be". Only describe what is **unambiguously visible**.
- **Feature corroboration:** For each claim, note which photo(s) support it. If a claim has no supporting photo observation, remove it.
- **Do NOT invent** client background, lifestyle, pets, occupation, or biographical details.
- **Do NOT include** a "Client Background" section.
- **Do NOT include** a "Designer" line.
- **Sound like a factual property report**, not a designer's creative interpretation.
- **Be concise.** Omit sections with no visible data. Quality of observation over quantity of words.
```

### 4. Output Generation
- **FileName:** `client_notes_ver_X.md`. If `ver_1.md` exists, increment to `ver_2.md`, etc. Never overwrite.
- **Verification & Reality Check:** After writing, read back the file and:
  1. Confirm it contains all required sections and meets minimum length (1500+ words).
  2. Scan for hallucination markers: remove or rewrite any sentences containing "likely," "probably," "seems to have," "might be" (unless qualified with "appears to be" based on strong visual evidence).
  3. Verify that each major furniture/fixture claim is supported by at least 2 different photo observations (for sets of 3 or more images).
  4. Note any discrepancies between photos rather than glossing over them (e.g., "Flooring appears inconsistent across photos").
  5. Ensure no client background, lifestyle, or biographical details have been invented.

### 5. Finalize
- Save the file to the source folder.
- Write/update `last_run_confirmation.txt` in the folder with run metrics (date, models used, image count, output file, file size).
- Return a concise completion message with the file path.

## Constraints
- **Local Only:** All AI processing must occur via the local Ollama instance.
- **Clean State:** Always purge cache/temp files before processing. Verify folder contents before reading and after writing.
- **No Cross-Contamination:** Only process images physically present in the target folder. Never reference cached observations from prior runs.
- **Generalization:** Do not hard-code names like "Sheila" or "Chip" inside the skill logic unless explicitly provided by the folder name or user.
- **Privacy:** Do not include a "Client Background" section.
- **Consistency:** Every run must produce the same section structure regardless of room type or image count. This ensures uniform quality across all clients and rooms.
