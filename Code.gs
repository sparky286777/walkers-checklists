/**
 * Walkers of Whitehall – Compliance Checklists
 * Receives signed-off checklists from the website and saves them to this Google Sheet.
 *
 * Tabs it creates:
 *   "Sign-offs" – one row per signed-off checklist (who, when, totals, anything not completed)
 *   "All checks" – one row per individual check, with its answer and reason
 *
 * Optional: put managers' email addresses in MANAGER_EMAILS to get an email
 * whenever a checklist is signed off with something not completed.
 */

// The Google Sheet the sign-offs are written to (the long id in its web address).
var SHEET_ID = '1QN3FM_OAlKO3Fw5wZoeS6_w_8fe8qQ4fY4UgITPrX7w';

var MANAGER_EMAILS = [];   // e.g. ['name@youngs.co.uk', 'other@youngs.co.uk']

var SIGNOFF_HEADERS = ['Received', 'Date', 'Checklist', 'Signed off by', 'Complete', 'Not completed', 'Not completed – details'];
var CHECK_HEADERS   = ['Received', 'Date', 'Checklist', 'Section', 'Check', 'Answer', 'Reason', 'Signed off by'];

// Run this once from the editor (select "setup" and press Run) to create the tabs.
function setup() {
  getSheet_('Sign-offs', SIGNOFF_HEADERS);
  getSheet_('All checks', CHECK_HEADERS);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var now = new Date();
    var name = String(data.signedOffBy || '').trim();
    var checks = data.checks || [];

    if (!name) return reply_({ ok: false, error: 'Missing name' });
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].answer === 'Not completed' && !String(checks[i].reason || '').trim()) {
        return reply_({ ok: false, error: 'Missing reason for: ' + checks[i].check });
      }
    }

    var notDone = checks.filter(function (c) { return c.answer === 'Not completed'; });
    var details = notDone.map(function (c) { return c.check + ' – ' + c.reason; }).join('\n');

    getSheet_('Sign-offs', SIGNOFF_HEADERS).appendRow([
      now, data.date || '', data.checklist || '', name,
      checks.length - notDone.length, notDone.length, details
    ]);

    var rows = checks.map(function (c) {
      return [now, data.date || '', data.checklist || '', c.section || '', c.check || '',
              c.answer || '', c.reason || '', name];
    });
    if (rows.length) {
      var sheet = getSheet_('All checks', CHECK_HEADERS);
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, CHECK_HEADERS.length).setValues(rows);
    }

    if (notDone.length && MANAGER_EMAILS.length) {
      MailApp.sendEmail({
        to: MANAGER_EMAILS.join(','),
        subject: 'Walkers ' + (data.checklist || '') + ' checklist: ' + notDone.length + ' not completed',
        body: name + ' signed off the ' + (data.checklist || '') + ' kitchen checklist on ' + (data.date || '') + '.\n\n' +
              'Not completed:\n' + details + '\n\nFull record: ' + SpreadsheetApp.openById(SHEET_ID).getUrl()
      });
    }

    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you check the link works by opening it in a browser.
function doGet() {
  return reply_({ ok: true, message: 'Walkers checklist receiver is running.' });
}

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#16181D').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
