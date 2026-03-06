import { NextResponse } from 'next/server';
import { createFolder } from '../../../../lib/google-drive';

const CANONICAL_STEPS = [
  { number: '01', name: 'Initial_Contact', description: 'Initial consultation and contact information' },
  { number: '02', name: 'Agreement_Permissions', description: 'Client agreement and photo permissions' },
  { number: '03', name: 'Initial_Visit', description: 'On-site visit and assessment' },
  { number: '04', name: 'Moodboard', description: 'Design inspiration and mood board creation' },
  { number: '05', name: 'Shopping', description: 'Product selection and procurement' },
  { number: '06', name: 'Implementation', description: 'Installation and implementation' },
  { number: '07', name: 'Close_Out', description: 'Project completion and final walkthrough' },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { folderId, stepNumber } = body;

    if (!folderId || !stepNumber) {
      return NextResponse.json(
        { error: 'Missing folderId or stepNumber parameter' },
        { status: 400 }
      );
    }

    const canonicalStep = CANONICAL_STEPS.find(step => step.number === stepNumber);
    if (!canonicalStep) {
      return NextResponse.json(
        { error: `Invalid step number: ${stepNumber}` },
        { status: 400 }
      );
    }

    const folderName = `${canonicalStep.number}_${canonicalStep.name}`;
    
    let result: any;
    let source = '';
    
    // Try service account first
    try {
      result = await createFolderWithServiceAccount(folderId, folderName, canonicalStep);
      source = 'google-service-account';
    } catch (serviceAccountError) {
      console.error('Service account folder creation failed, falling back to GOG CLI:', serviceAccountError);
      result = await createFolderWithGog(folderId, folderName, canonicalStep);
      source = 'local-gog-fallback';
    }

    return NextResponse.json({
      success: true,
      message: `Created folder: ${folderName}`,
      folder: result.folder,
      source
    });
  } catch (error) {
    console.error('Error creating workflow folder:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create workflow folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createFolderWithServiceAccount(
  parentFolderId: string,
  folderName: string,
  canonicalStep: any
): Promise<{ folder: any }> {
  const folder = await createFolder(parentFolderId, folderName);
  
  return {
    folder: {
      id: folder.id!,
      name: folder.name!,
      stepNumber: canonicalStep.number,
      stepName: canonicalStep.name.replace(/_/g, ' '),
      stepDescription: canonicalStep.description,
      url: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`
    }
  };
}

async function createFolderWithGog(
  parentFolderId: string,
  folderName: string,
  canonicalStep: any
): Promise<{ folder: any }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const { stdout, stderr } = await execAsync(
    `gog drive mkdir "${folderName}" --parent "${parentFolderId}" --json`,
    { encoding: 'utf-8' }
  );

  if (stderr && !stderr.includes('Created folder')) {
    console.error('GOG CLI stderr:', stderr);
    throw new Error(`Failed to create folder: ${stderr}`);
  }

  let result: any;
  try {
    result = JSON.parse(stdout);
  } catch (parseError) {
    result = { folder: { id: 'unknown', name: folderName } };
  }

  const folderData = result.folder || result;

  return {
    folder: {
      id: folderData.id || 'unknown',
      name: folderName,
      stepNumber: canonicalStep.number,
      stepName: canonicalStep.name.replace(/_/g, ' '),
      stepDescription: canonicalStep.description,
      url: folderData.webViewLink || `https://drive.google.com/drive/folders/${folderData.id || 'unknown'}`
    }
  };
}