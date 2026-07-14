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
- `desktop/` — standalone Electron app shaped like a tamagotchi shell.
  Souls trickle in passively over time instead of a click loop (it's a
  companion sitting on your desktop, not something you stare at). Three
  buttons — MENU / SELECT / BACK — navigate an icon row exactly like a real
  tamagotchi: MENU cycles the icon (or the ritual list once inside it),
  SELECT confirms, BACK backs out. Tapping the screen while idle is a quick
  pet. Saves via `electron-store`.
- `build.sh` — copies `core/*.js` into `browser/core/` and `desktop/core/`
  (both need their own copy: itch.io needs a self-contained zip, and the
  Electron build needs the files inside its app root) and zips the browser
  build for upload. Run it after any change to `core/`.

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
./build.sh
```
Upload `dist/zahl-tamagotchi-web.zip` as an HTML5 project on itch.io. Check
"This file will be played in the browser" and set the viewport to at least
700x900 (or enable fullscreen button) — the layout is responsive down to
mobile width.

## Packaging the desktop app for distribution

```
cd desktop
npm install
npm run build   # electron-builder — outputs an AppImage/.deb via dist/
```

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
