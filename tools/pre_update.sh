#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d-%H%M%S)
BASE="$HOME/.openclaw"
WS="$HOME/.openclaw/workspace"
OUT="$WS/.backup/pre-update-$TS"
mkdir -p "$OUT"
# Back up config
cp "$BASE/openclaw.json" "$OUT/openclaw.json.bak"
# Zip main dirs (lightweight)
(cd "$HOME" && zip -qr "$OUT/home-openclaw-$TS.zip" .openclaw)
# Tag config repo if present
if [ -d "$WS/openclaw-config/.git" ]; then
  cd "$WS/openclaw-config"
  git add -A || true
  git commit -m "pre-update $TS" || true
  git tag -f "pre-update-$TS" || true
fi
# Export cron list
mkdir -p "$OUT/cron"
openclaw cron list > "$OUT/cron/cron-list-$TS.txt" 2>/dev/null || true
# Snapshot ID ledger
if [ -f "$WS/drive-mirror/README.md" ]; then
  cp "$WS/drive-mirror/README.md" "$OUT/drive-mirror-README-$TS.md"
fi
echo "Pre-update snapshot saved at $OUT"
