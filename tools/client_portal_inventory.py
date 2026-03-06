#!/usr/bin/env python3
"""
client_portal_inventory.py
Traverses Google Drive client_portal via gog CLI and produces
a clean, human-readable JSON tree using folder names as keys.
Sorts folders by name so numbered phases appear in order.
Output: ~/Desktop/drive_inventory.json
"""
import subprocess, json, sys

CLIENT_PORTAL_ID = "1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6"
OUTPUT_PATH = "/Users/clawdallen/Desktop/drive_inventory.json"

def ls_folder(folder_id):
    result = subprocess.run(
        ["gog", "drive", "ls", "--json", f"--parent={folder_id}", "--max=500"],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        return []
    data = json.loads(result.stdout)
    return data.get("files", [])

def traverse(folder_id):
    items = ls_folder(folder_id)
    folders = []
    files = []
    for item in items:
        name = item.get("name", "")
        mime = item.get("mimeType", "")
        if name == ".DS_Store":
            continue
        if mime == "application/vnd.google-apps.folder":
            folders.append((name, item.get("id", "")))
        else:
            files.append(name)

    # Sort both alphabetically (numbered folders will sort correctly)
    folders.sort(key=lambda x: x[0])
    files.sort()

    node = {}
    for fname, fid in folders:
        node[fname] = traverse(fid)

    if files:
        node["_files"] = files

    return node

print("Starting fresh traversal of client_portal...", file=sys.stderr)

# Get top-level clients
top_items = ls_folder(CLIENT_PORTAL_ID)
clients = []
for item in top_items:
    name = item.get("name", "")
    mime = item.get("mimeType", "")
    if name == ".DS_Store":
        continue
    if mime == "application/vnd.google-apps.folder":
        clients.append((name, item.get("id", "")))

clients.sort(key=lambda x: x[0])

tree = {
    "client_portal": {
        "clients": [c[0] for c in clients]
    }
}

for cname, cid in clients:
    tree["client_portal"][cname] = traverse(cid)

with open(OUTPUT_PATH, "w") as f:
    json.dump(tree, f, indent=2)

print(f"Written to {OUTPUT_PATH}", file=sys.stderr)

# Verify
with open(OUTPUT_PATH, "r") as f:
    verify = json.load(f)
size = len(json.dumps(verify))
print(f"Verified: {size} chars written successfully", file=sys.stderr)
print("SUCCESS", file=sys.stderr)
