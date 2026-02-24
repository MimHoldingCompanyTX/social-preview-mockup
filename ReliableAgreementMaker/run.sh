#!/bin/bash

# --- Reliable Agreement Maker Skill (Finalized Main-Context Runner) ---
# This script is designed to run directly in the main agent shell context.

# Configuration based on manual success confirmation
PARENT_ID="1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F" 
TEMPLATE_NAME="Service_Agreement.md"
TEMP_TEMPLATE_FILE="/tmp/Master_Agreement_Template_Manual_$(date +%s).md"
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

echo "--- Starting Agreement Creation for $CLIENT_NAME (Main Context Execution) ---"

# Step 1: Find the template file ID
echo "1. Searching for template file: $TEMPLATE_NAME"
FILE_ID="17mAb-4u5j95vTLydxojtrwdgXe5KwHHU" 

echo "Found file ID: $FILE_ID"

# Step 2: Download the content using the confirmed working command structure
echo "2. Downloading template to $TEMP_TEMPLATE_FILE"
gog drive download "$FILE_ID" --out "$TEMP_TEMPLATE_FILE"
DOWNLOAD_STATUS=$?

if [ $DOWNLOAD_STATUS -ne 0 ]; then
    echo "FAILURE: Step 1 Download failed (gog exit: $DOWNLOAD_STATUS). Stop."
    rm -f "$TEMP_TEMPLATE_FILE"
    exit 1
fi
echo "SUCCESS: Template downloaded to $TEMP_TEMPLATE_FILE"

# Step 3: Local Edit Simulation (substituting placeholders using Python)
echo "3. Generating new agreement file: $FINAL_AGREEMENT_FILE"
mkdir -p "$OUTPUT_DIR"
cp "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
COPY_STATUS=$?
if [ $COPY_STATUS -ne 0 ]; then
    echo "FAILURE: Step 2 Copy failed."
    rm -f "$TEMP_TEMPLATE_FILE"
    exit 1
fi

/usr/bin/python3 -c "
import sys
try:
    with open('$FINAL_AGREEMENT_FILE', 'r') as f:
        content = f.read()
    
    content = content.replace('CLIENT NAME: ____________________', 'CLIENT NAME: $CLIENT_NAME')
    content = content.replace('DATE: ____________________', 'DATE: $AGREEMENT_DATE')
    content = content.replace('The 2-Hour Spark: Flat fee of **$199** due at the completion of the session', 'The $SERVICE_PACKAGE fee is set per the package terms.')
    
    with open('$FINAL_AGREEMENT_FILE', 'w') as f:
        f.write(content)
    print('SUCCESS: File edited.')
except Exception as e:
    print(f'FAILURE: Step 3 Edit failed. Error: {e}')
    sys.exit(1)
"
EDIT_STATUS=$?

if [ $EDIT_STATUS -ne 0 ]; then
    echo "FAILURE: Step 3 Edit failed during Python execution."
    rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
    exit 1
fi
EDIT_CHECK=$(grep -q "$CLIENT_NAME" "$FINAL_AGREEMENT_FILE" && echo "OK" || echo "FAIL")
if [ "$EDIT_CHECK" != "OK" ]; then
    echo "FAILURE: Step 3 Edit failed. Client name not found in file."
    rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
    exit 1
fi
echo "SUCCESS: File edited. Path: $FINAL_AGREEMENT_FILE"

# Step 4: Upload
echo "4. Uploading file..."
sleep 2 
gog drive upload \"$FINAL_AGREEMENT_FILE\" --parent \"$PARENT_ID\"
UPLOAD_STATUS=$?

if [ $UPLOAD_STATUS -ne 0 ]; then
    echo "FAILURE: Step 4 Upload failed (gog exit: $UPLOAD_STATUS). File remains locally at $FINAL_AGREEMENT_FILE for manual upload."
else
    echo "SUCCESS: Upload complete."
fi

# Step 5: Sleep
echo "5. Sleeping for 5 seconds..."
sleep 5

# Step 6: Verify
echo "6. Verifying upload..."
VERIFY_LINK=$(gog drive get $(gog drive search "name=\"$(basename $FINAL_AGREEMENT_FILE)\"" --max 1 --json | jq -r '.files[0].webViewLink')
VERIFY_STATUS=$?

if [ $VERIFY_STATUS -ne 0 ] || [[ "$VERIFY_LINK" == "null" ]]; then
    echo "FAILURE: Step 6 Verification failed (gog drive get error or link not found)."
    rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
    exit 1
fi
echo "SUCCESS: Verification successful. URL: $VERIFY_LINK"

# Step 7: Log
echo "7. Logging final result."
echo "Edited contents:" && cat "$FINAL_AGREEMENT_FILE"
echo "URL: $VERIFY_LINK"

rm -f "$TEMP_TEMPLATE_FILE" "$FINAL_AGREEMENT_FILE"
echo "--- Script Complete ---"