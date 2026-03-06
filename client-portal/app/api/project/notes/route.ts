import { NextResponse } from 'next/server';
import { createOrUpdateTextFile, findFileInFolder, getTextFileContent } from '../../../../lib/google-drive';

const NOTES_FILENAME_PREFIX = 'notes_';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const stepName = searchParams.get('stepName') || 'initial_contact';
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId parameter' },
        { status: 400 }
      );
    }
    
    const fileName = `${NOTES_FILENAME_PREFIX}${stepName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    
    // Look for existing notes file
    const existingFile = await findFileInFolder(folderId, fileName);
    
    if (!existingFile) {
      return NextResponse.json({
        exists: false,
        message: 'No notes file found',
        folderId,
        fileName: `${NOTES_FILENAME_PREFIX}${stepName.toLowerCase().replace(/\s+/g, '_')}.txt`,
      });
    }
    
    // Fetch the content
    const content = await getTextFileContent(existingFile.id!);
    
    return NextResponse.json({
      exists: true,
      file: {
        id: existingFile.id,
        name: existingFile.name,
        url: existingFile.webViewLink,
      },
      content,
      folderId,
      fileName,
      stepName,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch notes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { folderId, content, stepName = 'initial_contact' } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId in request body' },
        { status: 400 }
      );
    }
    
    if (content === undefined) {
      return NextResponse.json(
        { error: 'Missing content in request body' },
        { status: 400 }
      );
    }
    
    const fileName = `${NOTES_FILENAME_PREFIX}${stepName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    console.log(`Saving notes to folder ${folderId} as ${fileName}...`);
    const file = await createOrUpdateTextFile(folderId, fileName, content);
    
    return NextResponse.json({
      success: true,
      message: 'Notes saved successfully',
      file: {
        id: file.id,
        name: file.name,
        url: file.webViewLink,
        modifiedTime: (file as any).modifiedTime,
      },
      folderId,
      fileName,
      stepName,
    });
  } catch (error) {
    console.error('Error saving notes:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save notes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}