// Simple Client Portal Drive API
// Google Apps Script for Sheila Gutierrez Designs

// Your client_portal folder ID from Google Drive
var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

// Handle GET requests
function doGet(e) {
  return listProjects();
}

// Handle POST requests  
function doPost(e) {
  return listProjects();
}

// List all project folders
function listProjects() {
  try {
    // Get the main folder
    var folder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    
    // Get all subfolders
    var folders = folder.getFolders();
    var projects = [];
    
    // Loop through folders
    while (folders.hasNext()) {
      var subfolder = folders.next();
      var folderName = subfolder.getName();
      var createdDate = subfolder.getDateCreated();
      
      // Extract client name and date from folder name
      var clientName = folderName;
      var date = '';
      var formattedDate = '';
      
      // Check if folder name has date prefix: YYYY-MM-DD_Client_Name
      if (folderName.indexOf('_') > 0) {
        var parts = folderName.split('_');
        if (parts.length >= 2) {
          // First part might be date
          var firstPart = parts[0];
          if (firstPart.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = firstPart;
            // Rest is client name
            clientName = parts.slice(1).join('_').replace(/_/g, ' ');
            
            // Format date nicely
            var year = firstPart.substring(0, 4);
            var month = firstPart.substring(5, 7);
            var day = firstPart.substring(8, 10);
            var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            var monthName = monthNames[parseInt(month) - 1];
            formattedDate = monthName + ' ' + parseInt(day) + ', ' + year;
          }
        }
      }
      
      // If no date found in name, use creation date
      if (date === '') {
        var year = createdDate.getFullYear();
        var month = createdDate.getMonth() + 1; // 0-11 → 1-12
        var day = createdDate.getDate();
        date = year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
        
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        formattedDate = monthNames[createdDate.getMonth()] + ' ' + day + ', ' + year;
      }
      
      // Add to projects list
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
    
    // Sort by date (newest first)
    projects.sort(function(a, b) {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
    
    // Limit to 10 most recent
    if (projects.length > 10) {
      projects = projects.slice(0, 10);
    }
    
    // Return as JSON
    var response = {
      success: true,
      projects: projects
    };
    
    var output = ContentService.createTextOutput(JSON.stringify(response));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (err) {
    // Error response
    var errorResponse = {
      success: false,
      error: err.toString()
    };
    
    var errorOutput = ContentService.createTextOutput(JSON.stringify(errorResponse));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

// Test function
function test() {
  var result = listProjects();
  Logger.log(result.getContent());
}