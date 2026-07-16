/*
 * zahl-audio.js — tiny procedural SFX, no audio files. Everything is a
 * synthesized beep/blip via Web Audio, matching the retro-LCD/piezo
 * beeper aesthetic real tamagotchis actually have. Lazy AudioContext
 * creation since browsers block autoplay before a user gesture.
 */
(function (root) {
  'use strict';

  function create() {
    var ctx = null;
    var enabled = true;

    function ensureCtx() {
      if (!ctx) {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          ctx = AC ? new AC() : null;
        } catch (e) { ctx = null; }
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, startTime, duration, type, gainPeak, freqEnd) {
      var c = ensureCtx();
      if (!c) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'square';
      var t0 = c.currentTime + startTime;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(gainPeak || 0.1, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    }

    var SFX = {
      fed: function () {
        tone(420, 0, 0.09, 'square', 0.1);
        tone(620, 0.1, 0.11, 'square', 0.1);
      },
      petted: function () {
        tone(520, 0, 0.09, 'sine', 0.08);
        tone(650, 0.09, 0.09, 'sine', 0.08);
        tone(780, 0.18, 0.14, 'sine', 0.09);
      },
      levelup: function () {
        [520, 650, 780, 1040].forEach(function (f, i) {
          tone(f, i * 0.09, 0.12, 'square', 0.11);
        });
      },
      devolve: function () {
        [480, 380, 300].forEach(function (f, i) {
          tone(f, i * 0.13, 0.17, 'triangle', 0.1);
        });
      },
      soulcap: function () {
        tone(1200, 0, 0.08, 'sine', 0.07, 1500);
      },
      ritual: function () {
        tone(120, 0, 0.35, 'sawtooth', 0.07, 340);
      },
      burst: function () {
        tone(200, 0, 0.12, 'square', 0.08);
        tone(160, 0.05, 0.12, 'square', 0.07);
      },
      ghost: function () {
        tone(300, 0, 0.4, 'sine', 0.05, 220);
      },
      close: function () {
        tone(500, 0, 0.09, 'square', 0.08, 260);
      },
      feral: function () {
        tone(140, 0, 0.22, 'sawtooth', 0.09);
        tone(110, 0.1, 0.28, 'sawtooth', 0.09);
      },
    };

    function play(name) {
      if (!enabled) return;
      var fn = SFX[name];
      if (fn) fn();
    }

    function setEnabled(v) { enabled = !!v; }
    function isEnabled() { return enabled; }

    return { play: play, setEnabled: setEnabled, isEnabled: isEnabled };
  }

  var ZahlAudio = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = ZahlAudio;
  if (root) root.ZahlAudio = ZahlAudio;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
