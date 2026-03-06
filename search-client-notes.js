const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = '/Users/clawdallen/Desktop/GoogleServiceAccount/googleServiceAcct.json';
const SHARED_DRIVE_ID = '0AL4HN_wvd5XnUk9PVA';

async function searchFiles() {
  try {
    const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`Searching for client_notes files in Shared Drive ${SHARED_DRIVE_ID}...`);
    
    // Search in the shared drive
    const response = await drive.files.list({
      q: "name contains 'client_notes' and trashed = false",
      fields: 'files(id, name, mimeType, modifiedTime, size, parents)',
      orderBy: 'modifiedTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: SHARED_DRIVE_ID,
    });
    
    const files = response.data.files || [];
    
    console.log(`Found ${files.length} matching files:`);
    files.forEach(file => {
      console.log(`- ${file.name} (${file.id}) [${file.mimeType}] ${file.modifiedTime}`);
      if (file.parents) {
        console.log(`  Parents: ${file.parents.join(', ')}`);
      }
    });
    
    if (files.length === 0) {
      console.log('No client_notes files found in the shared drive.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

searchFiles();