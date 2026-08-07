const SPREADSHEET_ID = '1VbsvtQgOofytN5B2g7UsF985xlUNVby_oZLsORRoYU0';
const TIME_ZONE = 'America/Chicago';
const SYNC_KEY_HASH_PROPERTY = 'PROJECT200_SYNC_KEY_SHA256';
const SHEETS = {
  food: 'Food',
  weights: 'Weight',
  exercise: 'Exercise',
  japanFund: 'JapanFund',
  settings: 'Settings',
  syncLog: 'SyncLog',
  snapshots: 'DailySnapshots'
};
const HEADERS = {
  food: ['id','createdAt','date','time','name','meal','portion','note','unplanned','updatedAt','deleted'],
  weights: ['id','createdAt','date','weight','period','updatedAt','deleted'],
  exercise: ['id','createdAt','date','exerciseType','duration','period','note','updatedAt','deleted'],
  japanFund: ['id','createdAt','date','type','amount','note','updatedAt','deleted']
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'status');
  if (action !== 'pull') {
    return jsonOrJsonp({ ok: true, service: 'Project 200 Sync v2', time: new Date().toISOString() }, params.callback);
  }

  try {
    requireSyncKey(params.key);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const cloud = readCloudState();
      logSync(params.deviceId || 'unknown', 'pull', 'success', cloud.state, 'Two-way state pulled');
      return jsonOrJsonp({
        ok: true,
        state: cloud.state,
        settingsUpdatedAt: cloud.settingsUpdatedAt,
        serverTime: new Date().toISOString()
      }, params.callback);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonOrJsonp({ ok: false, error: publicError(error) }, params.callback);
  }
}

function doPost(e) {
  let deviceId = 'unknown';
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    deviceId = payload.deviceId || 'unknown';
    if (payload.action !== 'mergeState' || !payload.state) {
      return jsonResponse({ ok: false, error: 'Invalid payload' });
    }
    requireSyncKey(payload.syncKey);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const merged = mergeIncomingState(payload.state, payload.settingsUpdatedAt || {}, payload.sentAt || new Date().toISOString());
      writeCloudState(merged);
      logSync(deviceId, 'mergeState', 'success', merged.state, 'Two-way state merged');
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ ok: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    logSync(deviceId, 'mergeState', 'error', null, publicError(error));
    return jsonResponse({ ok: false, error: publicError(error) });
  }
}

function mergeIncomingState(incomingState, incomingSettingsUpdatedAt, sentAt) {
  const cloud = readCloudState();
  const merged = {
    state: { version: 7, settings: {} },
    settingsUpdatedAt: {}
  };

  ['food','weights','exercise','japanFund'].forEach(key => {
    merged.state[key] = mergeRecordLists(
      cloud.state[key] || [],
      Array.isArray(incomingState[key]) ? incomingState[key] : [],
      sentAt
    );
  });

  const cloudSettings = cloud.state.settings || {};
  const incomingSettings = incomingState.settings || {};
  const keys = new Set([...Object.keys(cloudSettings), ...Object.keys(incomingSettings)]);
  keys.forEach(key => {
    const cloudTs = normalizeTimestamp(cloud.settingsUpdatedAt[key]);
    const incomingTs = normalizeTimestamp(incomingSettingsUpdatedAt[key]);

    if (incomingTs && (!cloudTs || incomingTs > cloudTs)) {
      merged.state.settings[key] = incomingSettings[key];
      merged.settingsUpdatedAt[key] = incomingTs;
    } else if (Object.prototype.hasOwnProperty.call(cloudSettings, key)) {
      merged.state.settings[key] = cloudSettings[key];
      merged.settingsUpdatedAt[key] = cloudTs || '';
    } else if (Object.prototype.hasOwnProperty.call(incomingSettings, key)) {
      merged.state.settings[key] = incomingSettings[key];
      merged.settingsUpdatedAt[key] = incomingTs || normalizeTimestamp(sentAt) || new Date().toISOString();
    }
  });

  return merged;
}

function mergeRecordLists(existing, incoming, fallbackTimestamp) {
  const map = new Map();
  existing.forEach(item => {
    const normalized = normalizeRecord(item, fallbackTimestamp);
    if (normalized.id) map.set(String(normalized.id), normalized);
  });
  incoming.forEach(item => {
    const normalized = normalizeRecord(item, fallbackTimestamp);
    if (!normalized.id) return;
    const id = String(normalized.id);
    const current = map.get(id);
    map.set(id, chooseRecord(normalized, current));
  });
  return [...map.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function chooseRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = normalizeTimestamp(a.updatedAt);
  const tb = normalizeTimestamp(b.updatedAt);
  if (ta > tb) return a;
  if (tb > ta) return b;
  if (Boolean(a.deleted) !== Boolean(b.deleted)) return a.deleted ? a : b;
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

function normalizeRecord(item, fallbackTimestamp) {
  const copy = Object.assign({}, item || {});
  copy.id = String(copy.id || '');
  copy.updatedAt = normalizeTimestamp(copy.updatedAt) || normalizeTimestamp(Number(copy.createdAt)) || normalizeTimestamp(fallbackTimestamp) || new Date().toISOString();
  copy.deleted = toBoolean(copy.deleted);
  return copy;
}

function readCloudState() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const result = {
    state: { version: 7, settings: {} },
    settingsUpdatedAt: {}
  };

  ['food','weights','exercise','japanFund'].forEach(key => {
    const sheet = ss.getSheetByName(SHEETS[key]);
    const rows = sheet ? readObjects(sheet) : [];
    result.state[key] = rows.map(row => normalizeSheetRecord(key, row));
  });

  const settingsSheet = ss.getSheetByName(SHEETS.settings);
  const settingsRows = settingsSheet ? readObjects(settingsSheet) : [];
  settingsRows.forEach(row => {
    if (!row.key) return;
    result.state.settings[String(row.key)] = row.value;
    result.settingsUpdatedAt[String(row.key)] = normalizeTimestamp(row.updatedAt) || '';
  });

  return result;
}

function writeCloudState(cloud) {
  ['food','weights','exercise','japanFund'].forEach(key => {
    replaceDataSheet(SHEETS[key], cloud.state[key] || [], HEADERS[key]);
  });

  const settingKeys = Object.keys(cloud.state.settings || {}).sort();
  const rows = settingKeys.map(key => [
    key,
    cloud.state.settings[key],
    normalizeTimestamp(cloud.settingsUpdatedAt[key]) || new Date().toISOString()
  ]);
  replaceRows(SHEETS.settings, ['key','value','updatedAt'], rows);
}

function normalizeSheetRecord(key, row) {
  const normalized = normalizeRecord(row, '');
  if (key === 'food') normalized.unplanned = toBoolean(row.unplanned);
  if (key === 'weights') normalized.weight = toNumberIfPossible(row.weight);
  if (key === 'exercise') normalized.duration = toNumberIfPossible(row.duration);
  if (key === 'japanFund') normalized.amount = toNumberIfPossible(row.amount);
  normalized.createdAt = toNumberIfPossible(row.createdAt);
  return normalized;
}

function replaceDataSheet(sheetName, items, headers) {
  const rows = items.map(item => headers.map(header => {
    if (header === 'updatedAt') return normalizeTimestamp(item.updatedAt) || new Date().toISOString();
    if (header === 'deleted') return Boolean(item.deleted);
    if (header === 'unplanned') return Boolean(item.unplanned);
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

function readObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(String);
  return values
    .filter(row => row.some(value => value !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function logSync(deviceId, operation, status, state, message) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.syncLog);
    if (!sheet) return;
    const counts = state ? [
      activeCount(state.food),
      activeCount(state.weights),
      activeCount(state.exercise),
      activeCount(state.japanFund)
    ] : ['', '', '', ''];
    sheet.appendRow([new Date(), deviceId, operation, status, ...counts, message || '']);
  } catch (_) {}
}

function activeCount(items) {
  return (Array.isArray(items) ? items : []).filter(item => !toBoolean(item.deleted)).length;
}

function nightlySnapshot() {
  const cloud = readCloudState();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheetByName(SHEETS.snapshots).appendRow([
    Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd'),
    new Date(),
    activeCount(cloud.state.food),
    activeCount(cloud.state.weights),
    activeCount(cloud.state.exercise),
    activeCount(cloud.state.japanFund),
    JSON.stringify(cloud)
  ]);
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

function generateProject200SyncKey() {
  const key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(SYNC_KEY_HASH_PROPERTY, sha256Hex(key));
  console.log('Project 200 sync key (copy this now; it is not stored in plain text): ' + key);
  return key;
}

function requireSyncKey(candidate) {
  const expected = PropertiesService.getScriptProperties().getProperty(SYNC_KEY_HASH_PROPERTY);
  if (!expected) throw new Error('Sync key is not configured');
  if (!candidate || sha256Hex(String(candidate)) !== expected) throw new Error('Unauthorized sync key');
}

function sha256Hex(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}

function normalizeTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'number' && isFinite(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  const date = new Date(text);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

function toBoolean(value) {
  if (value === true || value === false) return value;
  const text = String(value == null ? '' : value).trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

function toNumberIfPossible(value) {
  if (value === '' || value == null) return value;
  const number = Number(value);
  return isFinite(number) ? number : value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result = {};
    Object.keys(value).sort().forEach(key => result[key] = stableValue(value[key]));
    return result;
  }
  return value;
}

function publicError(error) {
  const message = String(error && error.message || error || 'Unknown error');
  if (/unauthor/i.test(message)) return 'Unauthorized sync key';
  if (/sync key is not configured/i.test(message)) return 'Sync key is not configured';
  return message;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function jsonOrJsonp(value, callback) {
  const cb = String(callback || '').trim();
  if (!cb) return jsonResponse(value);
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) return jsonResponse({ ok: false, error: 'Invalid callback' });
  const json = JSON.stringify(value).replace(/</g, '\u003c');
  return ContentService.createTextOutput(`${cb}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
