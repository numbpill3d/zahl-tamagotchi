# Changelog

## [1.0.0] — 2026-07-16

Initial release.

### Added
- Shared pet engine (`core/`): state machine ported from grimwalker's
  `zahl_pet.cpp`, 64x64 pixel-art renderer for 5 evolution stages, and a
  small procedural SFX module (Web Audio, no audio files).
- Browser build — souls drift across the screen, click to catch, spend
  them on rituals. Saves to `localStorage`.
- Desktop build (Electron) — the shell is the real concept render, not
  CSS; the gems already sculpted into the art are the click targets
  (no fabricated button UI). Desktop mode sits the window below other
  windows instead of always-on-top, toggled via the "W" badge or
  `Ctrl+Alt+D`.
- Physical reactions: squash-and-stretch on feed, hop-and-wiggle on pet,
  grow-pulse on level up, sink on devolve. Mood-driven pixel-font emote
  bubbles (`^_^`, `>:(`, `;_;`, `T_T`, `zzz...`, `..?`, `..!`, `...`).
- Boot splash (a pixel eye waking up) on both builds.
- Release pipeline: `build.sh` for the web zip, `release.sh` for local
  Linux packaging, GitHub Actions for Windows/macOS/Linux CI builds.

### Fixed
- Level-up and devolve reactions were dead code — `ZahlCore.update()`'s
  `leveledDown` and `catchSoul()`'s `leveledUp` return values were never
  checked by either build, so those visual/audio reactions could only
  ever fire via manual testing, never during normal play.

### Known limitations
- macOS build is Apple Silicon only (no Intel), unsigned.
- Windows and macOS builds compile clean in CI but haven't been run by
  a human on those platforms — only Linux has been hands-on tested.
