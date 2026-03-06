#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$HOME/.openclaw/workspace}"
find "$ROOT" -type d -name .git | sed 's|/\.git$||' | while read -r repo; do
  echo "# $repo"
  git -C "$repo" remote -v | sed 's/^/  /' || true
  echo
done
