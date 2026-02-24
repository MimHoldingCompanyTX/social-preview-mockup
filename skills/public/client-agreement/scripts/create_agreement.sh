#!/usr/bin/env bash
set -euo pipefail

# Usage: create_agreement.sh "Client Name" YYYY-MM-DD ProBono
CLIENT_NAME=${1:?Client name}
DATE=${2:?Date YYYY-MM-DD}
PRICE_MODE=${3:-ProBono}

TEMPLATE_PARENT_ID="ROOT_ID_UNUSED"
TEMPLATE_NAME="Service_Agreement.md"
PARENT_FOLDER_ID="1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F"

TMP_TEMPLATE="/tmp/Agreement_Template.md"
OUT_FILE="/tmp/${DATE}_Agreement_${CLIENT_NAME// /_}_${PRICE_MODE}.md"

# 1) Resolve template ID by name within parent
TID=17mAb-4u5j95vTLydxojtrwdgXe5KwHHU
if [[ -z "${TID}" || "${TID}" == "null" ]]; then
  echo "ERROR: Template not found" >&2
  exit 1
fi

# 2) Download
gog drive download "${TID}" --out "${TMP_TEMPLATE}"

# 3) Local edit
cp "${TMP_TEMPLATE}" "${OUT_FILE}"
# Replace placeholders safely
sed -i '' -e "s/\*\*CLIENT NAME:\*\* .*$/**CLIENT NAME:** ${CLIENT_NAME}  /" "${OUT_FILE}"
sed -i '' -e "s/\*\*DATE:\*\* .*$/**DATE:** ${DATE}/" "${OUT_FILE}"

if [[ "${PRICE_MODE}" == "ProBono" ]]; then
  sed -i '' -e 's/\*\*\$199\*\*/**~~\$199~~ $0.00**/' "${OUT_FILE}"
fi

# 4) Upload
UPLOAD_JSON=$(gog drive upload "${OUT_FILE}" --parent "${PARENT_FOLDER_ID}" --json)
FILE_ID=$(echo "$UPLOAD_JSON" | jq -r '.file.id // empty')
NAME=$(echo "$UPLOAD_JSON" | jq -r '.file.name // empty')
SIZE=$(echo "$UPLOAD_JSON" | jq -r '.file.size // empty')

if [[ -z "$FILE_ID" || -z "$SIZE" ]]; then
  echo "ERROR: Upload failed: $UPLOAD_JSON" >&2
  exit 1
fi

echo "OK: ${NAME} → ${FILE_ID}"

# 5) Cleanup
rm -f "${TMP_TEMPLATE}" "${OUT_FILE}"
