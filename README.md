# Project 200 PWA

A private, installable tracker for fitness progress and the Japan 2027 reward fund, beginning August 1, 2026.

## Included features

- Two-screen design: journey dashboard and input center
- Food, exercise, and weight entry forms
- Japan 2027 cash tracker with a $500 starting balance, $10,000 goal, and $850 monthly contribution plan
- In-app monthly contribution reminder and deposit/withdrawal history
- Red-to-green weight progress visualization
- Journey-wide exercise and food summaries
- IndexedDB storage on the device
- Offline support through a service worker
- Installable Android PWA manifest and icons
- JSON backup/import and CSV export

## Important data note

Health and Japan fund entries are saved in the browser's local IndexedDB database. They are not uploaded to a server. Clearing browser/site storage can delete them, so export periodic JSON backups.

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

Edit the files in the hosted repository. The service worker will cache the new files after the deployed site is revisited. This package uses `project-200-v2`. When making another major change, update `CACHE_NAME` in `sw.js` to `project-200-v3` so older cached files are removed.

The Japan fund reminder is an in-app reminder: it appears when Project 200 is opened during a month whose planned contribution has not yet been fully recorded.
