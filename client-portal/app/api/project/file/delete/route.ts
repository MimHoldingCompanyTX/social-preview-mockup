import { NextResponse } from 'next/server';
import { moveFileToTrash } from '../../../../../lib/google-drive';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    const result = await moveFileToTrash(fileId);
    
    return NextResponse.json({
      success: true,
      message: 'File moved to trash',
      file: {
        id: result.id,
        name: result.name,
        trashed: result.trashed,
      },
    });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: `Failed to delete file: ${error.message}` },
      { status: 500 }
    );
  }
}