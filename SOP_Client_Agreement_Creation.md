# Standard Operating Procedure (SOP): Client Agreement Creation

**Goal:** Create a dated, client-specific Service Agreement Markdown file for Google Drive, based on the Master Template.

**Source of Truth:** The master template is the latest header-less Markdown file in the **Client Success Kit** folder (File ID: `1-jZ4MetdbRq3MT9P5FoxSDk5zTrvkWu2`).

**Workflow:**
1.  **Download Template Locally:** Use `gog drive get <TemplateID> --out /path/to/Agreement_Template_Temp.md` to fetch the master copy.
2.  **Local Edit:** Use a local editor (TextEdit/VSCode) to create the new client file.
    *   **Template Content:** Use the exact, header-less content from the downloaded file.
    *   **Client Specifics:** Insert Client Name, Date (YYYY-MM-DD format, zero-padded), and set the correct price.
    *   **Save As:** Save the new file with the required naming convention: `YYYY-MM-DD_Agreement_ClientName.md`.
3.  **Upload to Drive:** Use `gog drive upload /path/to/new/file.md --parent <ClientAgreementsFolderID>` to place the final file in the correct folder.
4.  **Cleanup:** Delete the temporary local files (`Agreement_Template_Temp.md` and the local client agreement source file).
5.  **Memory Update:** Update the local Drive ID map with the new client file ID.

**Current Known IDs for Reference (Use for Upload/Get only):**
*   Client Agreements Folder ID: `1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F`
*   Master Template File ID: `1-jZ4MetdbRq3MT9P5FoxSDk5zTrvkWu2`
