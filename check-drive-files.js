const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = '/Users/clawdallen/Desktop/GoogleServiceAccount/googleServiceAcct.json';
const FOLDER_ID = '1W9TG1y4fFY8ATbw34tKFPTfucDJFIX_a';

async function listFilesInFolder() {
  try {
    const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`Checking folder ${FOLDER_ID}...`);
    
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const files = response.data.files || [];
    
    console.log(`Found ${files.length} files:`);
    files.forEach(file => {
      console.log(`- ${file.name} (${file.id}) [${file.mimeType}] ${file.modifiedTime}`);
    });
    
    const clientNotes = files.filter(f => f.name.includes('client_notes'));
    console.log(`\nClient notes files: ${clientNotes.length}`);
    clientNotes.forEach(f => console.log(`- ${f.name} (${f.id})`));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

listFilesInFolder();