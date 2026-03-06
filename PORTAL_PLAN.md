# Client Portal Plan (Source of Truth)

Purpose: Keep a clean, human-readable plan so we can reset any chat and continue work without confusion. No Drive IDs; we traverse by folder names at each level.

## Canonical Google Drive Paths (by names only)
- Root → "Sheila Gutierrez Designs"
  - client_portal
    - 2026-02-27_Joe_Blow
      - 01_Initial_Contact
      - 02_Agreement_Permissions
      - 03_Initial_Visit
        - photos
        - notes
      - 04_Moodboard
      - 05_Shopping
      - 06_Implementation
      - 07_Close_Out

Traversal rule:
- Always list children at each level (e.g., list root → pick "Sheila Gutierrez Designs" → list → pick "client_portal" → etc.).
- Create any missing folder when first encountered, then continue.

Act & Verify rule (applies to every step):
1) Navigate by names and confirm the target folder exists.
2) Perform the action (upload/create/move).
3) Immediately list the target folder and verify the expected file/folder appears exactly once.
4) If not, stop and repair—do not retry blindly.

File naming rules:
- Iterations: YYYY-MM-DD_short_title (machine-sortable + human-friendly)
- Single artifacts: use simple, lower_snake_case where possible (e.g., initial_contact_notes.md)

## Stage Artifact Conventions
- 01_Initial_Contact
  - initial_contact_notes.md
  - intake.txt
  - call_log.txt
- 02_Agreement_Permissions
  - signed_agreement_*.jpg (placeholder OK for prototype)
  - photo_release_*.jpg (placeholder OK for prototype)
- 03_Initial_Visit
  - photos/ (all visit images)
  - notes/initial_visit_notes.md
- 04_Moodboard
  - latest.txt → folder name of current iteration
  - <YYYY-MM-DD_title>/: board.webp, board_thumb.webp, spec.md, palette.json, notes.md
- 05_Shopping
  - latest.txt; <YYYY-MM-DD_round>/: list.md (+ list.json optional), thumbs/
- 06_Implementation
  - latest.txt; <YYYY-MM-DD_day>/: run_sheet.md, placement_map.md, punch_list.md
- 07_Close_Out
  - after/latest.txt; after/<YYYY-MM-DD_selects>/: selects/, thumbs/, before_after_pairs.json
  - blurb.md; testimonial.md (optional)

## Next 3 Tasks (active)
1) Initial Visit (Joe_Blow):
   - Place the 4 provided images into 03_Initial_Visit/photos
   - Create notes/initial_visit_notes.md from the observations (spec drafted)
2) Moodboard (Joe_Blow):
   - Create 04_Moodboard/latest.txt and a 2026-02-27_first_pass/ with spec.md + palette.json (stubs)
3) Shopping (Joe_Blow):
   - Create 05_Shopping/latest.txt and 2026-02-27_draft/list.md with 3–5 sample links

## Done / Decisions Log
- 2026-02-27: Stage folders created for Joe_Blow; Initial Contact sample files placed correctly; Agreement/Permissions placeholders created.
- 2026-02-27: Adopt human traversal (list children → pick by name) and Act & Verify protocol for all Drive actions.
