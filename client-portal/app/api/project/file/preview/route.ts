import { NextResponse } from 'next/server';
import { getDriveClient } from '../../../../../lib/google-drive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const mimeType = searchParams.get('mimeType') || '';
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    const drive = await getDriveClient();
    
    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink',
      supportsAllDrives: true,
    });

    const metadata = fileMetadata.data;
    
    // Determine what we can do based on file type
    if (mimeType.startsWith('image/')) {
      // For images, get the thumbnail
      try {
        const thumbnailResponse = await drive.files.get({
          fileId,
          alt: 'media',
          supportsAllDrives: true,
        }, { responseType: 'arraybuffer' });
        
        const buffer = Buffer.from(thumbnailResponse.data as ArrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        return NextResponse.json({
          success: true,
          type: 'image',
          dataUrl,
          metadata: {
            id: metadata.id,
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size,
            url: metadata.webViewLink,
          },
        });
      } catch (imageError) {
        // Fall back to metadata with thumbnail URL
        return NextResponse.json({
          success: true,
          type: 'image',
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
          metadata: {
            id: metadata.id,
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size,
            url: metadata.webViewLink,
          },
        });
      }
    } else if (mimeType === 'text/markdown' || (metadata.name && metadata.name.toLowerCase().endsWith('.md'))) {
      // For markdown files, get the content
      try {
        const contentResponse = await drive.files.get({
          fileId,
          alt: 'media',
          supportsAllDrives: true,
        }, { responseType: 'text' });
        
        return NextResponse.json({
          success: true,
          type: 'markdown',
          content: contentResponse.data as string,
          metadata: {
            id: metadata.id,
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size,
            url: metadata.webViewLink,
          },
        });
      } catch (textError) {
        return NextResponse.json({
          success: false,
          type: 'markdown',
          error: 'Failed to fetch markdown content',
          metadata: {
            id: metadata.id,
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size,
            url: metadata.webViewLink,
          },
        });
      }
    } else if (mimeType === 'text/plain' || 
               mimeType === 'application/json' ||
               mimeType === 'text/html' ||
               mimeType === 'text/css' ||
               mimeType === 'text/javascript') {
      // For other text files, get the content
      try {
        const contentResponse = await drive.files.get({
          fileId,
          alt: 'media',
          supportsAllDrives: true,
        }, { responseType: 'text' });
        
        return NextResponse.json({
          success: true,
          type: 'text',
          content: contentResponse.data as string,
          metadata: {
            id: metadata.id,
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size,
            url: metadata.webViewLink,
          },
        });
      } catch (textError) {
        return NextResponse.json({
          success: false,
          type: 'text',
          error: 'Failed to fetch text content',
          metadata: {
            id: metadata.id,
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size,
            url: metadata.webViewLink,
          },
        });
      }
    } else if (mimeType === 'application/pdf') {
      // For PDFs, return embed URL
      return NextResponse.json({
        success: true,
        type: 'pdf',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    } else if (mimeType === 'application/vnd.google-apps.document') {
      return NextResponse.json({
        success: true,
        type: 'google-doc',
        embedUrl: `https://docs.google.com/document/d/${fileId}/preview`,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return NextResponse.json({
        success: true,
        type: 'google-sheet',
        embedUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      return NextResponse.json({
        success: true,
        type: 'google-slide',
        embedUrl: `https://docs.google.com/presentation/d/${fileId}/preview`,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    } else if (mimeType.startsWith('video/')) {
      // For video files, return embed URL for Google Drive preview
      return NextResponse.json({
        success: true,
        type: 'video',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    } else if (mimeType.startsWith('audio/')) {
      // For audio files, return embed URL for Google Drive preview
      return NextResponse.json({
        success: true,
        type: 'audio',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    } else {
      // For other file types, just return metadata
      return NextResponse.json({
        success: true,
        type: 'unknown',
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: metadata.webViewLink,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching file preview:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch file preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}