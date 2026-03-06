// Debug script for Google Apps Script permissions
// Copy-paste this into your script.google.com editor and run debugTest()

function debugTest() {
  Logger.log('=== Starting Debug Test ===');
  
  var folderId = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';
  Logger.log('Folder ID: ' + folderId);
  
  try {
    // Test 1: Basic DriveApp access
    Logger.log('Test 1: Testing DriveApp access...');
    var root = DriveApp.getRootFolder();
    Logger.log('✓ Root folder: ' + root.getName());
    
    // Test 2: Try to get specific folder
    Logger.log('Test 2: Getting folder by ID...');
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
      Logger.log('✓ Folder found: ' + folder.getName());
      Logger.log('✓ Folder URL: ' + folder.getUrl());
    } catch (err) {
      Logger.log('✗ ERROR getting folder: ' + err.toString());
      
      // Try to search for it
      Logger.log('Attempting to search for folder...');
      var folders = DriveApp.searchFolders('title contains "client_portal"');
      var found = false;
      while (folders.hasNext()) {
        var f = folders.next();
        Logger.log('Found folder: ' + f.getName() + ' (ID: ' + f.getId() + ')');
        if (f.getId() === folderId) {
          Logger.log('✓ That matches our target ID!');
          found = true;
        }
      }
      if (!found) {
        Logger.log('No matching folder found in search.');
      }
      return;
    }
    
    // Test 3: List subfolders
    Logger.log('Test 3: Listing subfolders...');
    var subfolders = folder.getFolders();
    var count = 0;
    while (subfolders.hasNext()) {
      var sub = subfolders.next();
      count++;
      Logger.log('  ' + count + '. ' + sub.getName() + ' (ID: ' + sub.getId() + ')');
    }
    Logger.log('✓ Total subfolders: ' + count);
    
    // Test 4: Current user info
    Logger.log('Test 4: Current user info...');
    try {
      var email = Session.getActiveUser().getEmail();
      Logger.log('✓ Script running as: ' + email);
    } catch (err) {
      Logger.log('Note: Cannot get active user (web app context)');
    }
    
    Logger.log('=== Debug Test Complete ===');
    Logger.log('All tests passed! The script has proper Drive access.');
    
  } catch (err) {
    Logger.log('=== FATAL ERROR ===');
    Logger.log(err.toString());
    Logger.log('Stack: ' + err.stack);
  }
}

function minimalTest() {
  // Super simple test - just try to get the folder
  try {
    var folder = DriveApp.getFolderById('1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6');
    Logger.log('SUCCESS: Folder found - ' + folder.getName());
    return 'OK';
  } catch (err) {
    Logger.log('FAILED: ' + err.toString());
    return 'ERROR: ' + err.toString();
  }
}

// Run this from script editor to test permissions
function runDebug() {
  debugTest();
}