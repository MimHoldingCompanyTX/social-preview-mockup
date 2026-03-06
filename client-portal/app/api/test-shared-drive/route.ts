import { NextResponse } from 'next/server';
import { getDriveClient } from '../../../lib/google-drive';

const SHARED_DRIVE_ID = '0AL4HN_wvd5XnUk9PVA'; // Shared Drive ID from the URL

export async function GET() {
  try {
    const drive = await getDriveClient();
    const now = new Date();
    
    // Test 1: List root folders in Shared Drive
    console.log('Listing folders in Shared Drive...');
    const listResponse = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink)',
      q: `'${SHARED_DRIVE_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      orderBy: 'name asc',
    });
    
    const folders = listResponse.data.files || [];
    console.log(`Found ${folders.length} folders in Shared Drive root`);
    
    // Test 2: Create a test file in Shared Drive root
    console.log('Creating test file in Shared Drive...');
    const fileName = `test-shared-drive-${now.getTime()}.txt`;
    const content = `Created ${now.toISOString()} via Google Service Account API
    
Shared Drive Test File
Drive ID: ${SHARED_DRIVE_ID}
Service Account: openclaw-drive-manager@openclaw-design-drive.iam.gserviceaccount.com
Timestamp: ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })}
    
✅ This proves the service account CAN write to Shared Drives!`;
    
    const createResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [SHARED_DRIVE_ID],
        mimeType: 'text/plain',
      },
      media: {
        mimeType: 'text/plain',
        body: content,
      },
      fields: 'id, name, mimeType, webViewLink, createdTime',
      supportsAllDrives: true,
    });
    
    const file = createResponse.data;
    console.log('File created successfully:', file.id);
    
    return NextResponse.json({
      success: true,
      message: 'Shared Drive test successful',
      sharedDriveId: SHARED_DRIVE_ID,
      foldersFound: folders.length,
      fileCreated: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      },
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        type: folder.mimeType,
        link: folder.webViewLink,
      })),
      serviceAccountEmail: 'openclaw-drive-manager@openclaw-design-drive.iam.gserviceaccount.com',
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error testing Shared Drive:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test Shared Drive access',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack?.split('\n').slice(0, 10).join('\n') : '',
      sharedDriveId: SHARED_DRIVE_ID,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'unknown',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}