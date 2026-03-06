import { NextResponse } from 'next/server';
import { createTextFile } from '../../../lib/google-drive';

export async function GET() {
  try {
    const parentFolderId = '14yGhPXXxsySwPefoezWbEIj-t0Gku3o2'; // Amazing Plan Working -> Initial Contact folder
    const fileName = 'readme.txt';
    const now = new Date();
    const content = `Created ${now.toISOString()} via Google Service Account API
    
This file was automatically created by the Client Portal system using the Google Service Account authentication.
    
Client: Amazing Plan Working
Folder: Initial Contact
Service Account: openclaw-drive-manager@openclaw-design-drive.iam.gserviceaccount.com
Timestamp: ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })}
    
✅ Yes, the Google Service Account API works for creating, updating, and deleting files in Google Drive.`;

    console.log(`Creating ${fileName} in folder ${parentFolderId}...`);
    
    const file = await createTextFile(parentFolderId, fileName, content);
    
    return NextResponse.json({
      success: true,
      message: 'File created successfully via Google Service Account API',
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      },
      serviceAccountEmail: 'openclaw-drive-manager@openclaw-design-drive.iam.gserviceaccount.com',
      folderId: parentFolderId,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error creating file:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create file',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : '',
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'unknown',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}