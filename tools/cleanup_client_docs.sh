#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
AGREEMENTS_FOLDER_ID="1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F"
CLIENT_DOCS_FOLDER_ID="1KpFaJsA2a-9S2Fit-el8FTPWXkhDU-zU"
NOTE_FILE="/Users/clawdallen/.openclaw/workspace/drive-mirror/README.md"
LOG_FILE="/Users/clawdallen/.openclaw/workspace/memory/2026-02-19.md"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Drive Cleanup for Client Agreements..." >> "$LOG_FILE"

# 1. Find all Google Docs in the parent folder
# We are looking for files that are NOT folders and are Google Docs
gog drive ls --parent "$AGREEMENTS_FOLDER_ID" --max 500 --json | jq -r '.files[] | select(.mimeType == "application/vnd.google-apps.document") | .id' > /tmp/docs_to_move.txt

DOC_COUNT=$(wc -l < /tmp/docs_to_move.txt)
if [ "$DOC_COUNT" -eq 0 ]; then
    echo "No new Google Docs found in Agreements folder." >> "$LOG_FILE"
    exit 0
fi

echo "Found $DOC_COUNT Google Doc(s) to move." >> "$LOG_FILE"

# 2. Move each found Google Doc to the Client Docs subfolder
while IFS= read -r DOC_ID; do
    if [ -n "$DOC_ID" ]; then
        gog drive move "$DOC_ID" --parent "$CLIENT_DOCS_FOLDER_ID" --json >> "$LOG_FILE" 2>&1
    fi
done < /tmp/docs_to_move.txt

# 3. Update the local ID mirror (optional, but good for tracking)
# This step is too complex for a simple shell script without full ID context retrieval.
# Manual update of $NOTE_FILE is deferred to the next agent turn.

echo "$(date '+%Y-%m-%d %H:%M:%S') - Drive Cleanup finished." >> "$LOG_FILE"
rm /tmp/docs_to_move.txt
