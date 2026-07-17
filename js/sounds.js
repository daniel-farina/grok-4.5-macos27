/**
 * macOS-style system sounds via Web Audio API
 * Approximations of classic Mac alerts (no proprietary audio files required).
 */
(function (global) {
  'use strict';

  var ctx = null;
  var unlocked = false;

  function getCtx() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function unlock() {
    if (unlocked) return;
    var c = getCtx();
    if (!c) return;
    unlocked = true;
  }

  if (typeof document !== 'undefined') {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, unlock, { once: true, capture: true });
    });
  }

  function tone(freq, t0, dur, type, gain, detune) {
    var c = getCtx();
    if (!c) return;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseBurst(t0, dur, gain) {
    var c = getCtx();
    if (!c) return;
    var n = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    var f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    g.gain.setValueAtTime(gain || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t0);
  }

  var SOUNDS = {
    /* Classic "Blow" / soft whoosh-ish */
    blow: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(880, t, 0.12, 'sine', 0.06);
      tone(660, t + 0.05, 0.18, 'sine', 0.05);
      noiseBurst(t, 0.15, 0.04);
    },
    /* Glass / bottle clink */
    glass: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(1400, t, 0.4, 'sine', 0.09);
      tone(2100, t, 0.35, 'sine', 0.05);
      tone(2800, t + 0.02, 0.25, 'triangle', 0.03);
    },
    /* Hero / success-ish arpeggio */
    hero: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(f, t + i * 0.09, 0.22, 'triangle', 0.08);
      });
    },
    /* Sosumi-ish two-tone beep */
    sosumi: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(800, t, 0.12, 'square', 0.05);
      tone(600, t + 0.14, 0.18, 'square', 0.05);
    },
    /* Pop / click */
    pop: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(400, t, 0.05, 'sine', 0.1);
      noiseBurst(t, 0.04, 0.06);
    },
    /* Tink */
    tink: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(1800, t, 0.08, 'sine', 0.07);
      tone(2400, t + 0.02, 0.06, 'sine', 0.04);
    },
    /* Purr / low rumble */
    purr: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(90, t, 0.35, 'sawtooth', 0.04);
      tone(120, t + 0.05, 0.3, 'sine', 0.05);
    },
    /* Submarine */
    submarine: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      for (var i = 0; i < 3; i++) {
        tone(440, t + i * 0.22, 0.15, 'sine', 0.07);
      }
    },
    /* Funk */
    funk: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(110, t, 0.12, 'square', 0.06);
      tone(165, t + 0.1, 0.12, 'square', 0.05);
      tone(220, t + 0.2, 0.18, 'triangle', 0.06);
    },
    /* Ping / empty trash-ish */
    emptyTrash: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(300, t, 0.08, 'triangle', 0.07);
      tone(200, t + 0.08, 0.1, 'triangle', 0.05);
      noiseBurst(t + 0.05, 0.12, 0.05);
    },
    /* Message send */
    messageSent: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(900, t, 0.06, 'sine', 0.07);
      tone(1200, t + 0.05, 0.1, 'sine', 0.06);
    },
    /* Message received */
    messageReceived: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(600, t, 0.08, 'sine', 0.07);
      tone(800, t + 0.07, 0.1, 'sine', 0.06);
    },
    /* Volume tick */
    volume: function () {
      var c = getCtx();
      if (!c) return;
      tone(1000, c.currentTime, 0.04, 'sine', 0.05);
    },
    /* Menu open */
    menu: function () {
      var c = getCtx();
      if (!c) return;
      tone(700, c.currentTime, 0.03, 'sine', 0.03);
    },
    /* Boot complete soft chime */
    boot: function () {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(523.25, t, 0.4, 'sine', 0.06);
      tone(659.25, t + 0.15, 0.45, 'sine', 0.05);
    },
  };

  function play(name) {
    unlock();
    var fn = SOUNDS[name] || SOUNDS.pop;
    try {
      fn();
    } catch (e) {
      /* ignore autoplay restrictions */
    }
  }

  global.MacSounds = {
    play: play,
    names: Object.keys(SOUNDS),
    unlock: unlock,
  };
})(typeof window !== 'undefined' ? window : globalThis);
