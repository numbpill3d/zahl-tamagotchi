'use strict';

// Dual-mode: real IPC persistence inside Electron, localStorage fallback
// when this file is opened in a plain browser (used for visual preview
// during development — Electron-only bits like drag regions/close just
// no-op there).
var ipcRenderer = null;
try {
  if (typeof require === 'function') ipcRenderer = require('electron').ipcRenderer;
} catch (e) { /* not running under Electron */ }

var SAVE_KEY = 'zahl-save-v1';

function loadState() {
  var saved = null;
  if (ipcRenderer) {
    saved = ipcRenderer.sendSync('load-save');
  } else {
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { saved = null; }
  }
  var fresh = ZahlCore.createState();
  if (saved) {
    for (var k in fresh) if (Object.prototype.hasOwnProperty.call(saved, k)) fresh[k] = saved[k];
  }
  return fresh;
}

function saveState() {
  if (ipcRenderer) {
    ipcRenderer.send('save-state', state);
  } else {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
}

var state = loadState();
ZahlCore.update(state, Date.now());

var canvas = document.getElementById('zahlCanvas');
var renderer = ZahlRender.create(canvas);
renderer.start();

// ── gem hotspots — direct-select, no cycling menu. Each gem sculpted
// into the shell art is one action; RITUAL and STATS open a small
// readout over the screen instead of navigating away from it. ────────
var uiMode = 'idle'; // idle | ritual | stats
var submenuEl = document.getElementById('submenu');

function flashScreen() {
  var screen = document.querySelector('.screen-overlay');
  screen.style.filter = 'brightness(1.6)';
  setTimeout(function () { screen.style.filter = ''; }, 120);
}

function renderRitualSubmenu() {
  var html = '<h4>RITUALS</h4>';
  ZahlCore.RITUAL_NAMES.forEach(function (name, i) {
    var cost = ZahlCore.RITUAL_COSTS[i];
    var afford = state.soulBalance >= cost ? '' : ' (need more)';
    html += '<div class="sm-row" data-ritual="' + i + '"><span class="sm-name">' + name + '</span><span class="sm-meta">' + cost + afford + '</span></div>';
  });
  submenuEl.innerHTML = html;
  submenuEl.querySelectorAll('.sm-row').forEach(function (row) {
    row.addEventListener('click', function () {
      var type = parseInt(row.dataset.ritual, 10);
      var ok = ZahlCore.performRitual(state, type, Date.now());
      if (ok) {
        renderer.trigger('ritual');
        var hint = ZahlCore.ritualEffectHint(type);
        if (hint.ghost) renderer.trigger('ghost');
        flashScreen();
        closeSubmenu();
        saveState();
      } else {
        row.style.color = '#ff2040';
        setTimeout(function () { row.style.color = ''; }, 400);
      }
    });
  });
}

function renderStatsSubmenu() {
  submenuEl.innerHTML =
    '<h4>STATS</h4>' +
    '<div class="sm-row"><span class="sm-name">HUNGER</span><span class="sm-meta">' + state.hunger + '%</span></div>' +
    '<div class="sm-row"><span class="sm-name">CORROSION</span><span class="sm-meta">' + state.corrosion + '%</span></div>' +
    '<div class="sm-row"><span class="sm-name">ENTROPY</span><span class="sm-meta">' + state.entropy + '%</span></div>' +
    '<div class="sm-row"><span class="sm-name">CORRUPTION</span><span class="sm-meta">' + state.corruption + '%</span></div>' +
    '<div class="sm-row"><span class="sm-name">EXP</span><span class="sm-meta">' + state.experience + '/100</span></div>' +
    '<div class="sm-row"><span class="sm-name">LEVEL</span><span class="sm-meta">' + state.level + '/10 ' + (ZahlCore.STAGE_NAMES[state.level] || '') + '</span></div>' +
    '<div class="sm-row"><span class="sm-name">SOULS TOTAL</span><span class="sm-meta">' + state.soulsTotal + '</span></div>';
}

function openSubmenu(mode) {
  uiMode = mode;
  submenuEl.classList.add('visible');
  if (mode === 'ritual') renderRitualSubmenu();
  if (mode === 'stats') renderStatsSubmenu();
}

function closeSubmenu() {
  uiMode = 'idle';
  submenuEl.classList.remove('visible');
}

function toggleSubmenu(mode) {
  if (uiMode === mode) closeSubmenu();
  else openSubmenu(mode);
}

document.getElementById('hsFeed').addEventListener('click', function () {
  ZahlCore.feed(state, 25, Date.now());
  renderer.trigger('fed');
  flashScreen();
  saveState();
});

document.getElementById('hsPet').addEventListener('click', function () {
  ZahlCore.pet(state);
  renderer.trigger('petted');
  flashScreen();
  saveState();
});

document.getElementById('hsRitual').addEventListener('click', function () { toggleSubmenu('ritual'); });
document.getElementById('hsStats').addEventListener('click', function () { toggleSubmenu('stats'); });

document.getElementById('hsClose').addEventListener('click', function () {
  saveState();
  if (ipcRenderer) ipcRenderer.send('quit-app');
  else window.close();
});

// tap the screen itself while idle = quick pet, tamagotchi-poke style
document.querySelector('.screen-overlay').addEventListener('click', function (e) {
  if (e.target.closest('.submenu')) return;
  if (uiMode !== 'idle') return;
  ZahlCore.pet(state);
  renderer.trigger('petted');
  flashScreen();
  saveState();
});

// ── ambient soul trickle — this is a companion, not a clicker; souls
// accrue passively so rituals stay usable without a click-the-orb loop ──
var nextAmbientSoulAt = Date.now() + 60000 + Math.random() * 60000;

function maybeAmbientSoul(now) {
  if (now < nextAmbientSoulAt) return;
  ZahlCore.catchSoul(state, now);
  renderer.trigger('soulcap');
  nextAmbientSoulAt = now + 60000 + Math.random() * 120000;
}

// ── main loop ───────────────────────────────────────────────────────────
var lastGhostPulse = 0;
setInterval(function () {
  var now = Date.now();
  ZahlCore.update(state, now);
  maybeAmbientSoul(now);
  if (state.ritualActive && state.activeRitual === 2 && now - lastGhostPulse > 8000) {
    renderer.trigger('ghost');
    lastGhostPulse = now;
  }

  renderer.setStats({
    hunger: state.hunger, level: state.level, corrosion: state.corrosion,
    entropy: state.entropy, corruption: state.corruption,
    feral: state.feralMode, portalActive: state.portalActive,
  });

  document.getElementById('hudMood').textContent = ZahlCore.moodLabel(state);
  document.getElementById('hudLevel').textContent = 'LV ' + state.level;

  var shellEl = document.getElementById('shell');
  shellEl.classList.toggle('feral', state.feralMode);
  shellEl.classList.toggle('starving', !state.feralMode && state.hunger < 20);

  if (uiMode === 'ritual') renderRitualSubmenu();
  if (uiMode === 'stats') renderStatsSubmenu();
}, 1000);

setInterval(saveState, 5000);
window.addEventListener('beforeunload', saveState);

document.getElementById('hudMood').textContent = ZahlCore.moodLabel(state);
document.getElementById('hudLevel').textContent = 'LV ' + state.level;
