// Client Portal Drive API - Working Google Apps Script
// Copy and paste entire code into script.google.com

var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

function doGet(e) {
  return listProjects();
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    
    if (params.action === 'createFolder') {
      return createFolder(params);
    }
    
    return listProjects();
  } catch (err) {
    var errorOutput = ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    }));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

function createFolder(params) {
  try {
    var folderId = params.folderId;
    var folderName = params.folderName;
    
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

function listProjects() {
  try {
    var folder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    var folders = folder.getFolders();
    var projects = [];
    
    while (folders.hasNext()) {
      var subfolder = folders.next();
      var folderName = subfolder.getName();
      var createdDate = subfolder.getDateCreated();
      
      var clientName = folderName;
      var date = '';
      var formattedDate = '';
      
      // Parse folder name like "2026-02-27_Joe_Blow"
      if (folderName.indexOf('_') > 0) {
        var parts = folderName.split('_');
        var firstPart = parts[0];
        
        if (firstPart.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = firstPart;
          clientName = parts.slice(1).join('_').replace(/_/g, ' ');
          
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
      
      if (date === '') {
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
    }
    
    projects.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    if (projects.length > 10) {
      projects = projects.slice(0, 10);
    }
    
    var output = ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: projects.length,
      projects: projects
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (err) {
    var errorOutput = ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    }));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

function test() {
  var result = listProjects();
  Logger.log(result.getContent());
  return result;
}