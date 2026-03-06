import { NextResponse } from 'next/server';
import { listFolders } from '../../../lib/google-drive';
import { PARENT_FOLDER_ID } from '../../../lib/config';

interface Project {
  id: string;
  folderName: string;
  clientName: string;
  date: string;
  formattedDate: string;
  createdTime: string;
  url: string;
}

export async function GET() {
  try {
    // Try service account first
    const projects = await fetchProjectsWithServiceAccount();
    
    return NextResponse.json({ 
      projects,
      source: 'google-service-account',
      count: projects.length
    });
  } catch (serviceAccountError) {
    console.error('Service account failed, falling back to GOG CLI:', serviceAccountError);
    
    try {
      // Fallback to GOG CLI
      const projects = await fetchProjectsWithGog();
      return NextResponse.json({ 
        projects,
        source: 'local-gog-fallback',
        count: projects.length
      });
    } catch (gogError) {
      console.error('GOG CLI also failed:', gogError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch projects from both service account and GOG CLI',
          details: {
            serviceAccountError: serviceAccountError instanceof Error ? serviceAccountError.message : 'Unknown',
            gogError: gogError instanceof Error ? gogError.message : 'Unknown',
          },
          projects: [],
          source: 'all-failed'
        },
        { status: 500 }
      );
    }
  }
}

async function fetchProjectsWithServiceAccount(): Promise<Project[]> {
  const folders = await listFolders(PARENT_FOLDER_ID, 100);
  
  const projects: Project[] = folders.map(item => parseProjectFolder(item));
  
  // Sort by date descending (newest first)
  return projects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function fetchProjectsWithGog(): Promise<Project[]> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const { stdout, stderr } = await execAsync(
    `gog drive ls --parent "${PARENT_FOLDER_ID}" --json --max 100`,
    { encoding: 'utf-8' }
  );

  if (stderr) {
    console.error('GOG CLI stderr:', stderr);
  }

  let data: { files: any[] } = { files: [] };
  try {
    data = JSON.parse(stdout);
  } catch (parseError) {
    throw new Error('Failed to parse folder data from GOG CLI');
  }

  const projects: Project[] = data.files
    .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
    .map(item => parseProjectFolder(item))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return projects;
}

function parseProjectFolder(item: any): Project {
  const folderName = item.name;
  let clientName = folderName;
  let date = '';
  let formattedDate = '';
  
  // Extract date from folder name format: YYYY-MM-DD_Client_Name
  const dateMatch = folderName.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (dateMatch) {
    date = dateMatch[1];
    clientName = dateMatch[2].replace(/_/g, ' ');
    formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    // Fallback to modified time
    date = item.modifiedTime?.split('T')[0] || new Date().toISOString().split('T')[0];
    formattedDate = new Date(item.modifiedTime || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return {
    id: item.id,
    folderName,
    clientName,
    date,
    formattedDate,
    createdTime: item.modifiedTime || item.createdTime || new Date().toISOString(),
    url: item.webViewLink || `https://drive.google.com/drive/folders/${item.id}`
  };
}