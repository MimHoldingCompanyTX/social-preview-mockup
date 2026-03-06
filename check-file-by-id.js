const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = '/Users/clawdallen/Desktop/GoogleServiceAccount/googleServiceAcct.json';
const FILE_ID = '1i0cKt_QTnZx3RSdCcGd2qN3qEG6yHiUZ';

async function getFileInfo() {
  try {
    const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`Checking file ${FILE_ID}...`);
    
    const response = await drive.files.get({
      fileId: FILE_ID,
      fields: 'id, name, mimeType, modifiedTime, size, parents, trashed',
      supportsAllDrives: true,
    });
    
    const file = response.data;
    console.log('File found:');
    console.log(`- Name: ${file.name}`);
    console.log(`- MIME: ${file.mimeType}`);
    console.log(`- Modified: ${file.modifiedTime}`);
    console.log(`- Size: ${file.size || 'N/A'} bytes`);
    console.log(`- Parents: ${file.parents?.join(', ') || 'None'}`);
    console.log(`- Trashed: ${file.trashed}`);
    
    // Check if it's in the expected folder
    const folderId = '1W9TG1y4fFY8ATbw34tKFPTfucDJFIX_a';
    const inFolder = file.parents?.includes(folderId) || false;
    console.log(`- In folder ${folderId}: ${inFolder}`);
    
  } catch (error) {
    if (error.code === 404) {
      console.error('File not found (404)');
    } else {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
  }
}

getFileInfo();