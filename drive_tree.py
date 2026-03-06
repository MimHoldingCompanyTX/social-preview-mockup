#!/usr/bin/env python3
"""
Generate a tree listing of Google Drive client_portal folder using rclone.
"""

import subprocess
import sys

REMOTE = 'shelia_business_drive:"Sheila Gutierrez Designs/client_portal"'

def run_rclone(args):
    """Run rclone command and return lines."""
    cmd = ['rclone'] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error running rclone: {e.stderr}", file=sys.stderr)
        sys.exit(1)

def build_tree(paths):
    """Convert list of paths into a tree structure."""
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
    """Print tree recursively with nice indentation."""
    if not node:
        return
    keys = list(node.keys())
    for i, key in enumerate(keys):
        is_last_child = (i == len(keys) - 1)
        connector = '└── ' if is_last_child else '├── '
        print(f"{prefix}{connector}{key}")
        extension = '    ' if is_last_child else '│   '
        print_tree(node[key], prefix + extension, is_last_child)

def main():
    print("📁 Google Drive: client_portal folder\n")
    
    # Get all files and folders recursively
    print("Fetching directory structure...")
    paths = run_rclone(['lsf', '-R', REMOTE])
    
    # Build tree
    tree = build_tree(paths)
    
    # Print tree
    print_tree(tree)
    
    # Also show summary
    print(f"\nTotal items: {len(paths)}")

if __name__ == '__main__':
    main()