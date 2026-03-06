import { NextResponse } from 'next/server';
import { createFolder, listFolders } from '../../../../lib/google-drive';
import { PARENT_FOLDER_ID } from '../../../../lib/config';

interface Project {
  id: string;
  folderName: string;
  clientName: string;
  date: string;
  formattedDate: string;
  createdTime: string;
  url: string;
}

export async function POST(request: Request) {
  try {
    const { clientName } = await request.json();

    if (!clientName) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Generate folder name with today's date
    const today = new Date().toISOString().split('T')[0];
    const folderName = `${today}_${clientName.replace(/\s+/g, '_')}`;

    let project: Project;
    let source = '';
    
    // Try service account first
    try {
      project = await createFolderWithServiceAccount(folderName, clientName, today);
      source = 'google-service-account';
    } catch (serviceAccountError) {
      console.error('Service account folder creation failed, falling back to GOG CLI:', serviceAccountError);
      project = await createFolderWithGog(folderName, clientName, today);
      source = 'gog-mkdir-fallback';
    }

    return NextResponse.json(
      { project, source, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating client folder:', error);
    return NextResponse.json(
      {
        error: 'Failed to create client folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createFolderWithServiceAccount(
  folderName: string, 
  clientName: string, 
  today: string
): Promise<Project> {
  const folder = await createFolder(PARENT_FOLDER_ID, folderName);
  
  return {
    id: folder.id!,
    folderName: folder.name!,
    clientName,
    date: today,
    formattedDate: new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    createdTime: new Date().toISOString(),
    url: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`
  };
}

async function createFolderWithGog(
  folderName: string, 
  clientName: string, 
  today: string
): Promise<Project> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const { stdout, stderr } = await execAsync(
    `gog drive mkdir "${folderName}" --parent "${PARENT_FOLDER_ID}" --json`,
    { encoding: 'utf-8' }
  );

  if (stderr) {
    console.error('GOG mkdir stderr:', stderr);
  }

  let folderData: any = {};
  try {
    folderData = JSON.parse(stdout);
  } catch (parseError) {
    throw new Error('Failed to parse folder creation response');
  }

  const actualFolder = folderData.folder || folderData;

  return {
    id: actualFolder.id,
    folderName: actualFolder.name,
    clientName,
    date: today,
    formattedDate: new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    createdTime: actualFolder.createdTime || new Date().toISOString(),
    url: actualFolder.webViewLink || `https://drive.google.com/drive/folders/${actualFolder.id}`
  };
}