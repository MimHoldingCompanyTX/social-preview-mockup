import { NextResponse } from 'next/server';
import { getDriveClient } from '../../../lib/google-drive';

const OLD_PARENT_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6'; // Current client_portal folder in personal Drive
const SHARED_DRIVE_ID = '0AL4HN_wvd5XnUk9PVA'; // Target Shared Drive

export async function GET() {
  try {
    const drive = await getDriveClient();
    console.log('Attempting to move client_portal folder to Shared Drive...');
    
    // Step 1: Get the current client_portal folder
    let clientPortalFolder;
    try {
      const getResponse = await drive.files.get({
        fileId: OLD_PARENT_FOLDER_ID,
        fields: 'id, name, mimeType, webViewLink, capabilities, parents',
        supportsAllDrives: true,
      });
      clientPortalFolder = getResponse.data;
      console.log(`Found folder: ${clientPortalFolder.name} (${clientPortalFolder.id})`);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Could not find source folder',
        message: error instanceof Error ? error.message : 'Unknown error',
        oldFolderId: OLD_PARENT_FOLDER_ID,
      }, { status: 404 });
    }
    
    // Step 2: Check if folder is already in Shared Drive
    const currentParents = await drive.files.get({
      fileId: OLD_PARENT_FOLDER_ID,
      fields: 'parents',
      supportsAllDrives: true,
    });
    
    console.log('Current parents:', currentParents.data.parents);
    
    // Step 3: Try to move the folder to Shared Drive
    // This requires adding the new parent and removing the old parent
    try {
      console.log(`Moving folder ${OLD_PARENT_FOLDER_ID} to Shared Drive ${SHARED_DRIVE_ID}...`);
      
      const updateResponse = await drive.files.update({
        fileId: OLD_PARENT_FOLDER_ID,
        addParents: SHARED_DRIVE_ID,
        removeParents: currentParents.data.parents?.join(',') || '',
        supportsAllDrives: true,
        fields: 'id, name, parents, webViewLink',
      });
      
      console.log('Move successful:', updateResponse.data);
      
      return NextResponse.json({
        success: true,
        message: 'Folder moved to Shared Drive successfully',
        oldFolder: {
          id: OLD_PARENT_FOLDER_ID,
          name: clientPortalFolder.name,
          oldParents: currentParents.data.parents,
        },
        newFolder: {
          id: updateResponse.data.id,
          name: updateResponse.data.name,
          parents: updateResponse.data.parents,
          url: updateResponse.data.webViewLink,
        },
        sharedDriveId: SHARED_DRIVE_ID,
      });
    } catch (moveError) {
      console.error('Move failed:', moveError);
      
      // Alternative: Copy folder instead of moving
      console.log('Trying to copy folder instead...');
      try {
        const copyResponse = await drive.files.copy({
          fileId: OLD_PARENT_FOLDER_ID,
          requestBody: {
            name: `client_portal_copy_${Date.now()}`,
            parents: [SHARED_DRIVE_ID],
          },
          supportsAllDrives: true,
          fields: 'id, name, webViewLink',
        });
        
        return NextResponse.json({
          success: true,
          message: 'Folder copied to Shared Drive (could not move)',
          note: 'The original folder remains in personal Drive; a copy was created in Shared Drive',
          originalFolder: {
            id: OLD_PARENT_FOLDER_ID,
            name: clientPortalFolder.name,
          },
          copiedFolder: {
            id: copyResponse.data.id,
            name: copyResponse.data.name,
            url: copyResponse.data.webViewLink,
          },
          sharedDriveId: SHARED_DRIVE_ID,
        });
      } catch (copyError) {
        return NextResponse.json({
          success: false,
          error: 'Both move and copy failed',
          messages: {
            moveError: moveError instanceof Error ? moveError.message : 'Unknown',
            copyError: copyError instanceof Error ? copyError.message : 'Unknown',
          },
          recommendation: 'Manually move the folder in Google Drive UI, then update the PARENT_FOLDER_ID in the app',
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Check service account permissions and try again',
    }, { status: 500 });
  }
}