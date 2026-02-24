---
name: client-agreement-creator
description: Generates and uploads a client service agreement based on the latest Drive template.
homepage: ""
metadata:
  {
    "openclaw":
      {
        "emoji": "📄",
        "requires": { "bins": ["gog", "jq"] },
        "install": []
      }
  }
---

# Client Agreement Creator Skill

This skill follows the 4-step SOP: Find Template -> Download -> Local Edit -> Upload.

## Execution Instructions

To run this skill for a new client, execute the script with the necessary arguments:

```bash
./client-agreement-creator/run.sh "Client Name Here" "YYYY-MM-DD" "Service Package"
```
Example: `./client-agreement-creator/run.sh "Amy Stouffer" "2026-02-22" "The 2-Hour Spark"`

## Internal Logic Script (`run.sh`)

```bash
#!/bin/bash

# --- Configuration ---
PARENT_ID="1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F" # Confirmed Client Agreements Folder ID
TEMPLATE_NAME="Service_Agreement.md"
TEMP_TEMPLATE_FILE="/tmp/Master_Agreement_Template_$(date +%s).md"
# Generating unique final filename based on input, matching successful manual pattern
CLIENT_NAME="$1"
AGREEMENT_DATE="$2"
FINAL_AGREEMENT_FILE="./agreements/${AGREEMENT_DATE}_Agreement_${CLIENT_NAME// /_}.md"

# Check for required arguments
if [ "$#" -ne 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 \"Client Name\" \"Date YYYY-MM-DD\" \"Service Package\""
    exit 1
fi

SERVICE_PACKAGE="$3"

echo "--- Starting Agreement Creation for $CLIENT_NAME ---"

# Step 1: Find the template file ID
echo "1. Searching for template file: $TEMPLATE_NAME"
FILE_ID="17mAb-4u5j95vTLydxojtrwdgXe5KwHHU" 

echo "Found file ID: $FILE_ID"

# Step 2: Download the content using the confirmed working command structure
echo "2. Downloading template to $TEMP_TEMPLATE_FILE"
gog drive download "$FILE_ID" --out "$TEMP_TEMPLATE_FILE"
DOWNLOAD_STATUS=$?

if [ $DOWNLOAD_STATUS -ne 0 ]; then
    echo "Error: Failed to download template file (gog drive exit code: $DOWNLOAD_STATUS). Aborting."
    rm -f "$TEMP_TEMPLATE_FILE"
    exit 1
fi

# Step 3: Local Edit Simulation (substituting placeholders)
echo "3. Generating new agreement file: $FINAL_AGREEMENT_FILE"
mkdir -p ./agreements
cp "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"

# NOTE: The sed command is written for macOS (BSD sed) compatibility
sed -i '' "s/CLIENT NAME: ____________________/CLIENT NAME: $CLIENT_NAME/g" "$FINAL_AGREEMENT_FILE"
sed -i '' "s/DATE: ____________________/DATE: $AGREEMENT_DATE/g" "$FINAL_AGREEMENT_FILE"
sed -i '' "s/The 2-Hour Spark: Flat fee of \*\*$199\*\* due at the completion of the session/The $SERVICE_PACKAGE fee is set per the package terms./g" "$FINAL_AGREEMENT_FILE"

echo "Agreement generated for: $CLIENT_NAME for package: $SERVICE_PACKAGE"

# Step 4: Upload the new agreement file
echo "4. Uploading new agreement to Drive parent folder $PARENT_ID"
sleep 2 
gog drive upload "$FINAL_AGREEMENT_FILE" --parent "$PARENT_ID"
UPLOAD_STATUS=$?

if [ $UPLOAD_STATUS -ne 0 ]; then
    echo "Warning: Upload failed (Exit code: $UPLOAD_STATUS). File remains locally at $FINAL_AGREEMENT_FILE for manual upload."
else
    echo "Upload successful. File URL:"
    sleep 5
    gog drive get $(gog drive search "name=\"$(basename $FINAL_AGREEMENT_FILE)\"" --max 1 --json | jq -r '.files[0].webViewLink')
fi

# Step 5: Clean up /tmp/ files
echo "5. Cleaning up temporary files."
rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"

echo "--- Skill Execution Complete: Agreement preparation finalized. ---"