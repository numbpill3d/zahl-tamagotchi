/*
 * zahl-core.js — pet state engine, ported from grimwalker's zahl_pet.cpp.
 * Real WiFi ops (deauth, beacon spam, evil portal) replaced with self-contained
 * game mechanics: souls are caught by clicking drifting orbs, rituals are
 * timed buffs with their own visual effects instead of RF hardware calls.
 *
 * All "last*" fields are absolute Date.now() epoch ms, so update(state, now)
 * is safe to call after any amount of real wall-clock time has passed
 * (app closed overnight, etc) without special catch-up logic.
 */
(function (root) {
  'use strict';

  var RITUAL_NAMES     = ['CHANNEL BURST', 'BEACON STORM', 'HAUNT', 'SUMMON PORTAL', 'PACKET STORM'];
  var RITUAL_COSTS     = [5, 8, 12, 15, 10];
  var RITUAL_DURATIONS = [30000, 60000, 60000, 0, 30000]; // ms; 0 = toggle, not timed
  var STAGE_NAMES      = ['', 'WRAITH', 'WRAITH', 'CLANNFEAR', 'CLANNFEAR',
                           'DAEDROTH', 'DAEDROTH', 'HORROR', 'HORROR', 'LORD', 'LORD'];
  var SOUL_TYPES       = ['DRIFTER', 'ECHO', 'WHISPER', 'SHARD'];

  function createState() {
    var now = Date.now();
    return {
      hunger: 70, level: 1, corrosion: 0, entropy: 10, corruption: 0,
      experience: 0, soulBalance: 5, soulsTotal: 0,
      feralMode: false, feralOnset: 0,
      lastFed: now, lastUpkeep: now, lastEntropyDecay: now,
      ritualActive: false, activeRitual: -1, ritualStart: 0, portalActive: false,
      feastTimes: [], feastFlag: false,
      soulLog: [],
      createdAt: now,
    };
  }

  function feed(state, amount, now) {
    state.hunger = Math.min(100, state.hunger + amount);
    state.lastFed = now;
    if (state.hunger > 80 && state.corrosion > 0) {
      state.corrosion = Math.max(0, state.corrosion - 2);
    }
  }

  function pet(state) {
    state.corrosion = Math.max(0, state.corrosion - 5);
    if (state.hunger > 5) state.hunger -= 2;
    if (state.entropy < 100) state.entropy = Math.min(100, state.entropy + 2);
  }

  function addExperience(state, exp) {
    state.experience += exp;
    var leveledUp = false;
    while (state.experience >= 100) {
      if (state.level >= 10) { state.experience = 99; break; }
      state.experience -= 100;
      state.level++;
      state.hunger = 100;
      state.corrosion = 0;
      leveledUp = true;
    }
    return leveledUp;
  }

  // Called when the player clicks a drifting soul orb.
  function catchSoul(state, now) {
    state.feastTimes.push(now);
    state.feastTimes = state.feastTimes.filter(function (t) { return now - t < 30000; });

    var feast = false;
    if (state.feastTimes.length >= 5) {
      if (!state.feastFlag) {
        feast = true;
        state.feastFlag = true;
        addExperience(state, 5);
      }
    } else {
      state.feastFlag = false;
    }

    state.soulBalance = Math.min(150, state.soulBalance + 1);
    state.soulsTotal  = Math.min(99999, state.soulsTotal + 1);

    feed(state, 4, now);
    var leveledUp = addExperience(state, 2);
    if (state.entropy < 100) state.entropy = Math.min(100, state.entropy + 1);

    var type = SOUL_TYPES[Math.floor(Math.random() * SOUL_TYPES.length)];
    state.soulLog.unshift({ t: now, type: type });
    if (state.soulLog.length > 30) state.soulLog.length = 30;

    return { feast: feast, leveledUp: leveledUp, type: type };
  }

  function performRitual(state, type, now) {
    if (type < 0 || type > 4) return false;
    if (state.soulBalance < RITUAL_COSTS[type]) return false;

    state.soulBalance -= RITUAL_COSTS[type];
    state.corruption = Math.min(100, state.corruption + 8);

    if (type === 3) {
      state.portalActive = !state.portalActive;
      state.ritualActive = false;
      state.activeRitual = -1;
    } else {
      state.ritualActive = true;
      state.activeRitual = type;
      state.ritualStart = now;
    }
    return true;
  }

  // Extra flavor/behavior hints for the UI layer when a ritual fires —
  // keeps ritual-specific orb-spawning logic out of the render/UI code.
  function ritualEffectHint(type) {
    switch (type) {
      case 0: return { spawnRateMult: 0.5 };                          // CHANNEL BURST
      case 1: return { burst: 5, staggerMs: 900 };                    // BEACON STORM
      case 2: return { ghost: true };                                 // HAUNT
      case 3: return { portal: true };                                // SUMMON PORTAL
      case 4: return { burst: 3, staggerMs: 400, glitch: true };      // PACKET STORM
      default: return {};
    }
  }

  var leveledDownFlag = false;

  function update(state, now) {
    leveledDownFlag = false;

    var timeSinceFedSec = Math.floor((now - state.lastFed) / 1000);
    if (timeSinceFedSec > 60) {
      var decay = Math.floor((timeSinceFedSec - 60) / 30);
      var decayMod = state.corruption > 50 ? Math.max(1, Math.floor(decay / 2)) : decay;
      if (decayMod > 0 && state.hunger > 0) {
        state.hunger = Math.max(0, state.hunger - decayMod);
        state.lastFed = now;
      }
    }

    if (state.hunger === 0) {
      state.feralMode = true;
      state.corrosion = 100;
      if (!state.feralOnset) state.feralOnset = now;
      if (now - state.feralOnset > 300000) {
        state.feralOnset = now;
        if (state.experience >= 10) {
          state.experience -= 10;
        } else if (state.level > 1) {
          state.level--;
          state.experience = 90;
          state.hunger = 5;
          state.feralOnset = 0;
          leveledDownFlag = true;
        }
      }
    } else {
      state.feralOnset = 0;
      if (state.hunger > 20) state.feralMode = false;
    }
    if (state.corrosion > 100) state.corrosion = 100;

    if (now - state.lastUpkeep > 300000) {
      state.lastUpkeep = now;
      if (state.soulBalance > 0) {
        state.soulBalance--;
      } else if (state.hunger > 0) {
        state.hunger = Math.max(0, state.hunger - 5);
      }
    }

    if (now - state.lastEntropyDecay > 60000 && state.entropy > 0) {
      state.entropy--;
      state.lastEntropyDecay = now;
    }

    if (state.ritualActive && now - state.ritualStart > RITUAL_DURATIONS[state.activeRitual]) {
      state.ritualActive = false;
      state.activeRitual = -1;
    }

    return { leveledDown: leveledDownFlag };
  }

  function moodLabel(state) {
    if (state.feralMode) return 'FERAL';
    if (state.hunger < 20) return 'STARVING';
    if (state.hunger > 80) return 'SATED';
    return 'HUNGRY';
  }

  function nextSoulSpawnDelayMs(state) {
    var base = 15000 + Math.random() * 30000;
    if (state.portalActive) base *= 0.4;
    if (state.ritualActive && state.activeRitual === 0) base *= 0.5;
    return base;
  }

  var ZahlCore = {
    createState: createState,
    feed: feed,
    pet: pet,
    addExperience: addExperience,
    catchSoul: catchSoul,
    performRitual: performRitual,
    ritualEffectHint: ritualEffectHint,
    update: update,
    moodLabel: moodLabel,
    nextSoulSpawnDelayMs: nextSoulSpawnDelayMs,
    RITUAL_NAMES: RITUAL_NAMES,
    RITUAL_COSTS: RITUAL_COSTS,
    RITUAL_DURATIONS: RITUAL_DURATIONS,
    STAGE_NAMES: STAGE_NAMES,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZahlCore;
  }
  if (root) root.ZahlCore = ZahlCore;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
