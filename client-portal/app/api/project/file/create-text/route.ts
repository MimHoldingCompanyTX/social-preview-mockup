import { NextRequest, NextResponse } from 'next/server';
import { createTextFile } from '../../../../../lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const { folderId, fileName, content } = await request.json();

    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId parameter' },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: 'Missing fileName parameter' },
        { status: 400 }
      );
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Missing content parameter' },
        { status: 400 }
      );
    }

    console.log('Creating text file:', fileName, 'in folder:', folderId, 'content length:', content.length);
    
    const result = await createTextFile(folderId, fileName, content);
    
    console.log('Create successful:', result.id, result.name);
    
    return NextResponse.json({
      success: true,
      message: 'File created successfully',
      file: {
        id: result.id,
        name: result.name,
        webViewLink: result.webViewLink,
        mimeType: result.mimeType,
        createdTime: (result as any).createdTime,
        modifiedTime: (result as any).modifiedTime,
      },
    });
  } catch (error: any) {
    console.error('Error creating text file:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: `Failed to create file: ${error.message}` },
      { status: 500 }
    );
  }
}