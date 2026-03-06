const { google } = require('googleapis');
const { existsSync, readFileSync } = require('fs');

async function testServiceAccount() {
  try {
    // Path to service account key file (from Desktop)
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
      '/Users/clawdallen/Desktop/GoogleServiceAccount/googleServiceAcct.json';
    
    console.log('Testing Google Service Account authentication...');
    console.log('Credentials path:', credentialsPath);
    
    if (!existsSync(credentialsPath)) {
      throw new Error(`Service account key file not found at: ${credentialsPath}`);
    }
    
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    console.log('Service account email:', credentials.client_email);
    console.log('Project ID:', credentials.project_id);
    
    // Authenticate
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Test 1: List files from root
    console.log('\n--- Test 1: Listing files from root (service account\'s Drive) ---');
    const rootResponse = await drive.files.list({
      pageSize: 5,
      fields: 'files(id, name, mimeType)',
      q: "'root' in parents and trashed = false",
    });
    
    console.log(`Found ${rootResponse.data.files.length} files in root:`);
    rootResponse.data.files.forEach(file => {
      console.log(`  - ${file.name} (${file.mimeType}) [${file.id}]`);
    });
    
    // Test 2: Try to access the parent folder used by client portal
    const parentFolderId = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';
    console.log(`\n--- Test 2: Accessing parent folder (ID: ${parentFolderId}) ---`);
    
    try {
      const folderResponse = await drive.files.get({
        fileId: parentFolderId,
        fields: 'id, name, mimeType, webViewLink, capabilities',
      });
      
      console.log('Parent folder details:');
      console.log(`  Name: ${folderResponse.data.name}`);
      console.log(`  Type: ${folderResponse.data.mimeType}`);
      console.log(`  Link: ${folderResponse.data.webViewLink}`);
      
      // List files inside the parent folder
      const folderContents = await drive.files.list({
        pageSize: 10,
        fields: 'files(id, name, mimeType)',
        q: `'${parentFolderId}' in parents and trashed = false`,
      });
      
      console.log(`\nFound ${folderContents.data.files.length} items in parent folder:`);
      folderContents.data.files.forEach(item => {
        console.log(`  - ${item.name} (${item.mimeType}) [${item.id}]`);
      });
      
    } catch (folderError) {
      console.error('Error accessing parent folder:', folderError.message);
      console.log('This likely means the service account does not have access to this folder.');
      console.log('Please share the folder with the service account email:', credentials.client_email);
    }
    
    console.log('\n✅ Service account authentication successful!');
    console.log('The service account can be used for Google Drive API access.');
    
  } catch (error) {
    console.error('\n❌ Service account test failed:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    process.exit(1);
  }
}

// Run the test
testServiceAccount();