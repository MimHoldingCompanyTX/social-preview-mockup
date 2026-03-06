import { NextResponse } from 'next/server';
import { createOrUpdateTextFile, findFileInFolder, getTextFileContent } from '../../../../lib/google-drive';

const INITIAL_CONTACT_FILENAME = 'initial_contact.json';

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
    
    // Look for existing initial contact file
    const existingFile = await findFileInFolder(folderId, INITIAL_CONTACT_FILENAME);
    
    if (!existingFile) {
      return NextResponse.json({
        exists: false,
        message: 'No initial contact file found',
        folderId,
        fileName: INITIAL_CONTACT_FILENAME,
        data: null,
      });
    }
    
    // Fetch the content
    const content = await getTextFileContent(existingFile.id!);
    let data = null;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing JSON from file:', parseError);
      // If file exists but malformed, return empty data
      data = null;
    }
    
    return NextResponse.json({
      exists: true,
      file: {
        id: existingFile.id,
        name: existingFile.name,
        url: existingFile.webViewLink,
      },
      data,
      folderId,
      fileName: INITIAL_CONTACT_FILENAME,
    });
  } catch (error) {
    console.error('Error fetching initial contact data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch initial contact data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { folderId, data } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId in request body' },
        { status: 400 }
      );
    }
    
    if (data === undefined) {
      return NextResponse.json(
        { error: 'Missing data in request body' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (typeof data.name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing name field' },
        { status: 400 }
      );
    }
    
    // Ensure address is an array of up to 3 strings
    const address = data.address || [];
    if (!Array.isArray(address)) {
      data.address = [address];
    }
    // Trim and filter empty lines
    data.address = data.address.slice(0, 3).map((line: string) => line || '').filter((line: string) => line.trim() !== '');
    
    // Ensure email and phone are strings (optional)
    data.email = data.email || '';
    data.phone = data.phone || '';
    data.narrative = data.narrative || '';
    
    const content = JSON.stringify(data, null, 2);
    console.log(`Saving initial contact to folder ${folderId} as ${INITIAL_CONTACT_FILENAME}...`);
    const file = await createOrUpdateTextFile(folderId, INITIAL_CONTACT_FILENAME, content);
    
    return NextResponse.json({
      success: true,
      message: 'Initial contact data saved successfully',
      file: {
        id: file.id,
        name: file.name,
        url: file.webViewLink,
        modifiedTime: (file as any).modifiedTime,
      },
      folderId,
      fileName: INITIAL_CONTACT_FILENAME,
      data,
    });
  } catch (error) {
    console.error('Error saving initial contact data:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save initial contact data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}