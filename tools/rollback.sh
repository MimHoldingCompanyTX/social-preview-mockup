#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d-%H%M%S)
BASE="$HOME/.openclaw"
WS="$HOME/.openclaw/workspace"
# Restore config if backup exists
LATEST_BAK=$(ls -1t "$WS/.backup"/pre-update-*/openclaw.json.bak 2>/dev/null | head -n1 || true)
if [ -z "$LATEST_BAK" ]; then
  echo "No backup config found under $WS/.backup"; exit 1
fi
cp "$LATEST_BAK" "$BASE/openclaw.json"
openclaw gateway restart || true
echo "Rollback complete from $LATEST_BAK"
