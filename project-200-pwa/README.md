# Project 200 PWA

A private, installable fitness tracker for food, exercise, and weight progress beginning August 1, 2026.

## Included features

- Two-screen design: journey dashboard and input center
- Food, exercise, and weight entry forms
- Red-to-green weight progress visualization
- Journey-wide exercise and food summaries
- IndexedDB storage on the device
- Offline support through a service worker
- Installable Android PWA manifest and icons
- JSON backup/import and CSV export

## Important data note

Entries are saved in the browser's local IndexedDB database. They are not uploaded to a server. Clearing browser/site storage can delete them, so export periodic JSON backups.

## Test locally

Service workers require HTTP or HTTPS. From this folder, run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a desktop browser.

## Publish with GitHub Pages

1. Create a new GitHub repository, for example `project-200`.
2. Upload every file and folder from this package to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Open the HTTPS Pages address GitHub provides.

## Install on Android

1. Open the hosted HTTPS address in Chrome on Android.
2. Tap the app's **Install app** button when it appears, or open Chrome's menu.
3. Choose **Add to Home screen** or **Install app**.
4. Launch Project 200 from the new home-screen icon.

## Updating the app

Edit the files in the hosted repository. The service worker will cache the new files after the deployed site is revisited. When making major changes, update `CACHE_NAME` in `sw.js` so older cached files are removed.
