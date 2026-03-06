import { NextResponse } from 'next/server';
import { listFolderContents } from '../../../../lib/google-drive';

interface WorkflowStep {
  id: string;
  name: string;
  stepNumber: string;
  stepName: string;
  stepDescription: string;
  modifiedTime: string;
  url: string;
  exists: boolean;
}

const CANONICAL_STEPS = [
  { number: '01', name: 'Initial_Contact', description: 'Initial consultation and contact information' },
  { number: '02', name: 'Agreement_Permissions', description: 'Client agreement and photo permissions' },
  { number: '03', name: 'Initial_Visit', description: 'On-site visit and assessment' },
  { number: '04', name: 'Moodboard', description: 'Design inspiration and mood board creation' },
  { number: '05', name: 'Shopping', description: 'Product selection and procurement' },
  { number: '06', name: 'Implementation', description: 'Installation and implementation' },
  { number: '07', name: 'Close_Out', description: 'Project completion and final walkthrough' },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId parameter' },
        { status: 400 }
      );
    }

    let steps: WorkflowStep[];
    let source = '';
    
    // Try service account first
    try {
      steps = await fetchStepsWithServiceAccount(folderId);
      source = 'google-service-account';
    } catch (serviceAccountError) {
      console.error('Service account failed, falling back to GOG CLI:', serviceAccountError);
      steps = await fetchStepsWithGog(folderId);
      source = 'local-gog-fallback';
    }

    const existingCount = steps.filter(s => s.exists).length;
    const missingCount = steps.length - existingCount;

    return NextResponse.json({ 
      steps,
      count: steps.length,
      existingCount,
      missingCount,
      source,
      folderId
    });
  } catch (error) {
    console.error('Error fetching workflow steps:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow steps',
        details: error instanceof Error ? error.message : 'Unknown error',
        steps: [],
        source: 'error'
      },
      { status: 500 }
    );
  }
}

async function fetchStepsWithServiceAccount(folderId: string): Promise<WorkflowStep[]> {
  const items = await listFolderContents(folderId, 100);
  
  const existingFolders = new Map<string, any>();
  items
    .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
    .forEach(item => {
      existingFolders.set(item.name!, item);
    });

  return CANONICAL_STEPS.map(canonical => {
    const folderName = `${canonical.number}_${canonical.name}`;
    const existing = existingFolders.get(folderName);
    
    if (existing) {
      return {
        id: existing.id!,
        name: folderName,
        stepNumber: canonical.number,
        stepName: canonical.name.replace(/_/g, ' '),
        stepDescription: canonical.description,
        modifiedTime: existing.modifiedTime!,
        url: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
        exists: true
      };
    } else {
      return {
        id: '',
        name: folderName,
        stepNumber: canonical.number,
        stepName: canonical.name.replace(/_/g, ' '),
        stepDescription: canonical.description,
        modifiedTime: '',
        url: '',
        exists: false
      };
    }
  });
}

async function fetchStepsWithGog(folderId: string): Promise<WorkflowStep[]> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const { stdout, stderr } = await execAsync(
    `gog drive ls --parent "${folderId}" --json --max 100`,
    { encoding: 'utf-8' }
  );

  if (stderr) {
    console.error('GOG CLI stderr:', stderr);
  }

  let data: { files: any[] } = { files: [] };
  try {
    data = JSON.parse(stdout);
  } catch (parseError) {
    throw new Error('Failed to parse folder data');
  }

  const existingFolders = new Map<string, any>();
  data.files
    .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
    .forEach(item => {
      existingFolders.set(item.name, item);
    });

  return CANONICAL_STEPS.map(canonical => {
    const folderName = `${canonical.number}_${canonical.name}`;
    const existing = existingFolders.get(folderName);
    
    if (existing) {
      return {
        id: existing.id,
        name: folderName,
        stepNumber: canonical.number,
        stepName: canonical.name.replace(/_/g, ' '),
        stepDescription: canonical.description,
        modifiedTime: existing.modifiedTime,
        url: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
        exists: true
      };
    } else {
      return {
        id: '',
        name: folderName,
        stepNumber: canonical.number,
        stepName: canonical.name.replace(/_/g, ' '),
        stepDescription: canonical.description,
        modifiedTime: '',
        url: '',
        exists: false
      };
    }
  });
}