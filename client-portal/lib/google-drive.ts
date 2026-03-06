import { google } from 'googleapis';
import { existsSync, readFileSync, writeFileSync, createWriteStream } from 'fs';
import { Readable } from 'stream';

/**
 * Get authenticated Google Drive client using service account credentials
 */
export async function getDriveClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  }
  
  if (!existsSync(credentialsPath)) {
    throw new Error(`Service account key file not found at: ${credentialsPath}`);
  }
  
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
  
  return google.drive({ version: 'v3', auth });
}

/**
 * List folders under a specific parent folder
 */
export async function listFolders(parentFolderId: string, maxResults = 100) {
  const drive = await getDriveClient();
  
  const response = await drive.files.list({
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink)',
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    orderBy: 'modifiedTime desc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  
  return response.data.files || [];
}

/**
 * Get folder by ID
 */
export async function getFolder(folderId: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink, capabilities',
    supportsAllDrives: true,
  });
  
  return response.data;
}

/**
 * List all files/folders under a parent folder
 */
export async function listFolderContents(parentFolderId: string, maxResults = 100) {
  const drive = await getDriveClient();
  
  const response = await drive.files.list({
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink, thumbnailLink, webContentLink)',
    q: `'${parentFolderId}' in parents and trashed = false`,
    orderBy: 'name asc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  
  return response.data.files || [];
}

/**
 * Create a new folder under a parent folder
 */
export async function createFolder(parentFolderId: string, folderName: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, name, mimeType, webViewLink',
    supportsAllDrives: true,
  });
  
  return response.data;
}

/**
 * Check if a folder exists and the service account has access
 */
export async function checkFolderAccess(folderId: string): Promise<boolean> {
  try {
    const drive = await getDriveClient();
    await drive.files.get({
      fileId: folderId,
      fields: 'id',
      supportsAllDrives: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a text file in a specific folder
 */
export async function createTextFile(parentFolderId: string, fileName: string, content: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
      mimeType: 'text/plain',
    },
    media: {
      mimeType: 'text/plain',
      body: content,
    },
    fields: 'id, name, mimeType, webViewLink, createdTime',
    supportsAllDrives: true,
  });
  
  return response.data;
}

/**
 * Search for a file by name in a specific folder
 */
export async function findFileInFolder(parentFolderId: string, fileName: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.list({
    pageSize: 10,
    fields: 'files(id, name, mimeType, webViewLink)',
    q: `'${parentFolderId}' in parents and name = '${fileName}' and trashed = false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  
  return response.data.files?.[0] || null;
}

/**
 * Update an existing text file with new content
 */
export async function updateTextFile(fileId: string, content: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.update({
    fileId,
    media: {
      mimeType: 'text/plain',
      body: content,
    },
    fields: 'id, name, mimeType, webViewLink, modifiedTime',
    supportsAllDrives: true,
  });
  
  return response.data;
}

/**
 * Create or update a text file in a folder
 * Returns the file (new or updated)
 */
export async function createOrUpdateTextFile(parentFolderId: string, fileName: string, content: string) {
  const existingFile = await findFileInFolder(parentFolderId, fileName);
  
  if (existingFile) {
    return await updateTextFile(existingFile.id!, content);
  } else {
    return await createTextFile(parentFolderId, fileName, content);
  }
}

/**
 * Get the content of a text file
 */
export async function getTextFileContent(fileId: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.get({
    fileId,
    alt: 'media',
    supportsAllDrives: true,
  });
  
  return response.data as string;
}

/**
 * Move a file to trash (soft delete)
 */
export async function moveFileToTrash(fileId: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.update({
    fileId,
    requestBody: {
      trashed: true,
    },
    fields: 'id, name, trashed',
    supportsAllDrives: true,
  });
  
  return response.data;
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(parentFolderId: string, file: any) {
  const drive = await getDriveClient();
  
  // Handle different file types (browser File API vs Node.js)
  let buffer: Buffer;
  
  if (typeof file.arrayBuffer === 'function') {
    // Browser File API
    const fileBuffer = await file.arrayBuffer();
    buffer = Buffer.from(fileBuffer);
  } else if (file.buffer) {
    // Already a Buffer or has buffer property
    buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
  } else if (Buffer.isBuffer(file)) {
    // Already a Buffer
    buffer = file;
  } else {
    // Try to convert to buffer
    buffer = Buffer.from(await file.text());
  }
  
  // Create a readable stream from the buffer
  const stream = Readable.from(buffer);
  
  const media = {
    mimeType: file.type || file.mimeType || 'application/octet-stream',
    body: stream,
  };
  
  const requestBody = {
    name: file.name || 'uploaded_file',
    parents: [parentFolderId],
  };
  
  const response = await drive.files.create({
    requestBody,
    media,
    fields: 'id, name, webViewLink, mimeType, modifiedTime',
    supportsAllDrives: true,
  });
  
  return response.data;
}