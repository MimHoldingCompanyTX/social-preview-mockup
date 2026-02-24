---
name: drive-traversal
description: Iteratively maps a Google Drive folder structure recursively using 'gog drive ls --parent <ID>' by manually traversing each discovered folder ID layer by layer. Use this when automated recursive Drive listing fails due to command limitations.
---

# Drive Traversal Skill

This skill documents the manual, iterative process required to map the Google Drive file structure when the host `gog` CLI lacks a recursive option (`-r`).

## Workflow Pattern

The standard procedure relies on identifying folder IDs from a parent listing and then repeatedly calling `gog drive ls --parent <folderID>`.

1.  **Root List:** Execute `gog drive ls` to get top-level files and folders.
2.  **Iterative Descent:** For every folder ID found, execute `gog drive ls --parent <ID>`.
3.  **Continue:** For every folder ID returned in the previous step, repeat step 2 until no new folder IDs are returned (i.e., the folder is empty or contains only files).
4.  **Output Format:** Record all discovered file/folder names and their respective IDs in a structured format (like a Markdown table) for reconciliation against local files.

## Reference Files

- See references/gog-cli-limits.md for known command limitations.
- See references/drive-ids.md for the current inventory list.
