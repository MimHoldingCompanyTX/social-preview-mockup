import { NextResponse } from 'next/server';
import { getDriveClient } from '../../../../../lib/google-drive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const size = searchParams.get('size') || '400';
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    const drive = await getDriveClient();
    
    // First, get file metadata to check mime type
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, thumbnailLink',
      supportsAllDrives: true,
    });
    
    const metadata = fileMetadata.data;
    
    // Check if it's an image
    if (!metadata.mimeType?.startsWith('image/')) {
      // Return a placeholder SVG for non-image files
      const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#f0f0f0"/>
        <text x="200" y="200" text-anchor="middle" dy=".3em" font-family="Arial" font-size="20" fill="#666">Not an image</text>
      </svg>`;
      return new Response(svgPlaceholder, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
          'X-Thumbnail-Source': 'not-image',
        },
      });
    }
    
    // Always use the Drive API to get the image content directly
    try {
      // Get the image content
      const imageResponse = await drive.files.get({
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      }, { 
        responseType: 'arraybuffer',
      });
      
      // Return the full image (browser will resize it)
      return new Response(imageResponse.data as ArrayBuffer, {
        headers: {
          'Content-Type': metadata.mimeType || 'image/jpeg',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (imageError) {
      console.error('Error fetching image:', imageError);
      // Return a simple SVG placeholder
      const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#f0f0f0"/>
        <text x="200" y="200" text-anchor="middle" dy=".3em" font-family="Arial" font-size="20" fill="#666">No thumbnail</text>
      </svg>`;
      return new Response(svgPlaceholder, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    
    // Return error placeholder
    const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#f0f0f0"/>
      <text x="200" y="200" text-anchor="middle" dy=".3em" font-family="Arial" font-size="20" fill="#666">Error</text>
    </svg>`;
    return new Response(svgPlaceholder, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'X-Thumbnail-Source': 'error',
      },
      status: 500,
    });
  }
}