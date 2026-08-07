const SPREADSHEET_ID = '1VbsvtQgOofytN5B2g7UsF985xlUNVby_oZLsORRoYU0';
const TIME_ZONE = 'America/Chicago';
const SHEETS = {
  food: 'Food',
  weights: 'Weight',
  exercise: 'Exercise',
  japanFund: 'JapanFund',
  settings: 'Settings',
  syncLog: 'SyncLog',
  snapshots: 'DailySnapshots'
};

function doGet() {
  return jsonResponse({ ok: true, service: 'Project 200 Sync', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (payload.action !== 'syncState' || !payload.state) {
      return jsonResponse({ ok: false, error: 'Invalid payload' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      syncState(payload.state, payload.deviceId || 'unknown');
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ ok: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    logSync('unknown', 'syncState', 'error', null, error.message);
    return jsonResponse({ ok: false, error: error.message });
  }
}

function syncState(state, deviceId) {
  replaceDataSheet(SHEETS.food, state.food || [], [
    'id','createdAt','date','time','name','meal','portion','note','unplanned','updatedAt','deleted'
  ]);
  replaceDataSheet(SHEETS.weights, state.weights || [], [
    'id','createdAt','date','weight','period','updatedAt','deleted'
  ]);
  replaceDataSheet(SHEETS.exercise, state.exercise || [], [
    'id','createdAt','date','exerciseType','duration','period','note','updatedAt','deleted'
  ]);
  replaceDataSheet(SHEETS.japanFund, state.japanFund || [], [
    'id','createdAt','date','type','amount','note','updatedAt','deleted'
  ]);

  const settings = state.settings || {};
  const settingsRows = Object.keys(settings).sort().map(key => [key, settings[key], new Date()]);
  replaceRows(SHEETS.settings, ['key','value','updatedAt'], settingsRows);

  logSync(deviceId, 'syncState', 'success', state, 'Full state synchronized');
}

function replaceDataSheet(sheetName, items, headers) {
  const rows = items.map(item => headers.map(header => {
    if (header === 'updatedAt') return item.updatedAt || new Date().toISOString();
    if (header === 'deleted') return Boolean(item.deleted);
    return item[header] == null ? '' : item[header];
  }));
  replaceRows(sheetName, headers, rows);
}

function replaceRows(sheetName, headers, rows) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function logSync(deviceId, operation, status, state, message) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.syncLog);
  const counts = state ? [
    (state.food || []).length,
    (state.weights || []).length,
    (state.exercise || []).length,
    (state.japanFund || []).length
  ] : ['', '', '', ''];
  sheet.appendRow([new Date(), deviceId, operation, status, ...counts, message || '']);
}

function nightlySnapshot() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const state = {
    food: readObjects(ss.getSheetByName(SHEETS.food)),
    weights: readObjects(ss.getSheetByName(SHEETS.weights)),
    exercise: readObjects(ss.getSheetByName(SHEETS.exercise)),
    japanFund: readObjects(ss.getSheetByName(SHEETS.japanFund)),
    settings: Object.fromEntries(readObjects(ss.getSheetByName(SHEETS.settings)).map(row => [row.key, row.value]))
  };
  ss.getSheetByName(SHEETS.snapshots).appendRow([
    Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd'),
    new Date(),
    state.food.length,
    state.weights.length,
    state.exercise.length,
    state.japanFund.length,
    JSON.stringify(state)
  ]);
}

function readObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift();
  return values.filter(row => row.some(value => value !== '')).map(row =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]]))
  );
}

function createMidnightTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'nightlySnapshot')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('nightlySnapshot')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .inTimezone(TIME_ZONE)
    .create();
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
