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

FIXTURES & FITTINGS: Sinks, toilets, tubs, vanities, mirrors, towel bars, built-ins, fireplace details, TV mounts, etc. Note finish (chrome, brushed nickel, brass, matte black).

LIGHTING: Every light source — natural (windows, skylights) and artificial (overhead, lamps, sconces, recessed, under-cabinet). Note fixture style, finish, and any dark zones.

TEXTILES: Curtains/drapes, rugs, towels, throw pillows, blankets, upholstery fabrics. Note colors, patterns, and condition.

DECOR & ART: Wall art, plants, books, decorative objects, personal items. Describe placement and style.

STORAGE: Visible storage solutions — cabinets, shelves, closets, baskets, bins.

CONDITION & WEAR: Any damage, dated elements, water stains, peeling paint, worn carpet, outdated fixtures.

ESTIMATED DIMENSIONS: Rough room size based on scale of visible furniture and fixtures.

Be brutally specific about colors — use descriptive names like "warm honey oak" not just "brown". **Only describe what is literally, unambiguously visible. No assumptions or fabrications. Missing information is better than invented information.** If you cannot see something clearly, do NOT include it in your description.
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
You are an interior designer who just completed an initial visit to a client's home. You took [N] photos of one room. Here are your raw observations from each photo:

[INSERT ALL PHOTO OBSERVATIONS]

Now write polished, professional client visit notes. Synthesize ALL observations into unified paragraphs — do NOT list per-photo. Write as one designer describing one room in your own voice.

Follow this EXACT format and fill EVERY section with rich, specific detail:

# Client Visit Notes — [Client/Folder Name], Initial Visit
**Date:** [current date]
**Designer:** Designer
**Address (approx):** [reverse-geocoded address from EXIF, or omit if no GPS]

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
- **Cross‑image verification:** For sets of 3 or more photos, any furniture/fixture/feature should be mentioned in at least 2 different photo observations to be included in the final report (unless it's a large, unmistakable element like a bed in a bedroom). If an item appears in only one photo, treat it as "requires verification" and either exclude it or note the uncertainty.
- **No interpolation:** Do not invent hybrid features by merging details from different photos. If photos show different flooring types, note the discrepancy rather than creating a unified description.
- **Avoid uncertainty markers:** Eliminate phrases like "likely," "probably," "seems to have," "might be" unless qualified with "appears to be" based on strong visual evidence.
- **Feature corroboration:** For each major claim in your report, mentally note which photo(s) support it. If a claim has no supporting photo observation, remove it.
- Do NOT invent client background, lifestyle, pets, occupation, or biographical details.
- Do NOT include a "Client Background" section.
- Sound like a human designer writing professional field notes, not an AI generating a report.
- Minimum total output: 1500 words. Be thorough.
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
