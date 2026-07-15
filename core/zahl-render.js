/*
 * zahl-render.js — 64x64 pixel-art sprite renderer, ported from grimwalker's
 * data/script.js canvas drawing code. Same five evolution stages, same
 * hunger/corrosion/entropy/corruption-reactive palettes. Wrapped as a
 * factory so both the browser build and the desktop shell can each own an
 * independent instance instead of relying on module-level globals.
 */
(function (root) {
  'use strict';

  function create(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var frame = 0;
    var stats = { hunger: 70, level: 1, corrosion: 0, entropy: 10, corruption: 0, feral: false, portalActive: false };
    var petState = 'idle';
    var stateTimer = 0;
    var fidgetMode = false;
    var fidgetDir = 0;
    var idleFrames = 0;
    var rafId = null;

    var splashActive = false;
    var splashFrame = 0;
    var splashTotalFrames = 0;
    var splashCallback = null;

    function playSplash(totalFrames, onComplete) {
      splashActive = true;
      splashFrame = 0;
      splashTotalFrames = totalFrames || 26;
      splashCallback = onComplete || null;
    }

    function setStats(s) {
      for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) stats[k] = s[k];
    }

    var EMOTE_FOR_EVENT = {
      fed: '..!', petted: '^_^', levelup: '^_^', soulcap: '..?',
      ritual: '...', devolve: ';_;', burst: '..!',
    };

    var emoteText = null;
    var emoteTimer = 0;
    var emoteMaxTimer = 0;
    var lastAmbientEmoteFrame = -1000;

    function showEmote(text, frames) {
      emoteText = text;
      emoteTimer = frames;
      emoteMaxTimer = frames;
    }

    function trigger(name) {
      var durations = { fed: 24, petted: 24, levelup: 32, soulcap: 12, ritual: 20, burst: 16, devolve: 24, ghost: 40 };
      petState = name;
      stateTimer = durations[name] || 20;
      idleFrames = 0;
      if (EMOTE_FOR_EVENT[name]) showEmote(EMOTE_FOR_EVENT[name], 28);
    }

    // ── pixel helpers ──────────────────────────────────────────────────
    var STAR_DOTS = [[6, 10], [54, 8], [10, 50], [58, 44], [46, 4], [3, 34], [60, 58], [26, 58], [15, 6], [50, 54]];
    var cls = function () {
      var grad = ctx.createRadialGradient(32, 24, 5, 32, 34, 48);
      grad.addColorStop(0, '#171b38');
      grad.addColorStop(0.55, '#0d1024');
      grad.addColorStop(1, '#03040a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      STAR_DOTS.forEach(function (d, i) {
        if ((frame + i * 7) % 64 < 40) p(d[0], d[1], i % 3 === 0 ? '#3a4470' : '#262c50');
      });
    };
    var r    = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    var p    = function (x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    var getBob    = function () { return Math.round(Math.sin(frame * 0.45) * 1); };
    var getBlink  = function () { return (frame % 90) < 4; };
    var getFlapUp = function () { return (frame % 6) < 3; };

    // tiny 3x5 pixel font — just the glyphs the emote set needs, drawn
    // with the same p()/r() primitives as the sprites so it stays crisp
    // at native resolution instead of fighting canvas font antialiasing
    var GLYPHS = {
      '.': ['...', '...', '...', '...', '.#.'],
      '^': ['.#.', '#.#', '...', '...', '...'],
      '_': ['...', '...', '...', '...', '###'],
      '>': ['#..', '.#.', '..#', '.#.', '#..'],
      ':': ['...', '.#.', '...', '.#.', '...'],
      '(': ['.#.', '#..', '#..', '#..', '.#.'],
      ';': ['...', '.#.', '...', '.#.', '#..'],
      'T': ['###', '.#.', '.#.', '.#.', '.#.'],
      'z': ['###', '..#', '.#.', '#..', '###'],
      '?': ['.#.', '#.#', '..#', '.#.', '.#.'],
      '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    };

    function textWidthPx(text) { return text.length * 4 - 1; }

    function drawPixelText(text, x, y, color) {
      var cx = x;
      for (var i = 0; i < text.length; i++) {
        var g = GLYPHS[text[i]];
        if (g) {
          for (var row = 0; row < 5; row++) {
            for (var col = 0; col < 3; col++) {
              if (g[row][col] === '#') p(cx + col, y + row, color);
            }
          }
        }
        cx += 4;
      }
    }

    function drawEmote() {
      if (!emoteTimer) return;
      var fadeIn = Math.min(1, (emoteMaxTimer - emoteTimer) / 6);
      var fadeOut = Math.min(1, emoteTimer / 6);
      var alpha = Math.min(fadeIn, fadeOut);
      var bob = Math.round(Math.sin(frame * 0.3) * 1);
      var text = emoteText;
      var tw = textWidthPx(text);
      var boxW = tw + 6;
      var boxX = 32 - Math.round(boxW / 2);
      var boxY = 3 + bob;
      var boxH = 9;

      ctx.globalAlpha = alpha;
      r(boxX, boxY, boxW, boxH, '#0a0018');
      ctx.strokeStyle = '#a060ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
      drawPixelText(text, boxX + 3, boxY + 2, '#f8e8ff');
      ctx.globalAlpha = 1;
    }

    function drawSparkles(cx, top) {
      var offsets = [[-5, -2], [3, -1], [-2, -4], [5, -3], [0, -5], [7, -2], [-4, -1], [2, -5]];
      var sp = offsets[frame % offsets.length];
      var x = cx + sp[0], y = top + sp[1];
      if (x >= 0 && x < 64 && y >= 0 && y < 64) p(x, y, frame % 2 === 0 ? '#44ff88' : '#88ffcc');
      var sp2 = offsets[(frame + 4) % offsets.length];
      var x2 = cx + sp2[0], y2 = top + sp2[1];
      if (x2 >= 0 && x2 < 64 && y2 >= 0 && y2 < 64) p(x2, y2, '#aaffdd');
    }

    function drawHearts(cx, top) {
      var t = frame % 24;
      var rise = -Math.floor(t / 3);
      if (t < 20) {
        var hx = cx + (frame % 8 < 4 ? -5 : 4);
        var hy = top + rise;
        if (hy > 0 && hy < 62 && hx > 1 && hx < 62) {
          r(hx, hy, 2, 1, '#ff2255');
          r(hx - 1, hy + 1, 4, 1, '#ff2255');
          r(hx, hy + 2, 2, 1, '#ff2255');
          p(hx + 1, hy + 3, '#ff2255');
        }
      }
    }

    // STAGE 1-2 — WRAITH HATCHLING
    function drawWraithHatchling(b, bl) {
      var Y = 34 + b;
      var hungerPct = stats.hunger, corruptionPct = stats.corruption, entropyPct = stats.entropy, corrosionPct = stats.corrosion;

      var eyeGlow = hungerPct > 70 ? '#480060' : hungerPct > 50 ? '#340048' : hungerPct > 30 ? '#240035' : hungerPct > 10 ? '#150022' : '#09000f';
      var eyeIris = hungerPct > 70 ? '#7800a8' : hungerPct > 50 ? '#5a0080' : hungerPct > 30 ? '#3c0055' : hungerPct > 10 ? '#220032' : '#0f0018';
      var eyeCore = hungerPct > 70 ? '#cc00ff' : hungerPct > 50 ? '#aa00dd' : hungerPct > 30 ? '#7700aa' : hungerPct > 10 ? '#440066' : '#220033';
      var eyeHi   = hungerPct > 50 ? '#aa00dd' : hungerPct > 30 ? '#660088' : hungerPct > 10 ? '#3a0050' : '#18001e';

      var bodyOut   = corruptionPct > 70 ? '#28000d' : corruptionPct > 40 ? '#1e0025' : '#160030';
      var bodyMid   = corruptionPct > 70 ? '#3a0018' : corruptionPct > 40 ? '#2a0035' : '#220046';
      var bodyIn    = corruptionPct > 70 ? '#460020' : corruptionPct > 40 ? '#340040' : '#27004e';
      var bodyFront = corruptionPct > 70 ? '#500025' : corruptionPct > 40 ? '#3c004a' : '#2c0056';

      var pulseRate = entropyPct > 70 ? 5 : entropyPct > 40 ? 8 : entropyPct > 15 ? 12 : 22;
      var pulse = frame % pulseRate < Math.floor(pulseRate / 2);
      var glowBase = entropyPct > 60 ? '#3a0068' : entropyPct > 30 ? '#2e0058' : '#200042';
      var glowMid  = entropyPct > 60 ? '#480078' : entropyPct > 30 ? '#380065' : '#280050';
      var glowPeak = entropyPct > 60 ? '#560088' : entropyPct > 30 ? '#440072' : '#300058';
      var tendrilSpd = entropyPct < 15 ? 2 : 1;
      var tendrilRng = entropyPct > 60 ? 2 : 1;
      var f2 = frame >> tendrilSpd;
      var tL = (f2 % 8) < 4 ? tendrilRng : 0;
      var tR = ((f2 + 3) % 8) < 4 ? tendrilRng : 0;
      var tCw = frame % (entropyPct > 50 ? 10 : 16) < (entropyPct > 50 ? 5 : 8);
      var wispC = hungerPct > 50 ? bodyOut : hungerPct > 20 ? '#0e001e' : '#080012';

      r(26, Y + 16, 12, 1, '#09001a');

      r(27, Y + 8, 2, 4, bodyOut);
      r(26 + tL, Y + 12, 2, 2, '#0f0024');
      r(25 + tL, Y + 14, 1, 2, '#08001a');

      r(31, Y + 8, 2, 5, bodyOut);
      r(31, Y + 13, 2, 2, tCw ? '#0f0024' : '#0a001e');
      r(31 + (tCw ? 0 : tendrilRng), Y + 15, 1, 1, '#08001a');

      r(35, Y + 8, 2, 4, bodyOut);
      r(35 + tR, Y + 12, 2, 2, '#0f0024');
      r(36 + tR, Y + 14, 1, 2, '#08001a');

      r(28, Y - 2, 2, 2, wispC);
      r(31, Y - 3, 2, 3, wispC);
      r(35, Y - 2, 2, 2, wispC);
      p(32, Y - 4, hungerPct > 40 ? '#0e0028' : '#060012');

      if (pulse) r(22, Y - 2, 20, 12, '#0b0022');

      r(25, Y - 1, 14, 10, bodyOut);
      r(24, Y, 16, 8, bodyOut);
      r(23, Y + 1, 18, 6, bodyOut);

      r(26, Y, 12, 8, bodyMid);
      r(25, Y + 1, 14, 6, bodyIn);
      r(24, Y + 2, 16, 4, bodyFront);

      r(28, Y + 1, 8, 5, glowBase);
      r(29, Y + 2, 6, 3, glowMid);
      if (pulse) r(30, Y + 3, 4, 1, glowPeak);

      r(24, Y + 1, 6, 4, '#0e001e');
      r(32, Y + 1, 6, 4, '#0e001e');

      if (!bl) {
        r(25, Y + 2, 4, 2, eyeGlow);
        r(25, Y + 2, 3, 2, eyeIris);
        p(26, Y + 2, eyeCore);
        p(26, Y + 3, eyeHi);
        r(33, Y + 2, 4, 2, eyeGlow);
        r(33, Y + 2, 3, 2, eyeIris);
        p(34, Y + 2, eyeCore);
        p(34, Y + 3, eyeHi);
      } else {
        r(24, Y + 3, 6, 1, '#0e001e');
        r(32, Y + 3, 6, 1, '#0e001e');
      }

      r(29, Y + 6, 6, 1, bodyOut);
      p(28, Y + 7, '#0e001e');
      p(35, Y + 7, '#0e001e');

      if (corrosionPct > 40) {
        p(27, Y + 4, '#3a0020');
        p(38, Y + 3, '#3a0020');
      }
      if (corrosionPct > 70) {
        p(30, Y + 2, '#550025');
        p(36, Y + 6, '#550025');
        p(29, Y + 7, '#440018');
      }
    }

    // STAGE 3-4 — CLANNFEAR PUP
    function drawClannfearPup(b, bl) {
      var Y = 34 + b;
      r(25, Y + 27, 14, 1, '#000811');
      r(41, Y + 14, 5, 3, '#1a3a4a');
      r(45, Y + 12, 3, 3, '#1a3a4a');
      r(47, Y + 10, 2, 3, '#1a3a4a');
      r(26, Y + 8, 12, 12, '#0d2233');
      r(25, Y + 10, 14, 8, '#0d2233');
      r(27, Y + 8, 10, 12, '#1a3a4a');
      r(26, Y + 10, 12, 8, '#1a3a4a');
      r(28, Y + 12, 8, 6, '#22485a');
      r(22, Y + 10, 4, 6, '#0d2233');
      r(38, Y + 10, 4, 6, '#0d2233');
      r(21, Y + 15, 3, 2, '#0d2233');
      r(39, Y + 15, 3, 2, '#0d2233');
      p(21, Y + 16, '#4a8a9a');
      p(23, Y + 16, '#4a8a9a');
      p(39, Y + 16, '#4a8a9a');
      p(41, Y + 16, '#4a8a9a');
      r(27, Y + 20, 4, 6, '#0d2233');
      r(33, Y + 20, 4, 6, '#0d2233');
      r(25, Y + 25, 6, 2, '#0d2233');
      r(33, Y + 25, 6, 2, '#0d2233');
      r(29, Y + 4, 6, 5, '#0d2233');
      r(30, Y + 3, 4, 5, '#1a3a4a');
      r(24, Y - 1, 16, 6, '#0d2233');
      r(25, Y, 14, 7, '#1a3a4a');
      r(26, Y + 1, 12, 5, '#223d50');
      r(25, Y - 3, 14, 3, '#0d2233');
      r(27, Y - 2, 10, 2, '#1a3a4a');
      r(26, Y + 1, 12, 2, '#0d2233');
      if (!bl) {
        r(27, Y + 2, 3, 2, '#ccaa00');
        r(34, Y + 2, 3, 2, '#ccaa00');
        p(28, Y + 2, '#ffee44');
        p(35, Y + 2, '#ffee44');
      } else {
        r(27, Y + 3, 3, 1, '#0d2233');
        r(34, Y + 3, 3, 1, '#0d2233');
      }
      p(29, Y + 6, '#ccbbaa');
      p(31, Y + 6, '#ccbbaa');
      p(33, Y + 6, '#ccbbaa');
      r(26, Y, 2, 1, '#0d2233');
      r(36, Y, 2, 1, '#0d2233');
    }

    // STAGE 5-6 — DAEDROTH WHELP
    function drawDaedrothWhelp(b, bl) {
      var Y = 28 + b;
      r(17, Y + 34, 30, 1, '#000811');
      r(43, Y + 18, 6, 4, '#1a4a1a');
      r(48, Y + 16, 4, 4, '#1a4a1a');
      r(51, Y + 13, 3, 4, '#1a4a1a');
      r(19, Y + 8, 24, 20, '#0d2d0d');
      r(18, Y + 12, 26, 12, '#0d2d0d');
      r(20, Y + 8, 22, 20, '#1a4a1a');
      r(19, Y + 12, 24, 12, '#1a4a1a');
      r(22, Y + 18, 16, 8, '#2d6a2d');
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 4; col++) {
          p(23 + col * 5 + (row % 2) * 2, Y + 12 + row * 5, '#265c26');
        }
      }
      r(14, Y + 10, 5, 8, '#1a4a1a');
      r(43, Y + 10, 5, 8, '#1a4a1a');
      r(12, Y + 17, 4, 2, '#0d2d0d');
      r(43, Y + 17, 4, 2, '#0d2d0d');
      p(12, Y + 18, '#3a8a3a');
      p(15, Y + 18, '#3a8a3a');
      p(43, Y + 18, '#3a8a3a');
      p(46, Y + 18, '#3a8a3a');
      r(21, Y + 28, 7, 5, '#1a4a1a');
      r(34, Y + 28, 7, 5, '#1a4a1a');
      r(19, Y + 31, 9, 3, '#0d2d0d');
      r(34, Y + 31, 9, 3, '#0d2d0d');
      r(26, Y + 3, 10, 6, '#1a4a1a');
      r(20, Y - 4, 22, 8, '#0d2d0d');
      r(21, Y - 3, 20, 8, '#1a4a1a');
      r(22, Y - 2, 18, 6, '#1d4d1d');
      r(20, Y + 2, 22, 4, '#0d2d0d');
      r(21, Y + 3, 20, 3, '#1a4a1a');
      r(22, Y - 7, 3, 4, '#2d6a2d');
      r(38, Y - 7, 3, 4, '#2d6a2d');
      p(23, Y - 8, '#3a7a3a');
      p(39, Y - 8, '#3a7a3a');
      r(22, Y - 2, 18, 2, '#0d2d0d');
      if (!bl) {
        r(24, Y - 1, 3, 2, '#cc0000');
        r(36, Y - 1, 3, 2, '#cc0000');
        p(25, Y - 1, '#ff3333');
        p(37, Y - 1, '#ff3333');
      } else {
        r(24, Y, 3, 1, '#0d2d0d');
        r(36, Y, 3, 1, '#0d2d0d');
      }
      for (var i = 0; i < 5; i++) { p(22 + i * 4, Y + 6, '#ccddcc'); }
    }

    // STAGE 7-8 — WINGED HORROR
    function drawWingedHorror(b, bl) {
      var Y = 20 + b;
      var flap = getFlapUp();
      r(18, Y + 42, 28, 1, '#000811');
      if (flap) {
        r(2, Y + 4, 16, 3, '#1a0840');
        r(2, Y + 2, 10, 3, '#1a0840');
        r(3, Y + 1, 6, 2, '#1a0840');
        r(4, Y, 3, 2, '#1a0840');
        r(46, Y + 4, 16, 3, '#1a0840');
        r(52, Y + 2, 10, 3, '#1a0840');
        r(55, Y + 1, 6, 2, '#1a0840');
        r(57, Y, 3, 2, '#1a0840');
        r(5, Y + 2, 12, 5, '#2d1060');
        r(47, Y + 2, 12, 5, '#2d1060');
      } else {
        r(2, Y + 8, 16, 3, '#1a0840');
        r(3, Y + 6, 12, 3, '#1a0840');
        r(5, Y + 4, 8, 3, '#1a0840');
        r(46, Y + 8, 16, 3, '#1a0840');
        r(49, Y + 6, 12, 3, '#1a0840');
        r(51, Y + 4, 8, 3, '#1a0840');
        r(6, Y + 5, 12, 6, '#2d1060');
        r(46, Y + 5, 12, 6, '#2d1060');
      }
      p(16, Y + (flap ? 3 : 7), '#3d1a7a');
      p(46, Y + (flap ? 3 : 7), '#3d1a7a');
      r(26, Y + 6, 12, 20, '#1a0840');
      r(25, Y + 8, 14, 16, '#1a0840');
      r(27, Y + 7, 10, 18, '#2d1060');
      r(26, Y + 8, 12, 16, '#2d1060');
      r(28, Y + 16, 8, 8, '#3d1a7a');
      r(28, Y + 2, 8, 5, '#1a0840');
      r(29, Y + 2, 6, 5, '#2d1060');
      r(24, Y - 5, 16, 8, '#1a0840');
      r(25, Y - 4, 14, 8, '#2d1060');
      r(26, Y - 3, 12, 7, '#341270');
      r(27, Y - 8, 2, 4, '#2d1060');
      r(35, Y - 8, 2, 4, '#2d1060');
      p(28, Y - 9, '#3d1a7a');
      p(36, Y - 9, '#3d1a7a');
      if (frame % 4 < 2) {
        r(26, Y - 3, 5, 4, '#2d1060');
        r(35, Y - 3, 5, 4, '#2d1060');
      }
      if (!bl) {
        r(27, Y - 2, 4, 3, '#cc8800');
        r(35, Y - 2, 4, 3, '#cc8800');
        r(28, Y - 2, 2, 2, '#ffcc00');
        r(36, Y - 2, 2, 2, '#ffcc00');
        p(28, Y - 2, '#ffffff');
        p(36, Y - 2, '#ffffff');
      } else {
        r(27, Y - 1, 4, 1, '#1a0840');
        r(35, Y - 1, 4, 1, '#1a0840');
      }
      r(28, Y + 2, 8, 3, '#1a0840');
      r(29, Y + 3, 6, 2, '#2d1060');
      p(29, Y + 5, '#ccbbee');
      p(32, Y + 5, '#ccbbee');
      p(34, Y + 5, '#ccbbee');
      r(27, Y + 24, 3, 4, '#1a0840');
      r(35, Y + 24, 3, 4, '#1a0840');
      p(26, Y + 27, '#2d1060');
      p(30, Y + 27, '#2d1060');
      p(35, Y + 27, '#2d1060');
      p(38, Y + 27, '#2d1060');
    }

    // STAGE 9-10 — DAEDROTH LORD
    function drawDaedrothLord(b, bl) {
      var Y = 10 + b;
      r(12, Y + 52, 40, 2, '#000811');
      r(20, Y + 20, 24, 28, '#220000');
      r(18, Y + 24, 28, 22, '#220000');
      r(21, Y + 20, 22, 26, '#440000');
      r(19, Y + 24, 26, 20, '#440000');
      r(22, Y + 21, 20, 24, '#550000');
      r(20, Y + 24, 24, 18, '#550000');
      r(24, Y + 30, 16, 14, '#661111');
      for (var row2 = 0; row2 < 3; row2++) {
        for (var col2 = 0; col2 < 3; col2++) {
          p(25 + col2 * 5 + (row2 % 2) * 2, Y + 31 + row2 * 4, '#771a1a');
        }
      }
      r(11, Y + 18, 8, 20, '#330000');
      r(10, Y + 20, 10, 16, '#440000');
      r(45, Y + 18, 8, 20, '#330000');
      r(44, Y + 20, 10, 16, '#440000');
      r(8, Y + 35, 4, 3, '#220000');
      r(8, Y + 37, 3, 3, '#220000');
      r(12, Y + 37, 3, 3, '#220000');
      r(48, Y + 35, 4, 3, '#220000');
      r(49, Y + 37, 3, 3, '#220000');
      r(53, Y + 37, 3, 3, '#220000');
      p(8, Y + 39, '#553300');
      p(11, Y + 39, '#553300');
      p(14, Y + 39, '#553300');
      p(49, Y + 39, '#553300');
      p(52, Y + 39, '#553300');
      p(55, Y + 39, '#553300');
      r(21, Y + 46, 8, 6, '#330000');
      r(35, Y + 46, 8, 6, '#330000');
      r(18, Y + 50, 12, 3, '#220000');
      r(34, Y + 50, 12, 3, '#220000');
      r(26, Y + 11, 12, 9, '#330000');
      r(27, Y + 10, 10, 9, '#440000');
      r(19, Y + 1, 26, 12, '#330000');
      r(18, Y + 3, 28, 10, '#330000');
      r(20, Y + 2, 24, 10, '#440000');
      r(19, Y + 3, 26, 8, '#440000');
      r(20, Y + 3, 24, 3, '#220000');
      r(17, Y - 10, 5, 12, '#330000');
      r(18, Y - 11, 3, 4, '#440000');
      p(19, Y - 12, '#550000');
      r(42, Y - 10, 5, 12, '#330000');
      r(43, Y - 11, 3, 4, '#440000');
      p(44, Y - 12, '#550000');
      r(22, Y - 5, 3, 6, '#440000');
      r(39, Y - 5, 3, 6, '#440000');
      if (frame % 4 < 2) {
        r(22, Y + 3, 7, 5, '#3a0000');
        r(36, Y + 3, 7, 5, '#3a0000');
      }
      if (!bl) {
        r(23, Y + 5, 4, 3, '#aa7700');
        r(37, Y + 5, 4, 3, '#aa7700');
        r(24, Y + 5, 3, 2, '#ffcc00');
        r(38, Y + 5, 3, 2, '#ffcc00');
        p(24, Y + 5, '#ffffff');
        p(38, Y + 5, '#ffffff');
        p(25, Y + 6, '#000000');
        p(39, Y + 6, '#000000');
      } else {
        r(23, Y + 6, 4, 1, '#220000');
        r(37, Y + 6, 4, 1, '#220000');
      }
      r(29, Y + 8, 6, 4, '#330000');
      r(20, Y + 11, 24, 3, '#220000');
      for (var i2 = 0; i2 < 6; i2++) { r(21 + i2 * 4, Y + 12, 2, 3, '#ccbbaa'); }
    }

    // ── overlay effects ────────────────────────────────────────────────
    function drawFeralEffect() {
      if (frame % 3 < 1) {
        r(0, Math.floor(Math.random() * 64), 64, 1, 'rgba(255,0,0,0.12)');
      }
      var grad = ctx.createRadialGradient(32, 32, 18, 32, 32, 38);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(180,0,0,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }

    function applyCorrosionGlitch(intensity) {
      if (intensity < 35 || Math.random() > 0.4) return;
      var imgData = ctx.getImageData(0, 0, 64, 64);
      var src = new Uint8ClampedArray(imgData.data);
      var data = imgData.data;
      var numLines = Math.ceil((intensity - 30) / 20);
      for (var i = 0; i < numLines; i++) {
        var y = Math.floor(Math.random() * 62);
        var h = 1 + Math.floor(Math.random() * 2);
        var dx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
        for (var row = y; row < y + h && row < 64; row++) {
          for (var x = 0; x < 64; x++) {
            var sx = ((x - dx) + 64) % 64;
            var di = (row * 64 + x) * 4;
            var si = (row * 64 + sx) * 4;
            data[di] = src[si];
            data[di + 1] = src[si + 1];
            data[di + 2] = src[si + 2];
            data[di + 3] = src[si + 3];
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function drawSoulCapture() {
      var t = stateTimer / 12;
      ctx.fillStyle = 'rgba(100,40,180,' + (0.45 * t) + ')';
      ctx.fillRect(0, 0, 64, 64);
      var rad = (1 - t) * 28 + 4;
      ctx.strokeStyle = 'rgba(180,100,255,' + (t * 0.7) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(32, 32, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawRitualCast() {
      var t = stateTimer / 20;
      ctx.fillStyle = 'rgba(20,0,60,' + (0.6 * t) + ')';
      ctx.fillRect(0, 0, 64, 64);
      var rad = (1 - t) * 40 + 2;
      ctx.strokeStyle = 'rgba(200,80,255,' + t + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 32, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,40,200,' + (t * 0.5) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(32, 32, rad * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawBurst() {
      var t = stateTimer / 16;
      if (stateTimer % 2 === 0) {
        ctx.fillStyle = 'rgba(255,40,0,' + (0.15 * t) + ')';
        ctx.fillRect(0, 0, 64, 64);
      }
      var lines = 2 + Math.floor(t * 3);
      var imgData = ctx.getImageData(0, 0, 64, 64);
      var src = new Uint8ClampedArray(imgData.data);
      var data = imgData.data;
      for (var i = 0; i < lines; i++) {
        var y = Math.floor(Math.random() * 62);
        var dx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
        for (var x = 0; x < 64; x++) {
          var sx = ((x - dx) + 64) % 64;
          var di = (y * 64 + x) * 4;
          var si = (y * 64 + sx) * 4;
          data[di] = src[si];
          data[di + 1] = src[si + 1];
          data[di + 2] = src[si + 2];
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function drawDevolvePulse() {
      var t = stateTimer / 24;
      ctx.fillStyle = 'rgba(180,0,0,' + (0.3 * t) + ')';
      ctx.fillRect(0, 0, 64, 64);
      var inset = Math.round((1 - t) * 8);
      ctx.strokeStyle = 'rgba(200,0,30,' + (t * 0.9) + ')';
      ctx.lineWidth = 4 + Math.round(t * 6);
      ctx.strokeRect(inset, inset, 64 - inset * 2, 64 - inset * 2);
    }

    // HAUNT ritual — a translucent second wraith drifting behind the pet
    function drawGhost() {
      var t = stateTimer / 40;
      var gx = 32 + Math.round(Math.sin(frame * 0.12) * 14);
      var gy = 20 + Math.round(Math.cos(frame * 0.09) * 6);
      ctx.save();
      ctx.globalAlpha = 0.35 * t;
      ctx.fillStyle = '#a060ff';
      ctx.fillRect(gx - 5, gy, 10, 8);
      ctx.fillStyle = '#000811';
      ctx.fillRect(gx - 3, gy + 2, 2, 2);
      ctx.fillRect(gx + 1, gy + 2, 2, 2);
      ctx.restore();
    }

    // ── boot splash — a surreal little eye waking up in the void, blinks
    // once, then closes into a flash that cuts to the real pet ──────────
    function drawEyeLens(cx, cy, openAmt, scleraColor, edgeColor) {
      if (openAmt < 0.12) {
        r(cx - 17, cy - 1, 34, 2, edgeColor);
        return;
      }
      var rows = [
        { dy: -7, w: 18 }, { dy: -5, w: 26 }, { dy: -3, w: 31 }, { dy: 0, w: 34 },
        { dy: 3, w: 31 }, { dy: 5, w: 26 }, { dy: 7, w: 18 },
      ];
      rows.forEach(function (row) {
        var y = cy + Math.round(row.dy * openAmt);
        r(cx - Math.round(row.w / 2), y, row.w, 2, scleraColor);
      });
      var edgeY = Math.round(7 * openAmt);
      r(cx - 17, cy - edgeY, 34, 1, edgeColor);
      r(cx - 17, cy + edgeY, 34, 1, edgeColor);
    }

    function drawSplash(f, total) {
      var t = f / total;

      ctx.fillStyle = 'rgba(60,15,90,0.45)';
      ctx.fillRect(0, 0, 64, 64);

      for (var i = 0; i < 14; i++) {
        var ang = (i / 14) * Math.PI * 2 + f * 0.05;
        var rad = 22 + 6 * Math.sin(f * 0.09 + i);
        var mx = 32 + Math.round(Math.cos(ang) * rad);
        var my = 32 + Math.round(Math.sin(ang) * rad * 0.6);
        if ((f + i * 3) % 20 < 10 && mx >= 0 && mx < 64 && my >= 0 && my < 64) {
          p(mx, my, i % 2 === 0 ? '#8a3fc0' : '#ff7fb8');
        }
      }

      var openAmt;
      if (t < 0.15) openAmt = 0;
      else if (t < 0.22) openAmt = (t - 0.15) / 0.07;
      else if (t < 0.42) openAmt = 1;
      else if (t < 0.47) openAmt = 1 - (t - 0.42) / 0.05;
      else if (t < 0.52) openAmt = (t - 0.47) / 0.05;
      else if (t < 0.82) openAmt = 1;
      else if (t < 0.94) openAmt = 1 - (t - 0.82) / 0.12;
      else openAmt = 0;
      openAmt = Math.max(0, Math.min(1, openAmt));

      var cx = 32, cy = 32;
      drawEyeLens(cx, cy, openAmt, '#fce4f5', '#ff8fc0');

      if (openAmt > 0.45) {
        r(cx - 5, cy - 5, 10, 10, '#a24fe0');
        r(cx - 3, cy - 3, 6, 6, '#ff70c0');
        r(cx - 2, cy - 2, 4, 4, '#2a0838');
        p(cx - 1, cy - 1, '#ffffff');
      }

      if (openAmt > 0.6) {
        p(cx - 16, cy - Math.round(7 * openAmt) - 1, '#3a1030');
        p(cx - 15, cy - Math.round(7 * openAmt) - 2, '#3a1030');
        p(cx + 15, cy - Math.round(7 * openAmt) - 1, '#3a1030');
        p(cx + 16, cy - Math.round(7 * openAmt) - 2, '#3a1030');

        p(cx - 4, cy + 11, '#ff9fc8');
        r(cx - 3, cy + 12, 6, 1, '#ff9fc8');
        p(cx + 4, cy + 11, '#ff9fc8');
      }

      if (t > 0.94) {
        var flashT = (t - 0.94) / 0.06;
        ctx.fillStyle = 'rgba(255,235,250,' + (flashT * 0.9) + ')';
        ctx.fillRect(0, 0, 64, 64);
      }
    }

    function render() {
      cls();

      if (splashActive) {
        drawSplash(splashFrame, splashTotalFrames);
        splashFrame++;
        if (splashFrame >= splashTotalFrames) {
          splashActive = false;
          var cb = splashCallback;
          splashCallback = null;
          if (cb) cb();
        }
        return;
      }

      var b = getBob();
      var bl = getBlink();

      var sx = 0, sy = 0;
      if (stats.feral) {
        sx = Math.round((Math.random() - 0.5) * 3);
        sy = Math.round((Math.random() - 0.5) * 2);
      } else if (fidgetMode) {
        sx = Math.round(Math.sin(frame * 0.3) * fidgetDir);
      }
      ctx.save();
      if (sx || sy) ctx.translate(sx, sy);

      var lv = stats.level;
      if (lv <= 2) drawWraithHatchling(b, bl);
      else if (lv <= 4) drawClannfearPup(b, bl);
      else if (lv <= 6) drawDaedrothWhelp(b, bl);
      else if (lv <= 8) drawWingedHorror(b, bl);
      else drawDaedrothLord(b, bl);

      ctx.restore();

      if (stats.portalActive && frame % 20 < 2) {
        ctx.fillStyle = 'rgba(150,20,200,0.08)';
        ctx.fillRect(0, 0, 64, 64);
      }

      if (stats.feral) drawFeralEffect();
      if (petState === 'fed') drawSparkles(32, 14);
      if (petState === 'petted') drawHearts(32, 10);
      if (petState === 'levelup' && frame % 4 < 2) {
        ctx.fillStyle = 'rgba(255,200,0,0.18)';
        ctx.fillRect(0, 0, 64, 64);
      }
      if (petState === 'soulcap') drawSoulCapture();
      if (petState === 'ritual') drawRitualCast();
      if (petState === 'burst') drawBurst();
      if (petState === 'devolve') drawDevolvePulse();
      if (petState === 'ghost') drawGhost();

      applyCorrosionGlitch(stats.corrosion);

      // ambient emotes — mood-driven, gated so they don't spam
      if (!emoteTimer) {
        if (stats.feral && frame - lastAmbientEmoteFrame > 70 && Math.random() < 0.03) {
          showEmote(Math.random() < 0.5 ? '>:(' : ';_;', 24);
          lastAmbientEmoteFrame = frame;
        } else if (!stats.feral && stats.hunger < 20 && frame - lastAmbientEmoteFrame > 90 && Math.random() < 0.02) {
          showEmote(';_;', 24);
          lastAmbientEmoteFrame = frame;
        } else if (fidgetMode && frame - lastAmbientEmoteFrame > 130 && Math.random() < 0.015) {
          showEmote('zzz...', 34);
          lastAmbientEmoteFrame = frame;
        } else if (frame - lastAmbientEmoteFrame > 200 && Math.random() < 0.006) {
          showEmote(Math.random() < 0.5 ? '..?' : '...', 20);
          lastAmbientEmoteFrame = frame;
        }
      }
      drawEmote();
      if (emoteTimer > 0) emoteTimer--;

      if (stateTimer > 0 && --stateTimer === 0) petState = 'idle';
    }

    var lastTick = 0;
    var TICK_MS = 125;
    function loop(ts) {
      if (ts - lastTick >= (stats.entropy > 70 ? 80 : stats.entropy > 40 ? 100 : TICK_MS)) {
        lastTick = ts;
        frame++;
        idleFrames++;
        fidgetMode = idleFrames > 120;
        if (fidgetMode && frame % 60 === 0) fidgetDir = Math.random() > 0.5 ? 1 : -1;
        render();
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() { if (rafId === null) rafId = requestAnimationFrame(loop); }
    function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

    return { setStats: setStats, trigger: trigger, start: start, stop: stop, render: render, playSplash: playSplash };
  }

  var ZahlRender = { create: create };

  if (typeof module !== 'undefined' && module.exports) module.exports = ZahlRender;
  if (root) root.ZahlRender = ZahlRender;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
