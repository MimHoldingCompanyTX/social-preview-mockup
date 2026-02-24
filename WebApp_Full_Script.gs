function doGet(e) {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var SS_ID = '12daic4HfYdfGqZcaYnxIfUqvGEqR5t5E94h1Z1Rp46E'; // GOOD tracker
  var SHEET_NAME = 'Sheet1';
  var EMAIL_LIST = 'sheila@sheilagutierrezdesigns.com, mimholdingcompanytx@gmail.com, chip.allen@gmail.com';

  var tz = Session.getScriptTimeZone();
  var now = new Date();

  // Parse incoming data (supports JSON and standard form posts)
  var data = {};
  try {
    if (e && e.postData && e.postData.type && e.postData.type.toLowerCase().indexOf('application/json') >= 0) {
      data = JSON.parse(e.postData.contents || '{}');
    } else if (e && e.parameter) {
      data = e.parameter; // HTML form fields
    }
  } catch (err) {
    data = (e && e.parameter) ? e.parameter : {};
  }

  // Normalize fields without changing your existing columns/order
  var name    = firstNonEmpty([data.name, data.client, data.fullName, '']);
  var email   = firstNonEmpty([data.email, '']);
  var phone   = firstNonEmpty([data.phone, data.tel, '']);
  var message = firstNonEmpty([data.message, data.project, data.description, '']);
  var status  = firstNonEmpty([data.status, 'New']);
  var assigned= firstNonEmpty([data.assigned, 'Sheila']);
  var notes   = firstNonEmpty([data.notes, '']);

  // Always target the GOOD tracker by ID
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Target sheet "' + SHEET_NAME + '" not found');

    // 1) Append to spreadsheet (A–I exact order preserved)
    sheet.appendRow([
      Utilities.formatDate(now, tz, 'M/d/yyyy'),
      Utilities.formatDate(now, tz, 'h:mm:ss a'),
      name,
      email,
      phone,
      message,
      status,
      assigned,
      notes
    ]);

    // 2) Send email notifications (unchanged)
    MailApp.sendEmail({
      to: EMAIL_LIST,
      subject: 'NEW DESIGN LEAD: ' + name,
      body:
        'You have a new consultation request!\n\n' +
        'Name: ' + name + '\n' +
        'Phone: ' + phone + '\n' +
        'Email: ' + email + '\n' +
        'Project Info: ' + message + '\n\n' +
        'View Lead Tracker: ' + ss.getUrl()
    });

    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  } catch (err2) {
    // Log to a separate "Debug" sheet (non-intrusive)
    safeLogDebug(now, 'APPEND_OR_EMAIL_FAIL', err2 && err2.message ? err2.message : String(err2), data);
    return ContentService.createTextOutput('ERR: ' + (err2 && err2.message ? err2.message : String(err2)))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Helpers
function firstNonEmpty(list) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] !== null && list[i] !== undefined && String(list[i]).trim() !== '') return String(list[i]).trim();
  }
  return '';
}

function safeLogDebug(now, tag, msg, payload) {
  try {
    var ss = SpreadsheetApp.openById('12daic4HfYdfGqZcaYnxIfUqvGEqR5t5E94h1Z1Rp46E'); // GOOD
    var sh = ss.getSheetByName('Debug') || ss.insertSheet('Debug');
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Timestamp', 'Tag', 'Message', 'Payload']);
    }
    var tz = Session.getScriptTimeZone();
    sh.appendRow([
      Utilities.formatDate(now, tz, 'M/d/yyyy h:mm:ss a'),
      tag,
      msg,
      JSON.stringify(payload || {})
    ]);
  } catch (_) {
    // no-op; never throw from logger
  }
}