// Client Portal Drive API
// New Google Apps Script project for Sheila Gutierrez Designs client portal
// Handles listing, creating, and managing client project folders in Google Drive

// Configuration
var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6'; // Sheila Gutierrez Designs → client_portal
var API_TOKEN = ''; // Optional: Set a token for security (e.g., 'your-secret-token-here')

function doGet(e) {
  // Optional token check
  if (API_TOKEN && API_TOKEN.length > 0) {
    var token = e.parameter.token;
    if (!token || token !== API_TOKEN) {
      return createJsonResponse({ error: 'Invalid or missing token' }, 401);
    }
  }
  
  var action = e.parameter.action || 'list';
  
  switch (action) {
    case 'list':
      return handleListProjects(e);
    case 'create':
      return handleCreateFolder(e);
    default:
      return createJsonResponse({ error: 'Invalid action' }, 400);
  }
}

function doPost(e) {
  // Optional token check
  if (API_TOKEN && API_TOKEN.length > 0) {
    var token = e.parameter.token;
    if (!token || token !== API_TOKEN) {
      return createJsonResponse({ error: 'Invalid or missing token' }, 401);
    }
  }
  
  var data = {};
  try {
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
  } catch (err) {
    data = e.parameter || {};
  }
  
  var action = data.action || 'list';
  
  switch (action) {
    case 'list':
      return handleListProjects(e);
    case 'create':
      return handleCreateFolder(data);
    default:
      return createJsonResponse({ error: 'Invalid action' }, 400);
  }
}

function handleListProjects(e) {
  try {
    var folder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    var folders = folder.getFolders();
    var projects = [];
    var count = 0;
    var maxResults = e.parameter.limit ? parseInt(e.parameter.limit) : 100;
    
    while (folders.hasNext() && count < maxResults) {
      var subfolder = folders.next();
      var folderName = subfolder.getName();
      var modifiedDate = subfolder.getLastUpdated();
      var createdDate = subfolder.getDateCreated();
      
      // Parse folder name format: YYYY-MM-DD_Client_Name
      var clientName = folderName;
      var date = '';
      var formattedDate = '';
      
      var dateMatch = folderName.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
      if (dateMatch) {
        date = dateMatch[1];
        clientName = dateMatch[2].replace(/_/g, ' ');
        formattedDate = Utilities.formatDate(new Date(date + 'T00:00:00'), Session.getScriptTimeZone(), 'MMMM d, yyyy');
      } else {
        date = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        formattedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), 'MMMM d, yyyy');
      }
      
      projects.push({
        id: subfolder.getId(),
        folderName: folderName,
        clientName: clientName,
        date: date,
        formattedDate: formattedDate,
        modifiedTime: modifiedDate.toISOString(),
        createdTime: createdDate.toISOString(),
        url: subfolder.getUrl()
      });
      
      count++;
    }
    
    // Sort by date (newest first)
    projects.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    // Limit to latest 10 for default
    var limit = e.parameter.limit ? parseInt(e.parameter.limit) : 10;
    if (limit > 0 && projects.length > limit) {
      projects = projects.slice(0, limit);
    }
    
    return createJsonResponse({ projects: projects });
  } catch (err) {
    return createJsonResponse({ error: 'Failed to list projects', details: err.toString() }, 500);
  }
}

function handleCreateFolder(data) {
  try {
    var clientName = data.clientName || data.name;
    var datePrefix = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    if (!clientName || clientName.trim() === '') {
      return createJsonResponse({ error: 'Client name is required' }, 400);
    }
    
    // Format folder name: YYYY-MM-DD_Client_Name (replace spaces with underscores)
    var safeClientName = clientName.trim().replace(/\s+/g, '_');
    var folderName = datePrefix + '_' + safeClientName;
    
    var parentFolder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    var newFolder = parentFolder.createFolder(folderName);
    
    return createJsonResponse({
      success: true,
      message: 'Folder created successfully',
      folder: {
        id: newFolder.getId(),
        name: newFolder.getName(),
        url: newFolder.getUrl(),
        clientName: clientName,
        date: datePrefix
      }
    });
  } catch (err) {
    return createJsonResponse({ error: 'Failed to create folder', details: err.toString() }, 500);
  }
}

function createJsonResponse(data, statusCode) {
  var response = JSON.stringify(data);
  var output = ContentService.createTextOutput(response);
  output.setMimeType(ContentService.MimeType.JSON);
  
  if (statusCode) {
    // Note: Apps Script doesn't directly set HTTP status codes in doGet/doPost
    // We'll include status in the JSON response
    var result = { statusCode: statusCode, data: data };
    output.setContent(JSON.stringify(result));
  }
  
  return output;
}

// Test function (run from script editor)
function testListProjects() {
  var result = handleListProjects({ parameter: { limit: 5 } });
  Logger.log(result.getContent());
}

function testCreateFolder() {
  var result = handleCreateFolder({
    clientName: 'Test Client',
    date: '2026-03-02'
  });
  Logger.log(result.getContent());
}