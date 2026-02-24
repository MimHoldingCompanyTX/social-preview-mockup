#!/bin/bash

# --- Reliable Agreement Maker Skill ---
# Runs entirely in the main context, bypassing sub-agent failures.
# Using simplified commands based on user input for testing.

# Configuration is hardcoded based on previous successful manual steps
PARENT_ID="1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F" 
TEMPLATE_ID="17mAb-4u5j95vTLydxojtrwdgXe5KwHHU" # Confirmed Template ID
TEMP_TEMPLATE_FILE="/tmp/template_manual_$(date +%s).md"
OUTPUT_DIR="./agreements"

# Arguments passed from the runner command: $1=ClientName, $2=Date, $3=Package
CLIENT_NAME="$1"
AGREEMENT_DATE="$2"
SERVICE_PACKAGE="$3"
FINAL_AGREEMENT_FILE="$OUTPUT_DIR/${AGREEMENT_DATE}_Agreement_${CLIENT_NAME// /_}.md"

if [ "$#" -ne 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 \"Client Name\" \"Date YYYY-MM-DD\" \"Service Package\""
    exit 1
fi

echo "--- Starting Agreement Creation for $CLIENT_NAME (Main Context) ---"

# Step 1: Download template
echo "1. Downloading template..."
mkdir -p "$OUTPUT_DIR"
gog drive download "$TEMPLATE_ID" --out "$TEMP_TEMPLATE_FILE"
DOWNLOAD_STATUS=$?

if [ $DOWNLOAD_STATUS -ne 0 ]; then
    echo "FAILURE: Step 1 Download failed (gog exit: $DOWNLOAD_STATUS). Stop."
    rm -f "$TEMP_TEMPLATE_FILE"
    exit 1
fi
echo "SUCCESS: Template downloaded to $TEMP_TEMPLATE_FILE"

# Step 2: Copy to FINAL_FILE
echo "2. Copying to final path: $FINAL_AGREEMENT_FILE"
cp "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
COPY_STATUS=$?
if [ $COPY_STATUS -ne 0 ]; then
    echo "FAILURE: Step 2 Copy failed."
    rm -f "$TEMP_TEMPLATE_FILE"
    exit 1
fi

# Step 3: Edit FINAL_FILE (Using macOS/BSD sed syntax)
echo "3. Editing file contents..."
sed -i '' "s/CLIENT NAME: ____________________/CLIENT NAME: $CLIENT_NAME/g" "$FINAL_AGREEMENT_FILE"
sed -i '' "s/DATE: ____________________/DATE: $AGREEMENT_DATE/g" "$FINAL_AGREEMENT_FILE"
sed -i '' "s/The 2-Hour Spark: Flat fee of \*\*$199\*\* due at the completion of the session/The $SERVICE_PACKAGE fee is set per the package terms./g" "$FINAL_AGREEMENT_FILE"
EDIT_CHECK=$(grep -q "$CLIENT_NAME" "$FINAL_AGREEMENT_FILE" && echo "OK" || echo "FAIL")

if [ "$EDIT_CHECK" != "OK" ]; then
    echo "FAILURE: Step 3 Edit failed. File contents did not change."
    rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
    exit 1
fi
echo "SUCCESS: File edited. Path: $FINAL_AGREEMENT_FILE"

# Step 4: Upload
echo "4. Uploading file..."
gog drive upload "$FINAL_AGREEMENT_FILE" --parent "$PARENT_ID"
UPLOAD_STATUS=$?

if [ $UPLOAD_STATUS -ne 0 ]; then
    echo "FAILURE: Step 4 Upload failed (gog exit: $UPLOAD_STATUS)."
    rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
    exit 1
fi
echo "SUCCESS: Upload complete."

# Step 5: Sleep
echo "5. Sleeping for 5 seconds..."
sleep 5

# Step 6: Verify
echo "6. Verifying upload..."
VERIFY_LINK=$(gog drive get $(gog drive search "name=\"$(basename "$FINAL_AGREEMENT_FILE")\"" --max 1 --json | jq -r '.files[0].webViewLink')
VERIFY_STATUS=$?

if [ $VERIFY_STATUS -ne 0 ] || [[ "$VERIFY_LINK" == "null" ]]; then
    echo "FAILURE: Step 6 Verification failed (gog drive get error or link not found)."
    rm -f "$TEMP_TEMPLATE_FILE"
    exit 1
fi
echo "SUCCESS: Verification successful. URL: $VERIFY_LINK"

# Step 7: Log
echo "7. Logging final result."
echo "Edited contents:" && cat "$FINAL_AGREEMENT_FILE"
echo "URL: $VERIFY_LINK"

rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
echo "--- Script Complete ---"