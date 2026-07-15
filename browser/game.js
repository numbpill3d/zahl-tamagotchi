'use strict';

var SAVE_KEY = 'zahl-save-v1';

function loadState() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return ZahlCore.createState();
    var saved = JSON.parse(raw);
    var fresh = ZahlCore.createState();
    for (var k in fresh) if (Object.prototype.hasOwnProperty.call(saved, k)) fresh[k] = saved[k];
    return fresh;
  } catch (e) {
    return ZahlCore.createState();
  }
}

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/unavailable — silently skip */ }
}

var state = loadState();
ZahlCore.update(state, Date.now()); // catch up on decay since last session

var canvas = document.getElementById('zahlCanvas');
var renderer = ZahlRender.create(canvas);
renderer.playSplash(26);
renderer.start();

var whispers = [
  'MISTRESS DRATHA: "The corrosion spreads. Feed it."',
  'MISTRESS DRATHA: "Every soul caught is a soul claimed."',
  'MISTRESS DRATHA: "The void does not wait for the slow."',
  'MISTRESS DRATHA: "Entropy feeds the beast. Corruption feeds the void."',
  'MISTRESS DRATHA: "I once saw a level 10 Daedroth eat a router."',
  'MISTRESS DRATHA: "Do not disappoint me, n\'wah."',
];

function setMistress(text, revertMs) {
  var el = document.getElementById('mistress');
  el.textContent = text;
  if (revertMs) {
    setTimeout(function () {
      el.textContent = whispers[Math.floor(Math.random() * whispers.length)];
    }, revertMs);
  }
}

function refreshUI() {
  var set = function (barId, valId, pct, label) {
    document.getElementById(barId).style.width = pct + '%';
    document.getElementById(valId).textContent = label !== undefined ? label : pct + '%';
  };

  var hBar = document.getElementById('hungerBar');
  if (state.hunger > 70) hBar.style.background = '#2a6040';
  else if (state.hunger > 50) hBar.style.background = '#4a3080';
  else if (state.hunger > 30) hBar.style.background = '#704020';
  else if (state.hunger > 15) hBar.style.background = '#802018';
  else hBar.style.background = '#aa0010';
  hBar.classList.toggle('hunger-crit', state.hunger <= 15);
  set('hungerBar', 'hungerVal', state.hunger, state.hunger + '%');

  set('levelBar', 'levelVal', state.level * 10, state.level + '/10');
  set('corrosionBar', 'corrosionVal', state.corrosion, state.corrosion + '%');
  set('entropyBar', 'entropyVal', state.entropy, state.entropy + '%');
  set('corruptBar', 'corruptVal', state.corruption, state.corruption + '%');
  set('expBar', 'expVal', state.experience, state.experience + '/100');

  document.getElementById('soulBal').textContent = state.soulBalance;
  document.getElementById('soulTotal').textContent = '/ ' + state.soulsTotal + ' total';

  document.getElementById('mood').textContent = ZahlCore.moodLabel(state);
  document.getElementById('mood').style.color = state.feralMode ? '#f00' : (state.hunger < 20 ? '#f66' : state.hunger > 80 ? '#4f4' : '#f90');
  document.getElementById('stageLabel').textContent = ZahlCore.STAGE_NAMES[state.level] || '?';

  var ritualEl = document.getElementById('ritualActive');
  if (state.ritualActive) {
    var secsLeft = Math.max(0, Math.round((ZahlCore.RITUAL_DURATIONS[state.activeRitual] - (Date.now() - state.ritualStart)) / 1000));
    ritualEl.textContent = '[' + ZahlCore.RITUAL_NAMES[state.activeRitual] + ' ACTIVE ' + secsLeft + 's]';
  } else {
    ritualEl.textContent = '';
  }
  document.querySelector('.ritual-panel').classList.toggle('ritual-active-glow', state.ritualActive);
  document.querySelector('.ritual-btn[data-ritual="3"]').classList.toggle('active-toggle', state.portalActive);

  renderer.setStats({
    hunger: state.hunger, level: state.level, corrosion: state.corrosion,
    entropy: state.entropy, corruption: state.corruption,
    feral: state.feralMode, portalActive: state.portalActive,
  });

  renderSoulList();
}

function renderSoulList() {
  var list = document.getElementById('soulList');
  list.innerHTML = '';
  state.soulLog.slice(0, 12).forEach(function (s) {
    var div = document.createElement('div');
    div.className = 'soul-entry';
    var ago = Math.max(0, Math.round((Date.now() - s.t) / 1000));
    div.textContent = '> [' + s.type + ']  caught ' + ago + 's ago';
    list.appendChild(div);
  });
}

// ── soul orb spawning ────────────────────────────────────────────────────
var arena = document.getElementById('arena');

function spawnOrb() {
  var orb = document.createElement('div');
  orb.className = 'soul-orb';
  var maxX = arena.clientWidth - 14;
  var maxY = arena.clientHeight - 14;
  orb.style.left = Math.max(0, Math.floor(Math.random() * maxX)) + 'px';
  orb.style.top = Math.max(0, Math.floor(Math.random() * maxY)) + 'px';

  var caught = false;
  orb.addEventListener('click', function () {
    if (caught) return;
    caught = true;
    orb.classList.add('caught');
    var result = ZahlCore.catchSoul(state, Date.now());
    renderer.trigger('soulcap');
    if (result.feast) setMistress('MISTRESS DRATHA: "A FEAST! The void shudders!"', 4000);
    refreshUI();
    saveState();
    setTimeout(function () { orb.remove(); }, 400);
  });
  orb.addEventListener('animationend', function (e) {
    if (e.animationName === 'orbDrift' && !caught) orb.remove();
  });

  arena.appendChild(orb);
}

function scheduleNextOrb() {
  var delay = ZahlCore.nextSoulSpawnDelayMs(state);
  setTimeout(function () {
    spawnOrb();
    scheduleNextOrb();
  }, delay);
}

function spawnBurst(count, staggerMs) {
  for (var i = 0; i < count; i++) {
    (function (idx) { setTimeout(spawnOrb, idx * staggerMs); })(i);
  }
}

// ── buttons ─────────────────────────────────────────────────────────────
var feedBtn = document.getElementById('feedBtn');
var FEED_COOLDOWN_MS = 20000;
var feedReadyAt = 0;

feedBtn.addEventListener('click', function () {
  if (Date.now() < feedReadyAt) return;
  ZahlCore.feed(state, 25, Date.now());
  renderer.trigger('fed');
  feedReadyAt = Date.now() + FEED_COOLDOWN_MS;
  refreshUI();
  saveState();
});

document.getElementById('petBtn').addEventListener('click', function () {
  ZahlCore.pet(state);
  renderer.trigger('petted');
  refreshUI();
  saveState();
});

document.querySelectorAll('.ritual-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var type = parseInt(btn.dataset.ritual, 10);
    var ok = ZahlCore.performRitual(state, type, Date.now());
    if (!ok) {
      btn.style.borderColor = '#aa0000';
      setTimeout(function () { btn.style.borderColor = ''; }, 500);
      return;
    }
    renderer.trigger('ritual');
    var hint = ZahlCore.ritualEffectHint(type);
    if (hint.burst) spawnBurst(hint.burst, hint.staggerMs || 500);
    if (hint.ghost) renderer.trigger('ghost');
    refreshUI();
    saveState();
  });
});

// ── main loop ───────────────────────────────────────────────────────────
var lastGhostPulse = 0;
setInterval(function () {
  var now = Date.now();
  ZahlCore.update(state, now);
  if (state.ritualActive && state.activeRitual === 2 && now - lastGhostPulse > 8000) {
    renderer.trigger('ghost');
    lastGhostPulse = now;
  }
  refreshUI();
  if (feedBtn.disabled !== (now < feedReadyAt)) { /* noop, handled below */ }
  feedBtn.disabled = now < feedReadyAt;
  feedBtn.textContent = now < feedReadyAt ? 'FEED (' + Math.ceil((feedReadyAt - now) / 1000) + 's)' : 'FEED';
}, 1000);

setInterval(saveState, 4000);
window.addEventListener('beforeunload', saveState);
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') saveState();
});

setInterval(function () {
  if (!state.ritualActive) setMistress(whispers[Math.floor(Math.random() * whispers.length)]);
}, 15000);

// ── init ────────────────────────────────────────────────────────────────
refreshUI();
scheduleNextOrb();
