---
name: drive-md-agreement
description: Create dated client agreements from a Markdown template on Google Drive without in-place edits. Use when you need to: (1) download the master MD template, (2) edit locally, (3) upload final MD to the Client Agreements folder, (4) clean up local temp files. Never read or edit Drive file contents via GOG; only upload/download.
---

# Drive MD Agreement — SOP

Inputs
- templateName: Service_Agreement.md
- templateParentId: 1pAr-DFtInVldtvvRpc-2HjfCLGHoYJaH (Client Success Kit)
- parentFolderId: 1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F (Client Agreements)
- clientName: e.g., Tom Bieger
- date: YYYY-MM-DD (zero-padded)
- priceMode: ProBono | Standard

Rules
- Use `gog` ONLY for download/upload. No in-place content ops (no docs cat/get).
- Edit locally, then upload. Always date-prefix client files.
- If naming is wrong, FIX LOCALLY and re-upload (do not rename in Drive).

Procedure
1) Resolve template ID by name within the template parent folder:
   gog drive search "'${templateParentId}' in parents and name = '${templateName}'" --max 5 --json
   (take first id)
2) Download locally:
   gog drive download <templateId> --out /tmp/Agreement_Template.md
3) Local edit (no headers in liability clause). Replace placeholders:
   - CLIENT NAME → {clientName}
   - DATE → {date}
   - If priceMode=ProBono, replace **$199** with **~~$199~~ $0.00**
4) Save as:
   /tmp/{date}_Agreement_{ClientName}_ProBono.md (or _Standard.md)
5) Upload:
   gog drive upload /tmp/{datedFile}.md --parent {parentFolderId} --json
6) Cleanup temps:
   rm /tmp/Agreement_Template.md /tmp/{datedFile}.md

Error handling
- If search returns 0 or >1 ambiguous templates, stop and report.
- If upload JSON lacks id/size, stop and report.

See scripts/create_agreement.sh for an executable helper.
