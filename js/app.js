/* ==========================================================================
   app.js — EmberBoy frontend glue.
   Loads a GBA ROM (file picker / drag-drop / bundled roms/ folder), boots the
   EmulatorJS mGBA core, and wires up the custom toolbar + controls modal.
   ========================================================================== */

(function () {
  'use strict';

  var EC = window.EmberControls;

  // Where EmulatorJS pulls its core/data from (runs in the *user's* browser).
  var EJS_DATA = 'https://cdn.emulatorjs.org/stable/data/';

  // A ROM you can drop in locally so the app "just works" (git-ignored).
  var BUNDLED_ROM = 'roms/Pokemon - FireRed Version (USA).gba';

  var el = {
    landing:   document.getElementById('landing'),
    device:    document.getElementById('device'),
    dropzone:  document.getElementById('dropzone'),
    pick:      document.getElementById('btn-pick'),
    fileInput: document.getElementById('file-input'),
    autoHint:  document.getElementById('autoload-hint'),
    boot:      document.getElementById('boot-overlay'),
    bootText:  document.getElementById('boot-text'),
    statusRom: document.getElementById('status-rom'),

    btnLoad:   document.getElementById('btn-load'),
    btnCtrl:   document.getElementById('btn-controls'),
    btnSave:   document.getElementById('btn-save'),
    btnLoadSt: document.getElementById('btn-loadstate'),
    btnReset:  document.getElementById('btn-reset'),
    btnFs:     document.getElementById('btn-fs'),

    modal:     document.getElementById('controls-modal'),
    resetCtrl: document.getElementById('btn-reset-controls'),
    toast:     document.getElementById('capture-toast')
  };

  var booted = false;
  var quickSlot = null;         // in-memory quick-save state

  /* ============================ ROM LOADING ============================ */

  function startEmulator(romUrl, romName) {
    if (booted) return;
    booted = true;

    el.landing.hidden = true;
    el.device.hidden = false;
    el.statusRom.textContent = romName || 'Game loaded';
    setBootText('Downloading core…');

    // EmulatorJS configuration globals.
    window.EJS_player       = '#game';
    window.EJS_core         = 'gba';
    window.EJS_pathtodata   = EJS_DATA;
    window.EJS_gameUrl      = romUrl;
    window.EJS_gameName     = romName || 'Pokemon FireRed';
    window.EJS_gameID       = 1;                 // stable id -> SRAM persists
    window.EJS_color        = '#ff5a3c';
    window.EJS_startOnLoaded = true;
    window.EJS_backgroundColor = '#05060a';
    window.EJS_defaultControls = EC.buildControls();
    // Keep EmulatorJS's own menu available (extra save slots, shaders, gamepad map).
    window.EJS_Buttons = { restart: true, settings: true, saveState: true, loadState: true };

    window.EJS_ready = function () { setBootText('Starting mGBA…'); };
    window.EJS_onGameStart = function () {
      hideBoot();
      enableGameButtons();
    };

    var s = document.createElement('script');
    s.src = EJS_DATA + 'loader.js';
    s.onerror = function () {
      setBootText('⚠ Could not reach the EmulatorJS CDN. Check your internet connection and reload.');
    };
    document.body.appendChild(s);
  }

  function loadFile(file) {
    if (!file) return;
    var name = file.name.replace(/\.(gba|gbc|gb|zip)$/i, '');
    var url = URL.createObjectURL(file);
    startEmulator(url, name);
  }

  // Try the bundled ROM; fall back to the picker if it isn't there.
  function tryAutoload() {
    if (sessionStorage.getItem('emberboy.skipAutoload')) {
      el.autoHint.textContent = 'Choose your .gba file to begin.';
      return;
    }
    fetch(encodeURI(BUNDLED_ROM), { method: 'HEAD' })
      .then(function (r) {
        if (r.ok) {
          el.autoHint.textContent = 'Bundled ROM found — launching…';
          startEmulator(encodeURI(BUNDLED_ROM), 'Pokémon FireRed');
        } else {
          el.autoHint.textContent = 'No bundled ROM — choose your .gba file to begin.';
        }
      })
      .catch(function () {
        el.autoHint.textContent = 'No bundled ROM — choose your .gba file to begin.';
      });
  }

  /* ============================ BOOT OVERLAY ============================ */
  function setBootText(t) { if (el.bootText) el.bootText.textContent = t; }
  function hideBoot() { if (el.boot) el.boot.classList.add('hidden'); }

  /* ============================ TOOLBAR ============================ */
  function enableGameButtons() {
    [el.btnSave, el.btnLoadSt, el.btnReset, el.btnFs].forEach(function (b) { b.disabled = false; });
  }

  function emu() { return window.EJS_emulator || null; }
  function mgr() { var e = emu(); return e && e.gameManager ? e.gameManager : null; }

  function quickSave() {
    var m = mgr();
    if (!m) return;
    try {
      var data = m.saveState ? m.saveState() : (m.getState ? m.getState() : null);
      if (data && data.then) { data.then(function (d) { quickSlot = d; flash(el.btnSave, 'Saved'); }); }
      else if (data) { quickSlot = data; flash(el.btnSave, 'Saved'); }
    } catch (err) { console.warn('saveState failed', err); }
  }

  function quickLoad() {
    var m = mgr();
    if (!m || !quickSlot) { flash(el.btnLoadSt, 'No state'); return; }
    try { m.loadState(quickSlot); flash(el.btnLoadSt, 'Loaded'); }
    catch (err) { console.warn('loadState failed', err); }
  }

  function resetGame() {
    var m = mgr();
    try { if (m && m.restart) m.restart(); } catch (err) { console.warn(err); }
  }

  function toggleFullscreen() {
    var e = emu();
    if (e && typeof e.toggleFullscreen === 'function') { e.toggleFullscreen(true); return; }
    var target = el.device;
    if (!document.fullscreenElement) { (target.requestFullscreen || function(){})?.call(target); }
    else { document.exitFullscreen(); }
  }

  function flash(btn, msg) {
    var span = btn.querySelector('span'); if (!span) return;
    var old = span.textContent; span.textContent = msg;
    setTimeout(function () { span.textContent = old; }, 900);
  }

  /* ============================ CONTROLS MODAL ============================ */
  var listeningIdx = null;

  function refreshKeycaps() {
    var caps = el.modal.querySelectorAll('.keycap[data-cap]');
    caps.forEach(function (cap) {
      var idx = cap.getAttribute('data-cap');
      cap.textContent = EC.currentLabel(idx);
      cap.classList.remove('listening');
    });
  }

  function openModal() {
    refreshKeycaps();
    el.modal.hidden = false;
  }
  function closeModal() {
    stopListening();
    el.modal.hidden = true;
  }

  function startListening(cap) {
    stopListening();
    listeningIdx = cap.getAttribute('data-cap');
    cap.classList.add('listening');
    cap.textContent = '…';
    el.toast.hidden = false;
  }
  function stopListening() {
    listeningIdx = null;
    el.toast.hidden = true;
    var l = el.modal.querySelector('.keycap.listening');
    if (l) l.classList.remove('listening');
  }

  function onCaptureKey(e) {
    if (listeningIdx === null) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { refreshKeycaps(); stopListening(); return; }
    var label = EC.eventToLabel(e);
    EC.setBinding(listeningIdx, label);
    // Re-apply to a running emulator so remaps take effect live.
    applyLiveControls();
    refreshKeycaps();
    stopListening();
  }

  // Push the current bindings into a live EmulatorJS instance if possible.
  function applyLiveControls() {
    var e = emu();
    window.EJS_defaultControls = EC.buildControls();
    if (!e) return;
    try {
      // EmulatorJS keeps its live map on e.controls; merge and re-apply.
      if (e.controls && e.controls[0]) {
        var p0 = window.EJS_defaultControls[0];
        Object.keys(p0).forEach(function (idx) {
          e.controls[0][idx] = e.controls[0][idx] || {};
          e.controls[0][idx].value = p0[idx].value;
          if (p0[idx].value2) e.controls[0][idx].value2 = p0[idx].value2;
        });
        if (typeof e.checkGamepadInputs === 'function') { /* no-op, keeps ref */ }
        if (typeof e.setupKeys === 'function') e.setupKeys();
      }
    } catch (err) { /* fall back: takes effect on reload */ }
  }

  /* ============================ EVENTS ============================ */
  function wire() {
    // Landing: pick / drop
    el.pick.addEventListener('click', function () { el.fileInput.click(); });
    el.dropzone.addEventListener('click', function (ev) {
      if (ev.target.id !== 'btn-pick') el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () { loadFile(this.files[0]); });

    ['dragenter', 'dragover'].forEach(function (t) {
      el.dropzone.addEventListener(t, function (e) { e.preventDefault(); el.dropzone.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.dropzone.addEventListener(t, function (e) { e.preventDefault(); el.dropzone.classList.remove('drag'); });
    });
    el.dropzone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });

    // Toolbar
    el.btnLoad.addEventListener('click', function () {
      if (!booted) { el.fileInput.click(); return; }
      // Already playing: go back to the picker.
      sessionStorage.setItem('emberboy.skipAutoload', '1');
      location.reload();
    });
    el.btnCtrl.addEventListener('click', openModal);
    el.btnSave.addEventListener('click', quickSave);
    el.btnLoadSt.addEventListener('click', quickLoad);
    el.btnReset.addEventListener('click', resetGame);
    el.btnFs.addEventListener('click', toggleFullscreen);

    // Modal
    el.modal.querySelectorAll('[data-close]').forEach(function (n) {
      n.addEventListener('click', closeModal);
    });
    el.modal.querySelectorAll('.keycap[data-cap]').forEach(function (cap) {
      cap.addEventListener('click', function () { startListening(cap); });
    });
    el.resetCtrl.addEventListener('click', function () {
      EC.resetAll(); applyLiveControls(); refreshKeycaps();
    });
    document.addEventListener('keydown', onCaptureKey, true);

    // Global shortcut: ? opens the control map
    document.addEventListener('keydown', function (e) {
      if (listeningIdx !== null) return;
      if (e.key === '?' ) { openModal(); }
      if (e.key === 'Escape' && !el.modal.hidden) closeModal();
    });
  }

  /* ============================ INIT ============================ */
  document.addEventListener('DOMContentLoaded', function () {
    wire();
    tryAutoload();
  });
})();
