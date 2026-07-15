# ZAHL

A demonic tamagotchi. Feed it, pet it, catch drifting souls, spend them on
rituals — neglect it and it goes feral, then devolves. Pet logic and pixel
art are ported from [grimwalker](https://github.com/numbpill3d/grimwalker)'s
`zahl_pet.cpp` and its canvas sprite renderer; the WiFi-hardware actions
(deauth, beacon spam, evil portal) are replaced with self-contained game
mechanics so this runs anywhere, no ESP32 required.

## Structure

- `core/` — shared engine, edit here only. `zahl-core.js` is the pet state
  machine, `zahl-render.js` is the 64x64 pixel-art renderer. Plain scripts,
  no build step, no dependencies.
- `browser/` — itch.io build. Open `index.html` directly, or serve the
  folder. Souls drift across the screen and you click to catch them; that's
  the core interactive loop. Saves to `localStorage`.
- `desktop/` — standalone Electron app. The shell is the real concept
  render (`desktop/assets/shell.png`), not CSS — the gems already sculpted
  into the art are invisible click hotspots (CLOSE / FEED / PET / RITUAL /
  STATS, plus the "W" badge toggles desktop mode). Souls trickle in
  passively over time instead of a click loop (it's a companion sitting on
  your desktop, not something you stare at). `Ctrl+Alt+D` toggles desktop
  mode from anywhere (window sits below other windows, like conky, instead
  of always-on-top) — that's also the escape hatch if desktop mode makes
  the window hard to click. Saves via `electron-store`.
- `build.sh` — copies `core/*.js` into `browser/core/` and `desktop/core/`
  (both need their own copy: itch.io needs a self-contained zip, and the
  Electron build needs the files inside its app root) and zips the browser
  build for upload. Run it after any change to `core/`.
- `release.sh` — everything `build.sh` does, plus packages the Linux
  AppImage and Windows portable exe via electron-builder. Slower (downloads
  platform electron binaries, runs wine for the Windows build) — run it
  before a release, not on every edit.

## Running it

Desktop app:
```
cd desktop
npm install
npm start
```

Browser build, for local testing:
```
cd browser
python3 -m http.server 8000   # or just open index.html directly
```

## Shipping to itch.io

```
./release.sh
```
produces:
- `dist/zahl-tamagotchi-web.zip` — HTML5 build, embed in the page
- `desktop/dist/Zahl-*.AppImage` — Linux download
- `desktop/dist/Zahl*.exe` — Windows portable exe download

**itch.io page setup** (once, in the web dashboard):
1. New project → "Kind of project" = **HTML**.
2. Upload `zahl-tamagotchi-web.zip`, check **"This file will be played in
   the browser"**. Embed size ~700x950 (or enable the fullscreen button) —
   the page is responsive down to mobile width.
3. Upload the `.AppImage` and `.exe` as separate files, *not* checked as
   "played in browser". Tag each with its platform (Linux / Windows) using
   the checkboxes next to the file — that's what makes the itch.io app
   auto-detect the right download per user.
4. macOS isn't built here — electron-builder can't produce a signed `.dmg`
   from Linux. Skip it, or build one later on an actual Mac / via CI.

**Uploading via butler** (itch's CLI, faster for repeat updates than the
web uploader — already installed at `~/.local/bin/butler`):
```
butler login                                     # once, opens a browser to authorize
butler push dist/zahl-tamagotchi-web.zip USER/zahl-tamagotchi:web
butler push desktop/dist/Zahl-*.AppImage USER/zahl-tamagotchi:linux
butler push "desktop/dist/Zahl 1.0.0.exe" USER/zahl-tamagotchi:windows
```
Replace `USER` with the itch.io username and `zahl-tamagotchi` with
whatever the project's URL slug ends up being (set when the project is
created). Channel names (`web`/`linux`/`windows`) are arbitrary but itch
uses them to group platforms — matching names above keeps it consistent.

## Design notes

- Rituals keep their original names/costs/durations from the firmware but
  are now pure gameplay: CHANNEL BURST speeds up soul spawns, BEACON STORM
  rains several souls at once, HAUNT summons a translucent ghost sprite,
  SUMMON PORTAL is a toggle that boosts spawn rate while active, PACKET
  STORM is a smaller burst with a screen-glitch effect.
- Save format is a flat JSON blob of the state object; timestamps are
  absolute `Date.now()` epoch ms, so hunger/corrosion decay correctly even
  after the app has been closed for hours — no per-tick catch-up loop
  needed, `ZahlCore.update(state, Date.now())` on load just works.
