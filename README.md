# Project 200 PWA — Four-tab redesign

A private, installable tracker for fitness progress and the Japan 2027 reward fund, beginning August 1, 2026.

## Main layout

- **Dashboard:** weight progress bar, total food entries, total unplanned-food entries, total exercise count/time, and the Japan fund tracker
- **Food:** streamlined food form followed by a navigable weekly entry calendar
- **Weight:** streamlined weigh-in form followed by a whole-program weight timeline chart
- **Exercise:** streamlined exercise form, weekly minutes-per-day view, and whole-program session/time totals

## Data and offline use

Entries are saved in the browser's local IndexedDB database and are not uploaded to a server. The update preserves data from earlier Project 200 versions. Clearing browser/site storage can delete local entries, so export periodic JSON backups.

## Publish with GitHub Pages

Upload the contents of this package to the repository root, replacing files with matching names. Keep **Settings → Pages → Deploy from a branch → main → /(root)**.

The service-worker cache is `project-200-v3`. After GitHub Pages finishes deploying, open the app while online, then close and reopen the installed app. The app also checks for a new service worker when launched.
