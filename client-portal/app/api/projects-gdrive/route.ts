import { NextResponse } from 'next/server';
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
      throw new Error('Failed to parse folder data');
    }

    const projects: Project[] = data.files
      .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
      .map(item => parseProjectFolder(item))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({ 
      projects,
      source: 'local-gog',
      count: projects.length
    });
  } catch (error) {
    console.error('Error fetching projects from GOG:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
        projects: [],
        source: 'local-gog-error'
      },
      { status: 500 }
    );
  }
}

function parseProjectFolder(item: any): Project {
  const folderName = item.name;
  let clientName = folderName;
  let date = '';
  let formattedDate = '';
  
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
    date = item.modifiedTime.split('T')[0];
    formattedDate = new Date(item.modifiedTime).toLocaleDateString('en-US', {
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
    createdTime: item.modifiedTime,
    url: item.webViewLink || `https://drive.google.com/drive/folders/${item.id}`
  };
}
