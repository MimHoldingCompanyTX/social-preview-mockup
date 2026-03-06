import { NextRequest, NextResponse } from 'next/server';
import { updateTextFile } from '../../../../../lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const { fileId, content } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Missing content parameter' },
        { status: 400 }
      );
    }

    console.log('Updating text file:', fileId, 'content length:', content.length);
    
    const result = await updateTextFile(fileId, content);
    
    console.log('Update successful:', result.id, result.name);
    
    return NextResponse.json({
      success: true,
      message: 'File updated successfully',
      file: {
        id: result.id,
        name: result.name,
        webViewLink: result.webViewLink,
        mimeType: result.mimeType,
        modifiedTime: (result as any).modifiedTime,
      },
    });
  } catch (error: any) {
    console.error('Error updating text file:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: `Failed to update file: ${error.message}` },
      { status: 500 }
    );
  }
}