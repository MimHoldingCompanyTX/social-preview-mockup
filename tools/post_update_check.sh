#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/config.env"

err=0
openclaw status || err=1
openclaw gateway status || err=1
# Brief sanity: cron present
openclaw cron list | grep -F "$CRON_JOB_NAME" || err=1
# Lead sheet quick read
gog sheets get "$LEAD_SHEET_ID" "Sheet1!A1:F5" --json >/dev/null || err=1
if [ $err -ne 0 ]; then
  echo "Post-update check: issues detected"; exit 1
else
  echo "Post-update check: OK"; exit 0
fi
