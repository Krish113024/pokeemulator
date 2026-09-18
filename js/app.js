/* ==========================================================================
   app.js — EmberBoy frontend glue.
   Boots the vendored mGBA WASM core (runs fully offline, no CDN), loads a GBA
   ROM (bundled / file-picker / drag-drop), and wires the custom toolbar,
   input driver, and live-remappable controls.
   ========================================================================== */

(function () {
  'use strict';

  var EC = window.EmberControls;
  var BUNDLED_ROM = 'roms/Pokemon - FireRed Version (USA).gba';

  var el = {
    landing:   document.getElementById('landing'),
    device:    document.getElementById('device'),
    dropzone:  document.getElementById('dropzone'),
    pick:      document.getElementById('btn-pick'),
    fileInput: document.getElementById('file-input'),
    autoHint:  document.getElementById('autoload-hint'),
    gameMount: document.getElementById('game'),
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

  var Module = null;        // the mGBA emulator module
  var booted = false;
  var codeMap = EC.codeToButton();   // { KeyboardEvent.code : 'A'|'B'|... }
  var QUICK_SLOT = 1;

  /* ============================ CORE BOOT ============================ */

  function setBoot(t) { if (el.bootText) el.bootText.textContent = t; }
  function hideBoot() { if (el.boot) el.boot.classList.add('hidden'); }

  async function fetchAsFile(url, name) {
    var resp = await fetch(encodeURI(url));
    if (!resp.ok) throw new Error('ROM fetch failed: ' + resp.status);
    var buf = await resp.arrayBuffer();
    return new File([buf], name, { type: 'application/octet-stream' });
  }

  async function boot(romFile, displayName) {
    if (booted) return;
    booted = true;

    el.landing.hidden = true;
    el.device.hidden = false;
    el.statusRom.textContent = displayName || 'Game loaded';

    if (!self.crossOriginIsolated) {
      setBoot('⚠ This page is not cross-origin isolated. Serve it with COOP/COEP ' +
              'headers (use the included serve.py). See the README.');
      return;
    }

    try {
      setBoot('Loading mGBA core…');
      var canvas = document.createElement('canvas');
      canvas.id = 'mgba-canvas';
      canvas.width = 240; canvas.height = 160;
      el.gameMount.appendChild(canvas);

      var mod = await import('./vendor/mgba/mgba.js');
      var mGBA = mod.default;
      Module = await mGBA({ canvas: canvas });
      window.EmberModule = Module;   // handy for debugging

      setBoot('Preparing filesystem…');
      await Module.FSInit();

      setBoot('Loading ROM…');
      // Use a simple FS filename (avoids spaces/parentheses in the VFS path).
      var fsFile = new File([await romFile.arrayBuffer()], 'game.gba');
      await new Promise(function (res) { Module.uploadRom(fsFile, res); });

      var gamePath = Module.filePaths().gamePath;
      var ok = Module.loadGame(gamePath + '/game.gba');
      if (!ok) { setBoot('⚠ Failed to load the ROM.'); return; }

      Module.setVolume(1.0);
      Module.toggleInput(false);   // we drive input ourselves for custom remapping
      startInput();
      hideBoot();
      enableGameButtons();
    } catch (err) {
      console.error(err);
      setBoot('⚠ Core failed to start: ' + (err && err.message ? err.message : err));
    }
  }

  function loadPickedFile(file) {
    if (!file) return;
    var name = file.name.replace(/\.(gba|gbc|gb|zip)$/i, '');
    boot(file, name);
  }

  function tryAutoload() {
    if (sessionStorage.getItem('emberboy.skipAutoload')) {
      el.autoHint.textContent = 'Choose your .gba file to begin.';
      return;
    }
    fetch(encodeURI(BUNDLED_ROM), { method: 'HEAD' })
      .then(function (r) {
        if (r.ok) {
          el.autoHint.textContent = 'Bundled ROM found — launching…';
          return fetchAsFile(BUNDLED_ROM, 'Pokemon FireRed.gba')
            .then(function (f) { boot(f, 'Pokémon FireRed'); });
        }
        el.autoHint.textContent = 'No bundled ROM — choose your .gba file to begin.';
      })
      .catch(function () { el.autoHint.textContent = 'Choose your .gba file to begin.'; });
  }

  /* ============================ INPUT DRIVER ============================ */

  function resumeAudio() {
    try {
      var ctx = Module && Module.SDL2 && Module.SDL2.audioContext;
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (_) {}
  }

  function onKeyDown(e) {
    if (!Module || !el.modal.hidden || listeningIdx !== null) return; // ignore while remapping
    var btn = codeMap[e.code];
    if (btn) { e.preventDefault(); resumeAudio(); Module.buttonPress(btn); }
  }
  function onKeyUp(e) {
    if (!Module) return;
    var btn = codeMap[e.code];
    if (btn) { e.preventDefault(); Module.buttonUnpress(btn); }
  }
  function startInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }
  function refreshCodeMap() { codeMap = EC.codeToButton(); }

  /* ============================ TOOLBAR ============================ */
  function enableGameButtons() {
    [el.btnSave, el.btnLoadSt, el.btnReset, el.btnFs].forEach(function (b) { b.disabled = false; });
  }
  function flash(btn, msg) {
    var s = btn.querySelector('span'); if (!s) return;
    var old = s.textContent; s.textContent = msg;
    setTimeout(function () { s.textContent = old; }, 900);
  }

  function quickSave() {
    if (!Module) return;
    try {
      var ok = Module.saveState(QUICK_SLOT);
      if (Module.FSSync) Module.FSSync();
      flash(el.btnSave, ok ? 'Saved' : 'Failed');
    } catch (err) { console.warn(err); }
  }
  function quickLoad() {
    if (!Module) return;
    try { var ok = Module.loadState(QUICK_SLOT); flash(el.btnLoadSt, ok ? 'Loaded' : 'No state'); }
    catch (err) { console.warn(err); }
  }
  function resetGame() {
    if (!Module) return;
    try { Module.quickReload(); } catch (err) { console.warn(err); }
  }
  function toggleFullscreen() {
    var t = el.device;
    if (!document.fullscreenElement) { if (t.requestFullscreen) t.requestFullscreen(); }
    else { document.exitFullscreen(); }
  }

  /* ============================ CONTROLS MODAL ============================ */
  var listeningIdx = null;

  function refreshKeycaps() {
    el.modal.querySelectorAll('.keycap[data-cap]').forEach(function (cap) {
      cap.textContent = EC.currentLabel(cap.getAttribute('data-cap'));
      cap.classList.remove('listening');
    });
  }
  function openModal() { refreshKeycaps(); el.modal.hidden = false; }
  function closeModal() { stopListening(); el.modal.hidden = true; }

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
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') { refreshKeycaps(); stopListening(); return; }
    EC.setBinding(listeningIdx, e.code);
    refreshCodeMap();
    refreshKeycaps();
    stopListening();
  }

  /* ============================ EVENTS ============================ */
  function wire() {
    el.pick.addEventListener('click', function () { el.fileInput.click(); });
    el.dropzone.addEventListener('click', function (ev) {
      if (ev.target.id !== 'btn-pick') el.fileInput.click();
    });
    el.fileInput.addEventListener('change', function () { loadPickedFile(this.files[0]); });

    ['dragenter', 'dragover'].forEach(function (t) {
      el.dropzone.addEventListener(t, function (e) { e.preventDefault(); el.dropzone.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.dropzone.addEventListener(t, function (e) { e.preventDefault(); el.dropzone.classList.remove('drag'); });
    });
    el.dropzone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) loadPickedFile(e.dataTransfer.files[0]);
    });

    el.btnLoad.addEventListener('click', function () {
      if (!booted) { el.fileInput.click(); return; }
      sessionStorage.setItem('emberboy.skipAutoload', '1');
      location.reload();
    });
    el.btnCtrl.addEventListener('click', openModal);
    el.btnSave.addEventListener('click', quickSave);
    el.btnLoadSt.addEventListener('click', quickLoad);
    el.btnReset.addEventListener('click', resetGame);
    el.btnFs.addEventListener('click', toggleFullscreen);

    el.modal.querySelectorAll('[data-close]').forEach(function (n) { n.addEventListener('click', closeModal); });
    el.modal.querySelectorAll('.keycap[data-cap]').forEach(function (cap) {
      cap.addEventListener('click', function () { startListening(cap); });
    });
    el.resetCtrl.addEventListener('click', function () { EC.resetAll(); refreshCodeMap(); refreshKeycaps(); });

    document.addEventListener('keydown', onCaptureKey, true);
    document.addEventListener('keydown', function (e) {
      if (listeningIdx !== null) return;
      if (e.key === '?') openModal();
      if (e.key === 'Escape' && !el.modal.hidden) closeModal();
    });
  }

  document.addEventListener('DOMContentLoaded', function () { wire(); tryAutoload(); });
})();
