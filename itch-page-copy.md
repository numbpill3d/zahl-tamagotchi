# ZAHL — itch.io page copy


## Page Title

Zahl


## Short Blurb (itch listing card, ~120 char limit)

A demonic tamagotchi you catch souls for. Feed it, pet it, or let it feralize. Browser or desktop companion, same save.


## Full Page Description (Markdown)

Zahl is a small demon that lives in a resin pendant. You catch it souls, it either loves you or rots.

That's the whole game. There's no win state. There's a creature with a hunger meter and a corruption meter, and it reacts to what you do to it in real time: a happy hop when you pet it, a gulping squash-and-stretch when it eats, a slow sad sink when you don't show up and it loses a level. Leave it alone long enough and it goes feral. Leave it alone longer and it stops being feral and just gets worse.

**How you play it is up to you.** The browser version is a session game. Souls (four types, DRIFTER / ECHO / WHISPER / SHARD) drift across the screen and you click to catch them, spend the pile on rituals, watch your demon level up through five stages. The desktop app is a companion instead. Souls trickle in on their own, and you mostly leave it running in the corner of your screen like a conky widget, checking in when you feel like it.

Both builds share one save-compatible engine, so the state you build up doesn't care which one you're touching.

### The desktop build is not a UI with a pet skin on it

The window *is* the concept render: a cream-resin sculpted pendant, purple occult sigils, rose engravings, ruby cabochons, a skeleton-hook keychain loop, "zahl" lettered in gothic script, serial number 2133 stamped into the resin. There is no button chrome drawn on top of it. The gems already sculpted into the art are the click targets. One gem closes the app. Others feed it, pet it, open the ritual menu, open stats. A small purple "W" badge (or `Ctrl+Alt+D`) drops the window behind everything else on your desktop instead of always-on-top, so it can just sit there existing near your other windows instead of demanding focus.

### Rituals

You spend souls on five rituals for timed effects:

- **Channel Burst** — soul spawn rate up, 30s
- **Beacon Storm** — a rain of souls all at once, 60s
- **Haunt** — summons a translucent ghost sprite, 60s
- **Summon Portal** — a toggleable spawn-rate buff, stays on until you flip it off
- **Packet Storm** — a soul burst plus a screen glitch effect, 30s

If those names sound like network attacks, that's not an accident. Zahl's pet logic and sprite art are a straight port from [grimwalker](https://github.com/numbpill3d/grimwalker), an ESP32 wardriving/pentesting badge I built where the "rituals" literally fired WiFi packet operations (deauth, beacon spam, evil portal) at the hardware layer. This version strips every bit of that out. No networking, no radios, no real hardware anywhere near this; it's a self-contained fantasy game that kept the names as a nod for anyone who recognizes them. If you don't recognize them, they're just ritual names.

### Five stages, one demon

Wraith hatchling, clannfear pup, daedroth whelp, winged horror, daedroth lord, leveling 1 through 10. Every stage is hand-drawn pixel art that reads the live stat block: eyes dim when hunger's low, the body reddens as corruption climbs. Mood floats up as tiny ASCII/pixel emotes above its head, `^_^` `>:(` `;_;` `T_T` `zzz...` `..?` `..!` `...`, no dialogue box, no text, just the face and the bubble.

Black, red, purple. Gothic-occult but leaning cute, not grimdark. This thing wants attention, not to unsettle you.

## What's Included

- **Browser build** (embedded, playable on this page) — click-to-catch soul loop, saves to browser `localStorage`, works on desktop and mobile widths
- **Windows download** — standalone desktop app (portable `.exe`, no installer)
- **Linux download** — standalone desktop app (`.AppImage`)
- **macOS download** — standalone desktop app (Apple Silicon only, unsigned — see Known Limitations)

## Requirements

- **Browser build**: any modern browser with JS + localStorage enabled. No install, no account, no server calls out.
- **Windows**: 64-bit Windows 10/11. Portable exe, nothing to install, nothing added to your registry.
- **Linux**: any distro that runs AppImages (`chmod +x` and run, or use your AppImage integration tool of choice).
- **macOS**: Apple Silicon (M1/M2/M3/M4) only, no Intel build. Unsigned, so you'll need to right-click → Open the first time to get past Gatekeeper.
- No internet connection needed to play either build. No telemetry, no ads, no IAP. Saves stay local to your machine/browser.

## Use Cases

- You want a tamagotchi you can leave running and glance at, not a game demanding a session — put the desktop build in "desktop mode" and let it sit like a conky widget while you work.
- You want a five-minute soul-catching fidget loop on a browser tab — the itch page embed does that with zero install.
- You're the kind of person who reads "the click targets are gems sculpted into the concept art, not buttons" and immediately wants to see it.
- You built or are building your own ESP32 badge and want to see where the pet logic in grimwalker ended up when it got ported off the hardware.

## Known Limitations

- macOS build is Apple Silicon only (no Intel), and unsigned since there's no Apple developer cert behind this — expect a Gatekeeper prompt on first launch, right-click → Open clears it.
- Desktop-mode window behavior (sits behind other windows instead of always-on-top) depends on your window manager cooperating with Electron's window-layering API. It's been built and tested on Linux (sway/wlroots); Windows and macOS builds compile clean but haven't been run through the same hands-on testing, so if desktop mode acts up on those, that's useful to know about.
- Browser save and desktop save are the same *format* but are not synced to each other automatically — they're save-compatible, not save-shared. You'd need to export/import the state manually to move a demon from one build to the other.
- Neglect it long enough and it devolves — that's intended, not a bug. If you wanted a pet that can't lose progress, this isn't it.

## Tags

`tamagotchi`, `virtual-pet`, `pixel-art`, `desktop-companion`, `dark-fantasy`, `occult`, `demon`, `casual`, `clicker`, `pet-sim`

## Genre / Classification (itch dashboard)

- **Kind of project**: HTML (for the embedded web build); add Windows and Linux downloads as separate files, each tagged with its platform checkbox
- **Genre**: Simulation
- **Classification**: Game
- **Release status**: Released
- **Pricing**: paid, with a "Name your own price" minimum enabled (see pricing note below)
- **Input**: Mouse
- **Platforms**: HTML5 (web), Windows, Linux, macOS
- **Accessibility**: none claimed unless you specifically test for colorblind-safe contrast on the red/purple palette — flag this honestly rather than checking a box you haven't verified


## Price Suggestion

**$3.00 USD, "pay what you want" with that as the floor.**

Reasoning — checked comparable itch.io virtual-pet / desktop-companion titles:
- Desktop-companion-style pets with a similar "sits on your desktop" hook (Shimeji-style and tamagotchi-likes) commonly land $2–$5 on itch, frequently with PWYW enabled since itch's audience over-indexes on PWYW for small personal-scale projects.
- Pure browser tamagotchi clones with no desktop build cluster lower, often $1–$2 or free-with-tip-jar — the browser build alone wouldn't clear $3 comfortably.
- What pushes Zahl to the higher end of that comparable range: three full platform builds (Windows/Linux/macOS, not just a browser toy), genuinely hand-painted stage art across 5 evolutions rather than a handful of recolors, and a physical-object-shaped desktop app (the invisible-hotspot gem UI) that's a more distinctive execution than typical desktop pets in this price band.
- $3 floor with PWYW on keeps the browser-only tire-kickers from bouncing off a hard paywall (itch conversion tends to favor PWYW for first releases with no existing audience) while the suggested/default slider can sit higher ($5) for anyone who wants to pay full price without you leaving money on the table from people willing to pay more.
- This is a first release with no existing audience or reviews — starting at PWYW-with-floor rather than a hard fixed price is the safer play for building initial downloads/ratings before considering a price bump later.

## Assets Needed (screenshots / preview files to generate before publishing)

1. **Cover image** (itch requires this, 630×500 recommended) — the desktop shell art (`shell.png`) front and center, ideally with the demon mid-animation (a happy pet-hop or the level-up grow-pulse) so it's not a static prop shot.
2. **Screenshot: browser build in play** — the click-to-catch loop mid-session, a few souls visible drifting, soul balance/stat HUD readable.
3. **Screenshot: all 5 evolution stages side by side** — wraith hatchling through daedroth lord, single composite image. This is the single best "convince me" asset for a pet-evolution game; itch buyers want to see the full arc before downloading.
4. **Screenshot: desktop mode in context** — the pendant window actually sitting on a real desktop among other windows, to sell the "conky widget" pitch. Needs the no-visual-verification caveat respected if this is captured on this machine — use a clean/staged desktop, not a live capture of real windows.
5. **Screenshot: ritual in effect** — Beacon Storm or Packet Storm mid-effect (soul rain / screen glitch), since these are the most visually distinct moments and static UI screenshots undersell them.
6. **Short GIF or webm loop (10-15s)** — feed → gulp animation → happy emote bubble. Itch pages with a motion asset above the fold convert meaningfully better than static-only pages for anything animation-driven like this.
7. **Optional but strong: a GIF of the gem-hotspot reveal** — cursor hovering over the shell art with hotspot outlines briefly flashed/highlighted, since "the buttons are secretly gems in the sculpt" is the single most differentiating detail on the whole page and is hard to convey in prose alone.
