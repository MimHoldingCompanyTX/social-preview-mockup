/**
 * Google Drive Configuration
 * 
 * IMPORTANT: The client_portal folder needs to be moved to a Shared Drive
 * for full write access via the service account.
 */

// Current client_portal folder ID (this ID stays the same even after moving to Shared Drive)
export const PARENT_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

// Your Shared Drive ID (where the folder should be moved)
export const SHARED_DRIVE_ID = '0AL4HN_wvd5XnUk9PVA';

/**
 * MIGRATION INSTRUCTIONS:
 * 
 * 1. Open Google Drive in your browser
 * 2. Find the "client_portal" folder (ID: ${PARENT_FOLDER_ID})
 * 3. Right-click on it and select "Move to"
 * 4. Choose your Shared Drive (ID: ${SHARED_DRIVE_ID})
 * 5. Click "Move"
 * 
 * IMPORTANT: The folder ID WILL NOT CHANGE after moving. The same
 * PARENT_FOLDER_ID above will continue to work, but now the service
 * account will have full write access because the folder is in a
 * Shared Drive where the service account has editor permissions.
 * 
 * After moving:
 * - The service account can create/update/delete files in the folder
 * - All existing client subfolders remain intact
 * - No code changes needed (the ID stays the same)
 * 
 * Verification:
 * 1. Run the test endpoint: /api/test-shared-drive
 * 2. Try creating a new client via the UI
 * 3. Check that file creation works in workflow folders
 */