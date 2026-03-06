// Client Portal Drive API - Google Apps Script
// Complete script for Sheila Gutierrez Designs client portal

// Configuration - UPDATE THIS WITH YOUR FOLDER ID
var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

function doGet(e) {
  // Handle GET requests (e.g., listing projects)
  return handleListProjects(e);
}

function doPost(e) {
  // Handle POST requests (e.g., creating folders)
  var data = {};
  try {
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
  } catch (err) {
    data = e.parameter || {};
  }
  
  var action = data.action || 'list';
  if (action === 'create') {
    return handleCreateFolder(data);
  } else {
    return handleListProjects({ parameter: data });
  }
}

function handleListProjects(e) {
  try {
    var folder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    var folders = folder.getFolders();
    var projects = [];
    var count = 0;
    var maxResults = 100;
    
    // Check for limit parameter
    if (e && e.parameter && e.parameter.limit) {
      maxResults = parseInt(e.parameter.limit);
    }
    
    while (folders.hasNext() && count < maxResults) {
      var subfolder = folders.next();
      var folderName = subfolder.getName();
      var createdDate = subfolder.getDateCreated();
      
      // Parse folder name format: YYYY-MM-DD_Client_Name
      var clientName = folderName;
      var date = '';
      var formattedDate = '';
      
      var dateMatch = folderName.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
      if (dateMatch) {
        date = dateMatch[1];
        clientName = dateMatch[2].replace(/_/g, ' ');
        var dateObj = new Date(date + 'T00:00:00');
        formattedDate = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'MMMM d, yyyy');
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
        createdTime: createdDate.toISOString(),
        url: subfolder.getUrl()
      });
      
      count++;
    }
    
    // Sort by date (newest first)
    projects.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    // Apply result limit (default 10)
    var resultLimit = 10;
    if (e && e.parameter && e.parameter.limit) {
      resultLimit = parseInt(e.parameter.limit);
    }
    if (resultLimit > 0 && projects.length > resultLimit) {
      projects = projects.slice(0, resultLimit);
    }
    
    return createJsonResponse({ projects: projects });
    
  } catch (err) {
    return createJsonResponse({ 
      error: 'Failed to list projects', 
      details: err.toString() 
    }, 500);
  }
}

function handleCreateFolder(data) {
  try {
    var clientName = data.clientName || data.name;
    var datePrefix = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    if (!clientName || clientName.trim() === '') {
      return createJsonResponse({ error: 'Client name is required' }, 400);
    }
    
    // Format folder name: YYYY-MM-DD_Client_Name
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
    return createJsonResponse({ 
      error: 'Failed to create folder', 
      details: err.toString() 
    }, 500);
  }
}

function createJsonResponse(data, statusCode) {
  var response;
  if (statusCode) {
    response = JSON.stringify({ statusCode: statusCode, data: data });
  } else {
    response = JSON.stringify(data);
  }
  
  var output = ContentService.createTextOutput(response);
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Test function - run this from the script editor
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