function doPost(e) {
  var ss = SpreadsheetApp.openById('12daic4HfYdfGqZcaYnxIfUqvGEqR5t5E94h1Z1Rp46E');
  var sh = ss.getSheetByName('Sheet1');
  var tz = Session.getScriptTimeZone();
  var now = new Date();

  // Tolerant parse: JSON or standard form
  var data = {};
  try {
    if (e && e.postData && e.postData.type && e.postData.type.toLowerCase().indexOf('application/json') >= 0) {
      data = JSON.parse(e.postData.contents || '{}');
    } else if (e && e.parameter) {
      data = e.parameter; // form fields
    }
  } catch (_) {
    data = (e && e.parameter) ? e.parameter : {};
  }

  // Common field names (adjust here if your form uses different keys)
  var name    = data.name    || data.client || data.fullName || '';
  var email   = data.email   || '';
  var phone   = data.phone   || data.tel || '';
  var message = data.message || data.project || data.description || '';

  sh.appendRow([
    Utilities.formatDate(now, tz, 'M/d/yyyy'),
    Utilities.formatDate(now, tz, 'h:mm:ss a'),
    name,
    email,
    phone,
    message,
    'New',
    'Sheila',
    ''
  ]);

  MailApp.sendEmail({
    to: 'sheila@sheilagutierrezdesigns.com, mimholdingcompanytx@gmail.com, chip.allen@gmail.com',
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
}
