// ============ CONFIGURATION ============ 
var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6'; 

// ============ OAUTH2 LIBRARY ============ 
var OAuth2 = getOAuth2(); 

function getOAuth2() { 
  return OAuth2.createService('DriveService') 
    .setTokenUrl('https://oauth2.googleapis.com/token') 
    .setPrivateKey(getServiceAccountKey().private_key) 
    .setIssuer(getServiceAccountKey().client_email) 
    .setSubject(getServiceAccountKey().client_email) 
    .setPropertyStore(PropertiesService.getScriptProperties()) 
    .setScope('https://www.googleapis.com/auth/drive') // Changed from drive.readonly to drive for full access
    .setParam('access_type', 'offline') 
    .setCache(CacheService.getScriptCache()); 
} 

function getServiceAccountKey() { 
  var keyJson = PropertiesService.getScriptProperties() 
    .getProperty('SERVICE_ACCOUNT_KEY'); 
  return JSON.parse(keyJson); 
} 

// ============ DRIVE API FUNCTIONS ============ 
function listProjectsWithServiceAccount() { 
  try { 
    if (!OAuth2.hasAccess()) { 
      var authUrl = OAuth2.getAuthorizationUrl(); 
      Logger.log('Auth URL: ' + authUrl); 
      throw new Error('Service account needs authorization: ' + authUrl); 
    } 
    var accessToken = OAuth2.getAccessToken(); 
    // Call Drive API v3 
    var url = 'https://www.googleapis.com/drive/v3/files'; 
    var params = { 
      q: "'" + CLIENT_PORTAL_FOLDER_ID + "' in parents", 
      fields: 'files(id, name, createdTime, webViewLink)', 
      orderBy: 'createdTime desc', 
      pageSize: 10 
    }; 
    var response = UrlFetchApp.fetch(url + '?' + buildQuery(params), { 
      headers: { 'Authorization': 'Bearer ' + accessToken } 
    }); 
    var data = JSON.parse(response.getContentText()); 
    var projects = processDriveFiles(data.files || []); 
    return buildJsonResponse({ success: true, count: projects.length, projects: projects }); 
  } catch (err) { 
    return buildJsonResponse({ success: false, error: err.toString() }); 
  } 
} 

function createFolder(params) {
  try {
    var folderId = params.folderId;
    var folderName = params.folderName;
    
    // Use DriveApp (simpler, uses script owner's credentials)
    var parentFolder = DriveApp.getFolderById(folderId);
    var newFolder = parentFolder.createFolder(folderName);
    
    return buildJsonResponse({
      success: true,
      folderId: newFolder.getId(),
      folderName: folderName,
      message: 'Folder created successfully'
    });
  } catch (err) {
    return buildJsonResponse({ success: false, error: err.toString() });
  }
}

function processDriveFiles(files) { 
  return files.map(function(file) { 
    var folderName = file.name; 
    var createdDate = new Date(file.createdTime); 
    // Parse folder name 
    var parsed = parseFolderName(folderName, createdDate); 
    return { 
      id: file.id, 
      folderName: folderName, 
      clientName: parsed.clientName, 
      date: parsed.date, 
      formattedDate: parsed.formattedDate, 
      createdTime: file.createdTime, 
      url: file.webViewLink 
    }; 
  }); 
} 

function parseFolderName(folderName, createdDate) { 
  var clientName = folderName; 
  var date = ''; 
  var formattedDate = ''; 
  // Try to extract date from "YYYY-MM-DD_Client_Name" 
  if (folderName.indexOf('_') > 0) { 
    var parts = folderName.split('_'); 
    var firstPart = parts[0]; 
    if (firstPart.match(/^\d{4}-\d{2}-\d{2}$/)) { 
      date = firstPart; 
      clientName = parts.slice(1).join('_').replace(/_/g, ' '); 
      // Format as "Month Day, Year" 
      var year = firstPart.substring(0, 4); 
      var month = firstPart.substring(5, 7); 
      var day = firstPart.substring(8, 10); 
      var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']; 
      var monthIndex = parseInt(month) - 1; 
      if (monthIndex >= 0 && monthIndex < 12) { 
        formattedDate = monthNames[monthIndex] + ' ' + parseInt(day) + ', ' + year; 
      } else { 
        formattedDate = year + '-' + month + '-' + day; 
      } 
    } 
  } 
  // If no date in name, use creation date 
  if (date === '') { 
    date = createdDate.getFullYear() + '-' + padZero(createdDate.getMonth() + 1) + '-' + padZero(createdDate.getDate()); 
    formattedDate = createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); 
  } 
  return { clientName: clientName, date: date, formattedDate: formattedDate }; 
} 

// ============ HELPER FUNCTIONS ============ 
function buildQuery(params) { 
  return Object.keys(params).map(function (key) { 
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]); 
  }).join('&'); 
} 

function buildJsonResponse(data) { 
  var output = ContentService.createTextOutput(JSON.stringify(data)); 
  output.setMimeType(ContentService.MimeType.JSON); 
  return output; 
} 

function padZero(num) { 
  return num < 10 ? '0' + num : num; 
} 

// ============ WEB APP ENTRY POINTS ============ 
function doGet(e) { 
  return listProjectsWithServiceAccount(); 
} 

function doPost(e) { 
  try {
    var params = JSON.parse(e.postData.contents);
    
    if (params.action === 'createFolder') {
      return createFolder(params);
    }
    
    return listProjectsWithServiceAccount();
  } catch (err) {
    return buildJsonResponse({ success: false, error: err.toString() });
  }
} 

// ============ TEST FUNCTIONS ============ 
function testServiceAccount() { 
  Logger.log('Testing service account access...'); 
  // First, test that we can get the key 
  var key = getServiceAccountKey(); 
  Logger.log('Service account email: ' + key.client_email); 
  // Test OAuth2 
  if (!OAuth2.hasAccess()) { 
    Logger.log('No access - need to authorize'); 
    var authUrl = OAuth2.getAuthorizationUrl(); 
  Logger.log('Authorize here: ' + authUrl); 
    return 'Need authorization: ' + authUrl; 
  } 
  Logger.log('Has access! Token: ' + OAuth2.getAccessToken().substring(0, 30) + '...'); 
  // Test Drive API 
  var result = listProjectsWithServiceAccount(); 
  Logger.log('Drive API result: ' + result.getContent()); 
  return result; 
} 

function resetAuth() { 
  OAuth2.reset(); 
  Logger.log('OAuth2 reset complete'); 
}

function testCreateFolder() {
  try {
    // Test with an existing client folder
    var result = createFolder({
      folderId: '126QJijqdkrM9ir8kgbtBA737U8t-ilHP', // Joe Blow's folder
      folderName: '99_Test_Folder'
    });
    Logger.log('Create folder result: ' + result.getContent());
    return result;
  } catch (err) {
    Logger.log('Error: ' + err.toString());
    return buildJsonResponse({ success: false, error: err.toString() });
  }
}