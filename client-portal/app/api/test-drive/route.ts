import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { existsSync, readFileSync } from 'fs';

export async function GET() {
  try {
    // Get service account key path from environment
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsPath) {
      return NextResponse.json(
        { 
          error: 'Service account credentials not configured',
          details: 'GOOGLE_APPLICATION_CREDENTIALS environment variable is not set'
        },
        { status: 500 }
      );
    }

    // Check if file exists
    if (!existsSync(credentialsPath)) {
      return NextResponse.json(
        { 
          error: 'Service account key file not found',
          details: `File not found at path: ${credentialsPath}`
        },
        { status: 500 }
      );
    }

    // Load service account credentials
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    
    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // List files from the root of the service account's Drive
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink)',
      q: "'root' in parents and trashed = false",
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];

    return NextResponse.json({
      success: true,
      message: 'Successfully authenticated with Google Drive API using service account',
      serviceAccountEmail: credentials.client_email,
      totalFiles: files.length,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        created: file.createdTime,
        modified: file.modifiedTime,
        link: file.webViewLink,
      })),
    });
  } catch (error) {
    console.error('Error testing Google Drive API:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to authenticate with Google Drive API',
        message: errorMessage,
        details: errorDetails.substring(0, 500),
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'unknown',
      },
      { status: 500 }
    );
  }
}