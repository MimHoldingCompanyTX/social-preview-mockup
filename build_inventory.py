#!/usr/bin/env python3
import subprocess, json, sys

def ls_folder(folder_id):
    result = subprocess.run(
        ["gog", "drive", "ls", "--json", f"--parent={folder_id}", "--max=500"],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        return []
    data = json.loads(result.stdout)
    return data.get("files", [])

def traverse(folder_id, depth=0):
    items = ls_folder(folder_id)
    children = []
    for item in items:
        name = item.get("name", "")
        mime = item.get("mimeType", "")
        fid = item.get("id", "")
        if name == ".DS_Store":
            continue
        if mime == "application/vnd.google-apps.folder":
            sub = traverse(fid, depth+1)
            children.append({"type": "folder", "name": name, "children": sub})
        else:
            size = item.get("size", "0")
            children.append({"type": "file", "name": name, "size": size, "mimeType": mime})
    return children

# client_portal root
CLIENT_PORTAL_ID = "1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6"

print("Starting traversal...", file=sys.stderr)
tree = {"name": "client_portal", "type": "folder", "children": traverse(CLIENT_PORTAL_ID)}

output_path = "/Users/clawdallen/Desktop/drive_inventory.json"
with open(output_path, "w") as f:
    json.dump(tree, f, indent=2)

print(f"Written to {output_path}", file=sys.stderr)

# Verify by reading it back
with open(output_path, "r") as f:
    verify = json.load(f)

print(f"Verified: {len(json.dumps(verify))} chars, root has {len(verify.get('children',[]))} children", file=sys.stderr)
print("SUCCESS", file=sys.stderr)
