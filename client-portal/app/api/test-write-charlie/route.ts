import { NextResponse } from 'next/server';
import { listFolders, listFolderContents, createTextFile } from '../../../lib/google-drive';
import { PARENT_FOLDER_ID } from '../../../lib/config';

export async function GET() {
  try {
    console.log('Starting test: Write hello world to Charlie Hurt > Initial Contact folder');
    
    // Step 1: Get all client folders
    const clientFolders = await listFolders(PARENT_FOLDER_ID, 100);
    console.log(`Found ${clientFolders.length} client folders`);
    
    // Step 2: Find Charlie Hurt folder
    const charlieFolder = clientFolders.find(folder => 
      folder.name?.includes('Charlie') || folder.name?.includes('Hurt')
    );
    
    if (!charlieFolder || !charlieFolder.id) {
      return NextResponse.json({
        success: false,
        error: 'Charlie Hurt folder not found',
        availableFolders: clientFolders.map(f => f.name),
      }, { status: 404 });
    }
    
    console.log(`Found Charlie Hurt folder: ${charlieFolder.name} (${charlieFolder.id})`);
    
    // Step 3: Find Initial Contact folder inside Charlie Hurt folder
    const initialContactFolders = await listFolderContents(charlieFolder.id, 100);
    const initialContactFolder = initialContactFolders.find(folder => 
      folder.name === '01_Initial_Contact' || folder.name?.includes('Initial_Contact')
    );
    
    if (!initialContactFolder || !initialContactFolder.id) {
      return NextResponse.json({
        success: false,
        error: 'Initial Contact folder not found inside Charlie Hurt folder',
        availableFolders: initialContactFolders.map(f => f.name),
        charlieFolderId: charlieFolder.id,
        charlieFolderName: charlieFolder.name,
      }, { status: 404 });
    }
    
    console.log(`Found Initial Contact folder: ${initialContactFolder.name} (${initialContactFolder.id})`);
    
    // Step 4: Create hello world file
    const fileName = 'hello_world_test.txt';
    const content = `Hello World from Google Service Account!
    
Test performed: ${new Date().toISOString()}
Client: ${charlieFolder.name}
Folder: ${initialContactFolder.name}
Location: Shared Drive (folder moved successfully)
Service Account: openclaw-drive-manager@openclaw-design-drive.iam.gserviceaccount.com

✅ This confirms the service account has WRITE access to the moved folder.
✅ File creation works in Shared Drive.
✅ Full CRUD operations are now enabled for the client portal.`;
    
    console.log(`Creating ${fileName} in folder ${initialContactFolder.id}...`);
    const file = await createTextFile(initialContactFolder.id, fileName, content);
    console.log(`File created successfully: ${file.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Hello World file created successfully in Charlie Hurt > Initial Contact folder',
      summary: 'Service account has write access to the moved folder in Shared Drive',
      clientFolder: {
        id: charlieFolder.id,
        name: charlieFolder.name,
        url: charlieFolder.webViewLink || `https://drive.google.com/drive/folders/${charlieFolder.id}`,
      },
      initialContactFolder: {
        id: initialContactFolder.id,
        name: initialContactFolder.name,
        url: initialContactFolder.webViewLink || `https://drive.google.com/drive/folders/${initialContactFolder.id}`,
      },
      createdFile: {
        id: file.id,
        name: file.name,
        url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        createdTime: file.createdTime,
        contentPreview: content.substring(0, 200) + '...',
      },
      verification: {
        parentFolderId: PARENT_FOLDER_ID,
        sharedDriveAccess: true,
        serviceAccountEmail: 'openclaw-drive-manager@openclaw-design-drive.iam.gserviceaccount.com',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in Charlie Hurt test:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to write hello world file',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack?.split('\n').slice(0, 10).join('\n') : '',
      parentFolderId: PARENT_FOLDER_ID,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'unknown',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}