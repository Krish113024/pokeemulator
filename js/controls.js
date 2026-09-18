/* ==========================================================================
   controls.js — customizable control bindings for EmberBoy.

   EmulatorJS reads its bindings from the global `EJS_defaultControls` object.
   Each player (0..3) maps a RetroPad button index -> { value, value2 } where
   `value` is a keyboard label string (EmulatorJS's own label format, e.g.
   "x", "enter", "up arrow") and `value2` is a gamepad binding.

   This module:
     • defines sensible GBA defaults,
     • persists user remaps in localStorage,
     • converts a real KeyboardEvent into EmulatorJS's label string,
     • exposes helpers used by app.js and the controls modal.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'emberboy.controls.v1';

  // RetroPad button index -> friendly name (GBA-relevant subset)
  var BUTTONS = {
    0:  'B',
    2:  'SELECT',
    3:  'START',
    4:  'UP',
    5:  'DOWN',
    6:  'LEFT',
    7:  'RIGHT',
    8:  'A',
    10: 'L',
    11: 'R'
  };

  // Gamepad defaults (value2) so a plugged-in controller works out of the box.
  var GAMEPAD_DEFAULTS = {
    0:  'BUTTON_1',              // B  -> physical bottom-right cluster
    2:  'SELECT',
    3:  'START',
    4:  'DPAD_UP',
    5:  'DPAD_DOWN',
    6:  'DPAD_LEFT',
    7:  'DPAD_RIGHT',
    8:  'BUTTON_2',              // A
    10: 'LEFT_TOP_SHOULDER',
    11: 'RIGHT_TOP_SHOULDER'
  };

  // Default keyboard bindings (EmulatorJS label strings).
  var KEY_DEFAULTS = {
    0:  'z',            // B
    8:  'x',            // A
    2:  'shift',        // SELECT
    3:  'enter',        // START
    4:  'up arrow',
    5:  'down arrow',
    6:  'left arrow',
    7:  'right arrow',
    10: 'a',            // L
    11: 's'             // R
  };

  /* --------------- KeyboardEvent -> EmulatorJS label --------------- */
  // Mirrors EmulatorJS's internal keyboard label table.
  var KEYCODE_LABELS = {
    8: 'backspace', 9: 'tab', 13: 'enter', 16: 'shift', 17: 'ctrl', 18: 'alt',
    19: 'pause/break', 20: 'caps lock', 27: 'esc', 32: 'space',
    33: 'page up', 34: 'page down', 35: 'end', 36: 'home',
    37: 'left arrow', 38: 'up arrow', 39: 'right arrow', 40: 'down arrow',
    45: 'insert', 46: 'delete',
    48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
    59: ';', 61: '=',
    96: 'numpad 0', 97: 'numpad 1', 98: 'numpad 2', 99: 'numpad 3', 100: 'numpad 4',
    101: 'numpad 5', 102: 'numpad 6', 103: 'numpad 7', 104: 'numpad 8', 105: 'numpad 9',
    106: 'multiply', 107: 'add', 109: 'subtract', 110: 'decimal point', 111: 'divide',
    112: 'f1', 113: 'f2', 114: 'f3', 115: 'f4', 116: 'f5', 117: 'f6',
    118: 'f7', 119: 'f8', 120: 'f9', 121: 'f10', 122: 'f11', 123: 'f12',
    186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`',
    219: '[', 220: '\\', 221: ']', 222: "'"
  };

  function eventToLabel(e) {
    var code = e.keyCode || e.which;
    if (code >= 65 && code <= 90) return String.fromCharCode(code).toLowerCase(); // a-z
    if (KEYCODE_LABELS[code]) return KEYCODE_LABELS[code];
    if (e.key && e.key.length === 1) return e.key.toLowerCase();
    return (e.key || '').toLowerCase();
  }

  /* --------------- persistence --------------- */
  function loadOverrides() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }
  function saveOverrides(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (_) {}
  }

  /* --------------- build EmulatorJS control object --------------- */
  function buildControls() {
    var overrides = loadOverrides();
    var player0 = {};
    Object.keys(KEY_DEFAULTS).forEach(function (idx) {
      var keyVal = (idx in overrides) ? overrides[idx] : KEY_DEFAULTS[idx];
      player0[idx] = { value: keyVal, value2: GAMEPAD_DEFAULTS[idx] || '' };
    });
    return { 0: player0, 1: {}, 2: {}, 3: {} };
  }

  /* --------------- public API --------------- */
  window.EmberControls = {
    STORAGE_KEY: STORAGE_KEY,
    BUTTONS: BUTTONS,
    KEY_DEFAULTS: KEY_DEFAULTS,
    eventToLabel: eventToLabel,
    loadOverrides: loadOverrides,
    saveOverrides: saveOverrides,
    buildControls: buildControls,

    // current label shown on a keycap for a given button index
    currentLabel: function (idx) {
      var overrides = loadOverrides();
      var v = (idx in overrides) ? overrides[idx] : KEY_DEFAULTS[idx];
      return v || '—';
    },

    // set one binding; returns updated label
    setBinding: function (idx, label) {
      var overrides = loadOverrides();
      overrides[idx] = label;
      saveOverrides(overrides);
      window.EJS_defaultControls = buildControls();
      return label;
    },

    resetAll: function () {
      saveOverrides({});
      window.EJS_defaultControls = buildControls();
    }
  };

  // Make the initial control set available before EmulatorJS boots.
  window.EJS_defaultControls = buildControls();
})();
