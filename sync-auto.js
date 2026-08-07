'use strict';

(() => {
  // Project 200 is a single-user personal app. Keep cloud sync automatic by
  // supplying an internal non-secret marker so the v2 sync client never asks
  // the user for a key. The Apps Script backend in no-key mode ignores it.
  try {
    localStorage.setItem('project-200-sync-key-v2', 'project-200-auto-sync');
  } catch (_) {}
})();
