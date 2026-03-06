import { NextResponse } from 'next/server';
import { listFolderContents } from '../../../../lib/google-drive';

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

    const items = await listFolderContents(folderId, 100);
    
    // Categorize items
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');
    
    // Group files by type
    const images = files.filter(file => 
      file.mimeType?.startsWith('image/') || 
      file.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    const documents = files.filter(file => 
      file.mimeType?.includes('document') || 
      file.name?.match(/\.(pdf|doc|docx|txt|rtf|odt|pages)$/i)
    );
    
    const spreadsheets = files.filter(file => 
      file.mimeType?.includes('spreadsheet') || 
      file.name?.match(/\.(xls|xlsx|csv|ods|numbers)$/i)
    );
    
    const presentations = files.filter(file => 
      file.mimeType?.includes('presentation') || 
      file.name?.match(/\.(ppt|pptx|key|odp)$/i)
    );
    
    const otherFiles = files.filter(file => 
      !images.includes(file) && 
      !documents.includes(file) && 
      !spreadsheets.includes(file) && 
      !presentations.includes(file)
    );

    return NextResponse.json({
      success: true,
      folderId,
      totalItems: items.length,
      byType: {
        folders: folders.length,
        images: images.length,
        documents: documents.length,
        spreadsheets: spreadsheets.length,
        presentations: presentations.length,
        other: otherFiles.length,
      },
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 
              item.mimeType?.startsWith('image/') ? 'image' :
              item.mimeType?.includes('document') ? 'document' :
              item.mimeType?.includes('spreadsheet') ? 'spreadsheet' :
              item.mimeType?.includes('presentation') ? 'presentation' : 'file',
        createdTime: item.createdTime,
        modifiedTime: item.modifiedTime,
        url: item.webViewLink || `https://drive.google.com/${item.mimeType === 'application/vnd.google-apps.folder' ? 'drive/folders' : 'file/d'}/${item.id}`,
        size: (item as any).size || 'unknown',
        icon: getIconForType(item.mimeType ?? undefined, item.name ?? undefined),
        thumbnailLink: item.thumbnailLink || null,
        webContentLink: item.webContentLink || null,
      })),
      groupedItems: {
        folders,
        images,
        documents,
        spreadsheets,
        presentations,
        otherFiles,
      },
    });
  } catch (error) {
    console.error('Error fetching step contents:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch step contents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getIconForType(mimeType?: string, fileName?: string): string {
  if (!mimeType && !fileName) return '📄';
  
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType?.includes('document')) return '📝';
  if (mimeType?.includes('spreadsheet')) return '📊';
  if (mimeType?.includes('presentation')) return '📽️';
  if (mimeType?.includes('pdf')) return '📕';
  
  if (fileName?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) return '🖼️';
  if (fileName?.match(/\.(pdf)$/i)) return '📕';
  if (fileName?.match(/\.(doc|docx|txt|rtf|odt|pages)$/i)) return '📝';
  if (fileName?.match(/\.(xls|xlsx|csv|ods|numbers)$/i)) return '📊';
  if (fileName?.match(/\.(ppt|pptx|key|odp)$/i)) return '📽️';
  if (fileName?.match(/\.(zip|rar|7z|tar|gz)$/i)) return '📦';
  
  return '📄';
}