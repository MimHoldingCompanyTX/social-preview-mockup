#!/bin/bash
# auto_process_vault.sh - Auto-process new client folder uploads to Sheila Drive
# Called by cron every 15 minutes to check for new initial visit folders

# Configuration
SHEILA_DRIVE="/Users/clawdallen/Desktop/Sheila Drive"
CLIENT_PORTAL="$SHEILA_DRIVE/Sheila Gutierrez Designs/client_portal"
SCRIPTS_DIR="/Users/clawdallen/.openclaw/workspace/scripts"
LOG_FILE="$SCRIPTS_DIR/auto_process.log"

# Ensure log directory exists
mkdir -p "$SCRIPTS_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null 2>&1; then
    log "ERROR: Ollama is not running"
    exit 1
fi

log "Starting auto-process scan..."

# Find folders with images that don't have client_notes yet
FOUND_FOLDERS=0
PROCESSED_FOLDERS=0

for FOLDER in "$CLIENT_PORTAL"/*/; do
    [ -d "$FOLDER" ] || continue
    
    FOLDER_NAME=$(basename "$FOLDER")
    NOTES_FILE="$FOLDER/client_notes_ver_1.md"
    LAST_RUN="$FOLDER/last_run_confirmation.txt"
    
    # Skip if already processed (has client notes or run confirmation)
    if [ -f "$NOTES_FILE" ] || [ -f "$LAST_RUN" ]; then
        continue
    fi
    
    # Check if folder has images
    IMAGE_COUNT=$(find "$FOLDER" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" \) 2>/dev/null | wc -l)
    
    if [ "$IMAGE_COUNT" -lt 1 ]; then
        continue
    fi
    
    log "FOUND: $FOLDER_NAME ($IMAGE_COUNT images) - needs processing"
    FOUND_FOLDERS=$((FOUND_FOLDERS + 1))
    
    # TODO: Process folder with initial-visit-notes skill
    # This would require calling the skill script or running Ollama directly
    # For now, log the action to perform
    log "ACTION: Run initial-visit-notes on $FOLDER_NAME"
    
    # Uncomment the next line when the skill command is ready
    # process_folder "$FOLDER"
done

if [ $FOUND_FOLDERS -eq 0 ]; then
    log "No new folders found that need processing"
else
    log "Scan complete: $FOUND_FOLDERS folder(s) found needing attention"
fi

log "Auto-process scan finished"
