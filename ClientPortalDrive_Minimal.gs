// Minimal Client Portal Drive API - Google Apps Script
// Lists folders in the client_portal directory

var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

function doGet(e) {
  try {
    var folder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    var folders = folder.getFolders();
    var projects = [];
    var count = 0;
    var maxResults = 100;
    
    while (folders.hasNext() && count < maxResults) {
      var subfolder = folders.next();
      var folderName = subfolder.getName();
      var createdDate = subfolder.getDateCreated();
      
      // Parse folder name: YYYY-MM-DD_Client_Name
      var clientName = folderName;
      var date = '';
      var formattedDate = '';
      
      var dateMatch = folderName.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
      if (dateMatch) {
        date = dateMatch[1];
        clientName = dateMatch[2].replace(/_/g, ' ');
        formattedDate = formatDateString(date);
      } else {
        date = formatDate(createdDate, 'yyyy-MM-dd');
        formattedDate = formatDate(createdDate, 'MMMM d, yyyy');
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
    
    // Sort newest first
    projects.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    // Return as JSON
    var output = ContentService.createTextOutput(JSON.stringify({ projects: projects }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (err) {
    var errorOutput = ContentService.createTextOutput(JSON.stringify({ 
      error: 'Failed to list projects', 
      details: err.toString() 
    }));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

function formatDate(dateObj, format) {
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), format);
}

function formatDateString(dateString) {
  var date = new Date(dateString + 'T00:00:00');
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMMM d, yyyy');
}

// Test function
function test() {
  var result = doGet({ parameter: {} });
  Logger.log(result.getContent());
}