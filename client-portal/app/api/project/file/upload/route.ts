import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '../../../../../lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const folderId = formData.get('folderId') as string;
    const file = formData.get('file') as File;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId parameter' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    console.log('Uploading file:', file.name, file.type, file.size, 'to folder:', folderId);
    
    const result = await uploadFile(folderId, file);
    
    console.log('Upload successful:', result.id, result.name);
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: result.id,
        name: result.name,
        webViewLink: result.webViewLink,
        mimeType: result.mimeType,
        modifiedTime: result.modifiedTime,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: `Failed to upload file: ${error.message}` },
      { status: 500 }
    );
  }
}