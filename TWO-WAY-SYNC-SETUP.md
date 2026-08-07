# Project 200 two-way sync setup

This upgrade changes Project 200 from one-way device → Google Sheet backup into two-way device ↔ Google Sheet synchronization.

## Safety state

- Live app stays on `main` until this setup is complete.
- Upgrade code lives on `agent/two-way-sheet-sync`.
- A Google Sheets backup was created before the migration: `Project 200 Data - Backup before two-way sync 2026-08-07`.
- Do not delete the original `Project 200 Data` spreadsheet.

## 1. Upgrade the Apps Script backend first

1. Open the `Project 200 Data` spreadsheet.
2. Open **Extensions → Apps Script**.
3. Replace the existing sync code with the contents of `google-apps-script.gs` from the `agent/two-way-sheet-sync` branch.
4. Save the Apps Script project.
5. In the function dropdown, choose `generateProject200SyncKey` and run it once.
6. Approve the Google authorization prompt if shown.
7. Copy the generated key from the execution log. Keep it private. The backend stores only its SHA-256 hash.
8. Open **Deploy → Manage deployments**.
9. Edit the existing Project 200 web-app deployment, choose **New version**, and deploy it. Keep the same deployment URL.
10. Keep the deployment able to run from the GitHub Pages app; the private sync key protects pull and merge operations.

## 2. Test the backend before merging the PWA

Open the existing Apps Script web-app URL normally. It should report `Project 200 Sync v2`.

Do not add the private sync key to GitHub or this repository.

## 3. Merge the draft PR

After the backend is confirmed on v2, merge the draft PR from `agent/two-way-sheet-sync` into `main`.

The new service worker uses cache `project-200-v7-two-way-sync` and injects `sync-v2.js` plus the existing `edit-v1.js`.

## 4. Connect each device

1. Open Project 200 on the device after the GitHub Pages deployment completes.
2. The header badge will show **Cloud: setup**.
3. Tap it and enter the private sync key generated in Apps Script.
4. The badge should progress through **Cloud: syncing…** and then **Cloud: synced**.
5. Repeat on every other device using the same key.

The key is stored only in that browser/PWA profile's local storage, not in GitHub.

## 5. Verify cross-device sync

Use a harmless test record:

1. Add a temporary food entry on device A.
2. Confirm it appears in the `Food` sheet and `SyncLog` records a `mergeState` success.
3. Open Project 200 on device B and tap the Cloud badge if needed.
4. Confirm the test entry appears on device B.
5. Edit the entry on device B and confirm the change returns to device A.
6. Delete the test entry on one device and confirm it does not reappear on the other device.

## Merge rules

- Records are matched by their stable `id`.
- The newest `updatedAt` wins.
- New records from different devices are combined instead of replacing the full Sheet.
- Deletions create tombstones so stale devices cannot resurrect deleted records.
- Settings are merged per setting using per-setting timestamps.
- Local IndexedDB remains the offline working copy.
- The Google Sheet becomes the shared cloud copy and backup.

## Rollback

If anything behaves unexpectedly, do not clear browser data. Restore the live PWA from the pre-upgrade Git history and use the backup spreadsheet created before this migration.
