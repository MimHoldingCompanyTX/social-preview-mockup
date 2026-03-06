#!/usr/bin/env python3
"""
Generate a tree listing of Google Drive client_portal folder.
"""

import subprocess
import sys

def run_rclone():
    remote = 'shelia_business_drive:"Sheila Gutierrez Designs/client_portal"'
    cmd = ['rclone', 'lsf', '-R', remote]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}", file=sys.stderr)
        sys.exit(1)

def build_tree(paths):
    """Build a tree as dict of dicts."""
    tree = {}
    for path in paths:
        parts = path.rstrip('/').split('/')
        node = tree
        for part in parts:
            if part not in node:
                node[part] = {}
            node = node[part]
    return tree

def print_tree(node, prefix='', is_last=True):
    if not node:
        return
    keys = sorted(node.keys())
    for i, key in enumerate(keys):
        is_last_child = (i == len(keys) - 1)
        connector = '└── ' if is_last_child else '├── '
        print(f"{prefix}{connector}{key}")
        extension = '    ' if is_last_child else '│   '
        print_tree(node[key], prefix + extension, is_last_child)

def main():
    print("📁 Google Drive – client_portal folder")
    print("Remote: shelia_business_drive:\n")
    
    paths = run_rclone()
    if not paths:
        print("No items found.")
        return
    
    tree = build_tree(paths)
    print_tree(tree)
    
    # Count
    folders = sum(1 for p in paths if p.endswith('/'))
    files = len(paths) - folders
    print(f"\n📊 Summary: {folders} directories, {files} files")

if __name__ == '__main__':
    main()