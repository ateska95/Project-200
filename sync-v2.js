'use strict';

(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyvd1-YucDANlfQE5gCzykSMRHu6eUmueuD4dMQ8_kARYaWUkGsPTCjyIFo60wYH4Oq/exec';
  const DB_NAME = 'project-200-db';
  const STORE_NAME = 'app-state';
  const STATE_KEY = 'current';
  const DEVICE_KEY = 'project-200-device-id';
  const SYNC_KEY = 'project-200-sync-key-v2';
  const META_KEY = 'project-200-sync-meta-v2';
  const COLLECTIONS = ['food', 'weights', 'exercise', 'japanFund'];
  const POLL_MS = 30000;
  const WATCH_MS = 2000;

  let syncRunning = false;
  let syncQueued = false;
  let keyInvalid = false;
  let badge = null;

  function nowIso() { return new Date().toISOString(); }

  function getStored(key, fallback = '') {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  }

  function setStored(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function removeStored(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function getDeviceId() {
    let value = getStored(DEVICE_KEY);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setStored(DEVICE_KEY, value);
    }
    return value;
  }

  function getSyncKey() { return getStored(SYNC_KEY).trim(); }

  function emptyMeta() {
    return {
      version: 2,
      initialized: false,
      tombstones: Object.fromEntries(COLLECTIONS.map(key => [key, {}])),
      lastRecords: Object.fromEntries(COLLECTIONS.map(key => [key, {}])),
      lastSettings: {},
      settingsUpdatedAt: {},
      lastSuccessAt: ''
    };
  }

  function loadMeta() {
    try {
      const parsed = JSON.parse(getStored(META_KEY, ''));
      if (!parsed || typeof parsed !== 'object') return emptyMeta();
      const meta = { ...emptyMeta(), ...parsed };
      COLLECTIONS.forEach(key => {
        if (!meta.tombstones?.[key] || typeof meta.tombstones[key] !== 'object') meta.tombstones[key] = {};
        if (!meta.lastRecords?.[key] || typeof meta.lastRecords[key] !== 'object') meta.lastRecords[key] = {};
      });
      if (!meta.lastSettings || typeof meta.lastSettings !== 'object') meta.lastSettings = {};
      if (!meta.settingsUpdatedAt || typeof meta.settingsUpdatedAt !== 'object') meta.settingsUpdatedAt = {};
      return meta;
    } catch (_) {
      return emptyMeta();
    }
  }

  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (_) {}
  }

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    }
    return value;
  }

  function stableStringify(value) {
    try { return JSON.stringify(stable(value)); } catch (_) { return String(value); }
  }

  function recordCore(record) {
    const copy = { ...(record || {}) };
    delete copy.updatedAt;
    delete copy.deleted;
    return copy;
  }

  function sameCore(a, b) {
    return stableStringify(recordCore(a)) === stableStringify(recordCore(b));
  }

  function normalizeTimestamp(value, fallback = '') {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    const text = String(value || '').trim();
    if (text) {
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (fallback) return normalizeTimestamp(fallback, '');
    return '';
  }

  function normalizeRecord(record, fallbackTimestamp = '') {
    const copy = { ...(record || {}) };
    copy.id = String(copy.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`));
    copy.updatedAt = normalizeTimestamp(copy.updatedAt) || normalizeTimestamp(Number(copy.createdAt)) || fallbackTimestamp || nowIso();
    copy.deleted = Boolean(copy.deleted);
    return copy;
  }

  function readState() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = () => reject(request.error || new Error('Could not open Project 200 local data'));
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close(); resolve(null); return;
        }
        const tx = db.transaction(STORE_NAME, 'readonly');
        const get = tx.objectStore(STORE_NAME).get(STATE_KEY);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => reject(get.error || new Error('Could not read Project 200 local data'));
        tx.oncomplete = () => db.close();
      };
    });
  }

  function writeState(value) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = () => reject(request.error || new Error('Could not open Project 200 local data'));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, STATE_KEY);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error || new Error('Could not write Project 200 local data'));
      };
    });
  }

  function normalizeAppState(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    let normalized;
    try {
      normalized = typeof normalizeState === 'function'
        ? normalizeState(input)
        : {
            version: Number(input.version) || 7,
            food: Array.isArray(input.food) ? input.food : [],
            weights: Array.isArray(input.weights) ? input.weights : [],
            exercise: Array.isArray(input.exercise) ? input.exercise : [],
            japanFund: Array.isArray(input.japanFund) ? input.japanFund : [],
            settings: input.settings && typeof input.settings === 'object' ? input.settings : {}
          };
    } catch (_) {
      normalized = {
        version: Number(input.version) || 7,
        food: Array.isArray(input.food) ? input.food : [],
        weights: Array.isArray(input.weights) ? input.weights : [],
        exercise: Array.isArray(input.exercise) ? input.exercise : [],
        japanFund: Array.isArray(input.japanFund) ? input.japanFund : [],
        settings: input.settings && typeof input.settings === 'object' ? input.settings : {}
      };
    }

    COLLECTIONS.forEach(key => {
      const sourceById = new Map((Array.isArray(input[key]) ? input[key] : []).map(item => [String(item?.id || ''), item]));
      normalized[key] = (Array.isArray(normalized[key]) ? normalized[key] : []).map(item => {
        const source = sourceById.get(String(item.id)) || {};
        return {
          ...item,
          updatedAt: normalizeTimestamp(source.updatedAt) || normalizeTimestamp(Number(item.createdAt)) || '',
          deleted: false
        };
      });
    });
    normalized.version = Math.max(7, Number(normalized.version) || 0);
    return normalized;
  }

  function setStatus(text, kind = 'neutral') {
    if (!badge) {
      badge = document.getElementById('project-200-sheet-sync');
      if (!badge) {
        badge = document.createElement('button');
        badge.id = 'project-200-sheet-sync';
        badge.type = 'button';
        Object.assign(badge.style, {
          border: '1px solid #cfd8e6', borderRadius: '999px', padding: '0.42rem 0.7rem',
          background: '#fff', color: '#334155', font: 'inherit', fontSize: '0.76rem',
          fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
        });
        badge.addEventListener('click', handleBadgeClick);
        const target = document.querySelector('.header-actions') || document.querySelector('.app-header') || document.body;
        target.appendChild(badge);
      }
    }
    badge.textContent = text;
    badge.title = getSyncKey()
      ? 'Tap to synchronize Project 200 across devices now'
      : 'Tap to connect this device to Project 200 cloud sync';
    badge.style.opacity = kind === 'error' ? '1' : '0.92';
    badge.style.borderColor = kind === 'error' ? '#f1a7a0' : '#cfd8e6';
  }

  function promptForKey() {
    const current = getSyncKey();
    const value = window.prompt(
      current
        ? 'Enter the Project 200 sync key for this device. Leave blank to keep the current key.'
        : 'Enter your private Project 200 sync key. Use the same key on every device.',
      ''
    );
    if (value === null) return false;
    const cleaned = value.trim();
    if (!cleaned && current) return true;
    if (cleaned.length < 16) {
      window.alert('Use a sync key at least 16 characters long.');
      return false;
    }
    setStored(SYNC_KEY, cleaned);
    keyInvalid = false;
    return true;
  }

  function handleBadgeClick() {
    if (!getSyncKey() || keyInvalid) {
      if (!promptForKey()) return;
    }
    fullSync('manual');
  }

  function collectLocalChanges(raw, meta) {
    const activeState = normalizeAppState(raw);
    const tombstones = Object.fromEntries(COLLECTIONS.map(key => [key, { ...(meta.tombstones[key] || {}) }]));
    const lastRecords = Object.fromEntries(COLLECTIONS.map(key => [key, { ...(meta.lastRecords[key] || {}) }]));
    const settingsUpdatedAt = { ...(meta.settingsUpdatedAt || {}) };
    let mutationDetected = false;
    let metadataChanged = false;
    const stamp = nowIso();

    COLLECTIONS.forEach(key => {
      const previous = lastRecords[key];
      const currentMap = {};
      activeState[key] = activeState[key].map(item => {
        const id = String(item.id);
        const prev = previous[id];
        let updatedAt = normalizeTimestamp(item.updatedAt);
        const coreChanged = Boolean(prev && !sameCore(item, prev));

        if (!updatedAt) updatedAt = prev?.updatedAt || normalizeTimestamp(Number(item.createdAt)) || stamp;
        if (coreChanged && normalizeTimestamp(updatedAt) <= normalizeTimestamp(prev.updatedAt)) updatedAt = stamp;
        if (!prev && meta.initialized) mutationDetected = true;
        if (coreChanged) mutationDetected = true;
        if (item.updatedAt !== updatedAt) metadataChanged = true;

        const normalized = { ...item, updatedAt, deleted: false };
        currentMap[id] = normalized;
        delete tombstones[key][id];
        return normalized;
      });

      if (meta.initialized) {
        Object.keys(previous).forEach(id => {
          if (currentMap[id]) return;
          const existingTombstone = tombstones[key][id];
          if (!existingTombstone) {
            tombstones[key][id] = { ...previous[id], deleted: true, updatedAt: stamp };
            mutationDetected = true;
          }
        });
      }
      lastRecords[key] = currentMap;
    });

    const localSettings = activeState.settings || {};
    const previousSettings = meta.lastSettings || {};
    const settingKeys = new Set([...Object.keys(localSettings), ...Object.keys(previousSettings)]);
    settingKeys.forEach(key => {
      const before = stableStringify(previousSettings[key]);
      const after = stableStringify(localSettings[key]);
      if (meta.initialized && before !== after) {
        settingsUpdatedAt[key] = stamp;
        mutationDetected = true;
      }
    });

    return {
      activeState,
      tombstones,
      lastRecords,
      lastSettings: { ...localSettings },
      settingsUpdatedAt,
      mutationDetected,
      metadataChanged
    };
  }

  function envelopeFromLocal(local) {
    const stateWithTombstones = {
      version: 7,
      settings: { ...(local.activeState.settings || {}) }
    };
    COLLECTIONS.forEach(key => {
      stateWithTombstones[key] = [
        ...local.activeState[key].map(item => normalizeRecord(item)),
        ...Object.values(local.tombstones[key] || {}).map(item => normalizeRecord({ ...item, deleted: true }))
      ];
    });
    return {
      state: stateWithTombstones,
      settingsUpdatedAt: { ...(local.settingsUpdatedAt || {}) }
    };
  }

  function normalizeEnvelope(payload) {
    const source = payload?.state && typeof payload.state === 'object' ? payload.state : {};
    const envelope = {
      state: { version: 7, settings: source.settings && typeof source.settings === 'object' ? { ...source.settings } : {} },
      settingsUpdatedAt: { ...(payload?.settingsUpdatedAt || payload?.syncMeta?.settingsUpdatedAt || source?._sync?.settingsUpdatedAt || {}) }
    };
    COLLECTIONS.forEach(key => {
      envelope.state[key] = (Array.isArray(source[key]) ? source[key] : []).map(item => normalizeRecord(item));
    });
    return envelope;
  }

  function chooseRecord(a, b) {
    if (!a) return b;
    if (!b) return a;
    const ta = normalizeTimestamp(a.updatedAt) || '';
    const tb = normalizeTimestamp(b.updatedAt) || '';
    if (ta > tb) return a;
    if (tb > ta) return b;
    if (Boolean(a.deleted) !== Boolean(b.deleted)) return a.deleted ? a : b;
    return stableStringify(a) >= stableStringify(b) ? a : b;
  }

  function mergeEnvelopes(localPayload, cloudPayload) {
    const local = normalizeEnvelope(localPayload);
    const cloud = normalizeEnvelope(cloudPayload);
    const merged = {
      state: { version: 7, settings: {} },
      settingsUpdatedAt: {}
    };

    COLLECTIONS.forEach(key => {
      const map = new Map();
      cloud.state[key].forEach(item => map.set(String(item.id), item));
      local.state[key].forEach(item => map.set(String(item.id), chooseRecord(item, map.get(String(item.id)))));
      merged.state[key] = [...map.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    });

    const settingKeys = new Set([
      ...Object.keys(cloud.state.settings || {}),
      ...Object.keys(local.state.settings || {})
    ]);
    settingKeys.forEach(key => {
      const localTs = normalizeTimestamp(local.settingsUpdatedAt[key]);
      const cloudTs = normalizeTimestamp(cloud.settingsUpdatedAt[key]);
      let useLocal = false;
      if (localTs && cloudTs) useLocal = localTs > cloudTs;
      else if (localTs && !cloudTs) useLocal = true;
      else if (!localTs && !cloudTs) useLocal = !(key in cloud.state.settings) && (key in local.state.settings);

      if (useLocal) {
        merged.state.settings[key] = local.state.settings[key];
        merged.settingsUpdatedAt[key] = localTs || nowIso();
      } else if (key in cloud.state.settings) {
        merged.state.settings[key] = cloud.state.settings[key];
        merged.settingsUpdatedAt[key] = cloudTs || localTs || '';
      } else {
        merged.state.settings[key] = local.state.settings[key];
        merged.settingsUpdatedAt[key] = localTs || '';
      }
    });

    return merged;
  }

  function activeStateFromEnvelope(envelope) {
    const raw = { version: 7, settings: { ...(envelope.state.settings || {}) } };
    COLLECTIONS.forEach(key => {
      raw[key] = envelope.state[key].filter(item => !item.deleted).map(item => ({ ...item, deleted: false }));
    });
    return normalizeAppState(raw);
  }

  function metaFromMerged(envelope, previousMeta) {
    const active = activeStateFromEnvelope(envelope);
    const meta = { ...emptyMeta(), ...(previousMeta || {}) };
    meta.initialized = true;
    meta.settingsUpdatedAt = { ...(envelope.settingsUpdatedAt || {}) };
    meta.lastSettings = { ...(active.settings || {}) };
    meta.tombstones = Object.fromEntries(COLLECTIONS.map(key => [key, {}]));
    meta.lastRecords = Object.fromEntries(COLLECTIONS.map(key => [key, {}]));

    COLLECTIONS.forEach(key => {
      envelope.state[key].forEach(item => {
        const normalized = normalizeRecord(item);
        if (normalized.deleted) meta.tombstones[key][String(normalized.id)] = normalized;
        else meta.lastRecords[key][String(normalized.id)] = normalized;
      });
    });
    return meta;
  }

  async function applyMerged(envelope, meta) {
    const active = activeStateFromEnvelope(envelope);
    await writeState(active);
    try {
      if (typeof state !== 'undefined') state = active;
      if (typeof populateSettingsFields === 'function') populateSettingsFields();
      if (typeof renderAll === 'function') renderAll();
    } catch (error) {
      console.warn('Project 200 cloud sync updated local storage, but the live screen could not refresh.', error);
    }
    saveMeta(meta);
    return active;
  }

  function envelopeFingerprint(envelope) {
    return stableStringify(normalizeEnvelope(envelope));
  }

  function pullCloud() {
    const key = getSyncKey();
    if (!key) return Promise.reject(new Error('Sync key is not configured'));

    return new Promise((resolve, reject) => {
      const callbackName = `__project200Pull_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const script = document.createElement('script');
      const timeout = window.setTimeout(() => cleanup(new Error('Cloud sync timed out')), 15000);

      function cleanup(error, payload) {
        window.clearTimeout(timeout);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        script.remove();
        if (error) reject(error); else resolve(payload);
      }

      window[callbackName] = payload => {
        if (!payload?.ok) {
          const message = payload?.error || 'Cloud sync was rejected';
          if (/unauthor/i.test(message)) keyInvalid = true;
          cleanup(new Error(message));
          return;
        }
        keyInvalid = false;
        cleanup(null, payload);
      };

      script.onerror = () => cleanup(new Error('Could not reach Project 200 cloud sync'));
      const params = new URLSearchParams({
        action: 'pull',
        callback: callbackName,
        deviceId: getDeviceId(),
        key,
        _: String(Date.now())
      });
      script.src = `${ENDPOINT}?${params.toString()}`;
      document.head.appendChild(script);
    });
  }

  async function pushCloud(envelope) {
    const key = getSyncKey();
    if (!key) throw new Error('Sync key is not configured');
    const payload = {
      action: 'mergeState',
      deviceId: getDeviceId(),
      sentAt: nowIso(),
      syncKey: key,
      state: envelope.state,
      settingsUpdatedAt: envelope.settingsUpdatedAt
    };
    await fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      keepalive: true
    });
  }

  function delay(ms) { return new Promise(resolve => window.setTimeout(resolve, ms)); }

  async function fullSync(reason = 'automatic') {
    if (syncRunning) { syncQueued = true; return; }
    if (!navigator.onLine) { setStatus('Cloud: offline'); return; }
    if (!getSyncKey()) { setStatus('Cloud: setup'); return; }

    syncRunning = true;
    setStatus('Cloud: syncing…');
    try {
      let meta = loadMeta();
      const raw = await readState();
      if (!raw) throw new Error('No local Project 200 data was found');

      const local = collectLocalChanges(raw, meta);
      if (local.metadataChanged) await writeState(local.activeState);
      const localEnvelope = envelopeFromLocal(local);
      const pulled = await pullCloud();
      const cloudEnvelope = normalizeEnvelope(pulled);
      let merged = mergeEnvelopes(localEnvelope, cloudEnvelope);
      meta = metaFromMerged(merged, meta);
      await applyMerged(merged, meta);

      const needsPush = envelopeFingerprint(merged) !== envelopeFingerprint(cloudEnvelope);
      if (needsPush) {
        setStatus('Cloud: uploading…');
        await pushCloud(merged);
        await delay(900);
        const confirm = normalizeEnvelope(await pullCloud());
        merged = mergeEnvelopes(merged, confirm);
        meta = metaFromMerged(merged, meta);
        await applyMerged(merged, meta);
        if (envelopeFingerprint(merged) !== envelopeFingerprint(confirm)) await pushCloud(merged);
      }

      meta.lastSuccessAt = nowIso();
      saveMeta(meta);
      setStatus('Cloud: synced');
      window.dispatchEvent(new CustomEvent('project200:cloud-synced', { detail: { reason, at: meta.lastSuccessAt } }));
    } catch (error) {
      console.error('Project 200 two-way sync failed:', error);
      const message = String(error?.message || error);
      if (/unauthor|sync key/i.test(message)) {
        keyInvalid = true;
        setStatus('Cloud: key needed', 'error');
      } else {
        setStatus('Cloud: retry pending', 'error');
      }
    } finally {
      syncRunning = false;
      if (syncQueued) {
        syncQueued = false;
        window.setTimeout(() => fullSync('queued'), 500);
      }
    }
  }

  async function watchLocal() {
    if (syncRunning) return;
    try {
      const meta = loadMeta();
      if (!meta.initialized) return;
      const raw = await readState();
      if (!raw) return;
      const local = collectLocalChanges(raw, meta);
      if (!local.mutationDetected && !local.metadataChanged) return;

      await writeState(local.activeState);
      meta.tombstones = local.tombstones;
      meta.lastRecords = local.lastRecords;
      meta.lastSettings = local.lastSettings;
      meta.settingsUpdatedAt = local.settingsUpdatedAt;
      saveMeta(meta);
      setStatus(navigator.onLine ? 'Cloud: changes pending' : 'Cloud: offline');
      if (navigator.onLine && getSyncKey()) window.setTimeout(() => fullSync('local-change'), 500);
    } catch (error) {
      console.warn('Project 200 local sync watcher error:', error);
    }
  }

  window.addEventListener('online', () => fullSync('online'));
  window.addEventListener('offline', () => setStatus('Cloud: offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fullSync('resume');
  });

  setStatus(getSyncKey() ? 'Cloud: ready' : 'Cloud: setup');
  window.setInterval(watchLocal, WATCH_MS);
  window.setInterval(() => fullSync('poll'), POLL_MS);
  window.setTimeout(() => fullSync('startup'), 1000);

  window.Project200CloudSync = {
    syncNow: () => fullSync('api'),
    forgetKey: () => { removeStored(SYNC_KEY); keyInvalid = false; setStatus('Cloud: setup'); },
    getDeviceId,
    getLastSuccessAt: () => loadMeta().lastSuccessAt || ''
  };
})();
