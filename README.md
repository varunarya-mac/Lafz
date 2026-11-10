# Lafz 📚✒️ — personal idioms practice + shayari (PWA)

A private, offline-first web app built for one user. Two sections:

- **Idioms & Words** — save English idioms/words/phrases with meaning, example,
  and difficulty (easy / medium / hard). Filter by difficulty and type, and
  mark any entry "excluded" to keep it out of practice.
- **Practice** — daily flashcard session with Leitner spaced repetition
  (answers schedule the next review at 1, 2, 4, 8, 16, 32 days), a streak
  counter, animated 3D flip cards, and per-session difficulty filtering.
- **Shayari** — save English verses with an *optional* poet name; filter by
  poet chips (auto-generated from your data), "Unnamed", or favorites.
- **Settings** — light/dark mode, daily goal size, JSON export/import backup.

Everything — UI, data, storage — runs on your phone. No server, no account,
no signing, nothing to renew. Ever.

---

## 🚀 Put it online (one-time, free) — pick ONE

### Option A: Netlify Drop (easiest, ~2 minutes)
1. Go to **https://app.netlify.com/drop**
2. Drag the whole `lafz` folder onto the page
3. You get a URL like `https://something.netlify.app` — that's your app

### Option B: GitHub Pages (free forever)
1. Create a repo (e.g. `lafz`) at github.com
2. Upload ALL files from this folder to the repo root (index.html must be at the top level)
3. Repo → Settings → Pages → Source: `main` branch, `/ (root)` → Save
4. Your app is at `https://YOURUSERNAME.github.io/lafz/`

### Option C: Mac + iPhone on same Wi-Fi (no internet hosting)
```
cd /Users/varun.arya/lafz
python3 -m http.server 8000
```
Then on iPhone Safari, open `http://YOUR-MAC-LOCAL-IP:8000`
(find the IP under System Settings → Wi-Fi → Details).

## 📲 Install on your iPhone (one-time)
1. Open your app's URL in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow) → **Add to Home Screen**
3. Tap **Add** — Lafz now appears with its own icon and opens full-screen
   like a real app

From now on: open it from the home screen. It works fully offline after the
first load. The in-app banner walks you through this the first time.

## 💾 Backups (important!)
All data lives in this device's browser storage:
- **Settings → Export JSON** — saves one file with everything (goes to Files/Downloads)
- **Settings → Import JSON** — merges it back (safe, no duplicates)
- The "Last backup" pill turns amber after 30 days without an export
- Deleting the Lafz icon (the installed web app) deletes its data with it —
  export first!

## 🔄 Updating the app later
Replace the files on your host (drag the new folder into Netlify Drop again,
or commit to GitHub). On the phone, simply open Lafz — if there's a new
version you'll see a "✨ New version ready — Refresh" toast.

## 🧪 Development
```
python3 tools/gen_icons.py   # regenerate icon PNGs (no dependencies)
node tools/test.js           # unit tests for practice engine, streak, merge, esc
python3 -m http.server 8000  # local preview
```

## Files
```
index.html            app shell (tabs, meta, manifest link)
manifest.webmanifest  PWA manifest (name, icons, standalone display)
sw.js                 service worker — offline caching
css/base.css          theme tokens (light/dark), buttons, segmented controls…
css/views.css         screens: lists, flashcards, sheets, toasts, confetti
js/util.js            pure helpers (dates, esc, uuid…) — unit-tested
js/engine.js          Leitner spaced repetition + streak + merge — unit-tested
js/db.js              IndexedDB wrapper + preferences
js/ui.js              toasts, bottom sheets (drag-to-dismiss), confetti, segs
js/main.js            bootstrap, routing, service worker, first-run welcome
js/views/             idioms · practice · shayari · settings screens
js/seed-*.js          sample pack (safe to reload — fixed IDs)
tools/                icon generator + unit tests
icons/                app icons (PNG + SVG)
```

Made just for you 💚 — v1.0
