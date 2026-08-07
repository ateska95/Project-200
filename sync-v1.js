'use strict';

(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyvd1-YucDANlfQE5gCzykSMRHu6eUmueuD4dMQ8_kARYaWUkGsPTCjyIFo60wYH4Oq/exec';
  const DB_NAME = 'project-200-db';
  const STORE_NAME = 'app-state';
  const STATE_KEY = 'current';
  const DEVICE_KEY = 'project-200-device-id';
  const LAST_FP_KEY = 'project-200-last-sheet-fingerprint';
  const LAST_COUNT_KEY = 'project-200-last-sheet-count';
  const PENDING_KEY = 'project-200-sheet-sync-pending';
  const LAST_SYNC_KEY = 'project-200-last-sheet-sync-at';

  let observedFingerprint = null;
  let syncRunning = false;
  let initialized = false;

  function getDeviceId() {
    try {
      let value = localStorage.getItem(DEVICE_KEY);
      if (!value) {
        value = (crypto.randomUUID ? crypto.randomUUID() : `pixel-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        localStorage.setItem(DEVICE_KEY, value);
      }
      return value;
    } catch (_) {
      return 'project-200-device';
    }
  }

  function entryCount(value) {
    if (!value || typeof value !== 'object') return 0;
    return ['food', 'weights', 'exercise', 'japanFund']
      .reduce((sum, key) => sum + (Array.isArray(value[key]) ? value[key].length : 0), 0);
  }

  function fingerprint(value) {
    try { return JSON.stringify(value); }
    catch (_) { return String(Date.now()); }
  }

  function setStored(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function getStored(key, fallback = '') {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  }

  function setStatus(text, kind = 'neutral') {
    let badge = document.getElementById('project-200-sheet-sync');
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'project-200-sheet-sync';
      badge.type = 'button';
      badge.title = 'Tap to sync Project 200 with Google Sheets now';
      Object.assign(badge.style, {
        border: '1px solid #cfd8e6',
        borderRadius: '999px',
        padding: '0.42rem 0.7rem',
        background: '#fff',
        color: '#334155',
        font: 'inherit',
        fontSize: '0.76rem',
        fontWeight: '700',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      });
      badge.addEventListener('click', () => {
        setStored(PENDING_KEY, '1');
        attemptSync(true);
      });
      const target = document.querySelector('.header-actions') || document.querySelector('.app-header') || document.body;
      target.appendChild(badge);
    }
    badge.textContent = text;
    badge.style.opacity = kind === 'error' ? '1' : '0.92';
  }

  function readState() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = () => reject(request.error || new Error('Could not open local database'));
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close();
          resolve(null);
          return;
        }
        const tx = db.transaction(STORE_NAME, 'readonly');
        const get = tx.objectStore(STORE_NAME).get(STATE_KEY);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => reject(get.error || new Error('Could not read local state'));
        tx.oncomplete = () => db.close();
      };
    });
  }

  async function sendState(value) {
    const payload = {
      action: 'syncState',
      deviceId: getDeviceId(),
      sentAt: new Date().toISOString(),
      state: value
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

  async function attemptSync(manual = false) {
    if (syncRunning) return;
    if (!navigator.onLine) {
      setStatus('Sheets: offline');
      return;
    }

    syncRunning = true;
    try {
      const value = await readState();
      if (!value) {
        setStatus('Sheets: no local data');
        return;
      }

      const fp = fingerprint(value);
      const count = entryCount(value);
      const lastFp = getStored(LAST_FP_KEY);
      const lastCount = Number(getStored(LAST_COUNT_KEY, '0')) || 0;
      const pending = getStored(PENDING_KEY) === '1';

      if (!manual && !pending && fp === lastFp) {
        setStatus('Sheets: synced');
        return;
      }

      if (count === 0 && lastCount > 0) {
        setStored(PENDING_KEY, '1');
        setStatus('Sheets: sync blocked', 'error');
        console.warn('Project 200 Sheets sync blocked: local database is unexpectedly empty while a prior synced count exists.');
        return;
      }

      setStatus('Sheets: syncing…');
      await sendState(value);
      setStored(LAST_FP_KEY, fp);
      setStored(LAST_COUNT_KEY, count);
      setStored(PENDING_KEY, '0');
      setStored(LAST_SYNC_KEY, new Date().toISOString());
      setStatus('Sheets: synced');
    } catch (error) {
      console.error('Project 200 Sheets sync failed:', error);
      setStored(PENDING_KEY, '1');
      setStatus('Sheets: retry pending', 'error');
    } finally {
      syncRunning = false;
    }
  }

  async function watchForChanges() {
    try {
      const value = await readState();
      const fp = fingerprint(value);
      const count = entryCount(value);

      if (!initialized) {
        initialized = true;
        observedFingerprint = fp;
        const pending = getStored(PENDING_KEY) === '1';
        const hasNeverSynced = !getStored(LAST_FP_KEY);
        if (pending || (hasNeverSynced && count > 0)) {
          setStored(PENDING_KEY, '1');
          attemptSync();
        } else {
          setStatus(navigator.onLine ? 'Sheets: ready' : 'Sheets: offline');
        }
        return;
      }

      if (fp !== observedFingerprint) {
        observedFingerprint = fp;
        setStored(PENDING_KEY, '1');
        window.setTimeout(() => attemptSync(), 350);
      } else if (getStored(PENDING_KEY) === '1' && navigator.onLine) {
        attemptSync();
      }
    } catch (error) {
      console.error('Project 200 Sheets watcher error:', error);
    }
  }

  window.addEventListener('online', () => attemptSync());
  window.addEventListener('offline', () => setStatus('Sheets: offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') watchForChanges();
  });

  window.setInterval(watchForChanges, 2000);
  window.setTimeout(watchForChanges, 800);
})();
