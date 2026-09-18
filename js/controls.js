/* ==========================================================================
   controls.js — customizable control bindings for EmberBoy.

   The emulator input is driven directly by app.js: each GBA button is bound to
   a physical keyboard code (KeyboardEvent.code, e.g. "KeyX", "ArrowUp",
   "Enter", "ShiftRight"). Bindings persist in localStorage and can be remapped
   live from the Controls panel.

   Button ids match the modal's data-btn attributes and the mGBA button names:
     0:B  2:SELECT  3:START  4:UP  5:DOWN  6:LEFT  7:RIGHT  8:A  10:L  11:R
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'emberboy.controls.v2';

  // Button id -> mGBA button name (passed to buttonPress/buttonUnpress).
  var GBA_NAME = {
    0: 'B', 2: 'Select', 3: 'Start', 4: 'Up', 5: 'Down',
    6: 'Left', 7: 'Right', 8: 'A', 10: 'L', 11: 'R'
  };

  // Default physical-key bindings (KeyboardEvent.code).
  var KEY_DEFAULTS = {
    8:  'KeyX',        // A
    0:  'KeyZ',        // B
    10: 'KeyA',        // L
    11: 'KeyS',        // R
    3:  'Enter',       // START
    2:  'ShiftRight',  // SELECT
    4:  'ArrowUp',
    5:  'ArrowDown',
    6:  'ArrowLeft',
    7:  'ArrowRight'
  };

  // Pretty labels for KeyboardEvent.code values shown on the keycaps.
  function prettyCode(code) {
    if (!code) return '—';
    if (/^Key[A-Z]$/.test(code))   return code.slice(3);          // KeyX -> X
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);          // Digit1 -> 1
    if (/^Numpad/.test(code))      return 'Num ' + code.slice(6);
    if (/^Arrow/.test(code))       return code.slice(5) + ' Arr'; // ArrowUp -> Up Arr
    var map = {
      Enter: 'Enter', Space: 'Space', Tab: 'Tab', Escape: 'Esc',
      Backspace: 'Bksp', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift',
      ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt',
      AltRight: 'R-Alt', Backquote: '`', Minus: '-', Equal: '=',
      BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'",
      Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps'
    };
    return map[code] || code;
  }

  function loadOverrides() {
    try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; }
    catch (_) { return {}; }
  }
  function saveOverrides(m) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch (_) {}
  }

  // Build a { KeyboardEvent.code : mGBA button name } lookup for the input loop.
  function codeToButton() {
    var overrides = loadOverrides();
    var out = {};
    Object.keys(GBA_NAME).forEach(function (idx) {
      var code = (idx in overrides) ? overrides[idx] : KEY_DEFAULTS[idx];
      if (code) out[code] = GBA_NAME[idx];
    });
    return out;
  }

  window.EmberControls = {
    STORAGE_KEY: STORAGE_KEY,
    GBA_NAME: GBA_NAME,
    KEY_DEFAULTS: KEY_DEFAULTS,
    prettyCode: prettyCode,
    loadOverrides: loadOverrides,
    saveOverrides: saveOverrides,
    codeToButton: codeToButton,

    // current code bound to a button id
    currentCode: function (idx) {
      var o = loadOverrides();
      return (idx in o) ? o[idx] : KEY_DEFAULTS[idx];
    },
    currentLabel: function (idx) {
      return prettyCode(this.currentCode(idx));
    },
    setBinding: function (idx, code) {
      var o = loadOverrides();
      o[idx] = code;
      saveOverrides(o);
      return prettyCode(code);
    },
    resetAll: function () { saveOverrides({}); }
  };
})();
