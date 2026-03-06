// Ultra Simple Client Portal Drive API
// Google Apps Script - Paste this entire code into script.google.com

// Your client_portal folder ID (found via gog tool):
var CLIENT_PORTAL_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

// Handle GET requests (website will call this)
function doGet(e) {
  return listProjects();
}

// Handle POST requests  
function doPost(e) {
  return listProjects();
}

// Main function to list client project folders
function listProjects() {
  try {
    // Get the client_portal folder
    var folder = DriveApp.getFolderById(CLIENT_PORTAL_FOLDER_ID);
    var folders = folder.getFolders();
    var projects = [];
    
    // Loop through each client project folder
    while (folders.hasNext()) {
      var subfolder = folders.next();
      var folderName = subfolder.getName();
      var createdDate = subfolder.getDateCreated();
      
      // Parse folder name like "2026-02-27_Joe_Blow"
      var clientName = folderName;
      var date = '';
      var formattedDate = '';
      
      // Try to extract date from beginning of folder name
      if (folderName.indexOf('_') > 0) {
        var parts = folderName.split('_');
        var firstPart = parts[0];
        
        // Check if first part is a date: YYYY-MM-DD
        if (firstPart.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = firstPart;
          // Client name is everything after the first underscore
          clientName = parts.slice(1).join('_').replace(/_/g, ' ');
          
          // Format date as "February 27, 2026"
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
      
      // If no date in folder name, use creation date
      if (date === '') {
        date = createdDate.getFullYear() + '-' + 
               padZero(createdDate.getMonth() + 1) + '-' + 
               padZero(createdDate.getDate());
        formattedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), 'MMMM d, yyyy');
      }
      
      // Add project to list
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
    
    // Sort newest first
    projects.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    // Keep only 10 most recent
    if (projects.length > 10) {
      projects = projects.slice(0, 10);
    }
    
    // Return JSON
    var output = ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: projects.length,
      projects: projects
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (err) {
    // Return error
    var errorOutput = ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    }));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

// Helper to pad numbers with zero
function padZero(num) {
  return num < 10 ? '0' + num : num;
}

// Test function - run this after pasting
function test() {
  var result = listProjects();
  Logger.log(result.getContent());
  return result;
}