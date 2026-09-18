# EmberBoy — Pokémon FireRed Web Emulator

A polished, web-based **Game Boy Advance** emulator built to play **Pokémon FireRed**
(and any other `.gba` game) right in your browser — with fully customizable controls
and a custom GBA/FireRed-themed UI.

![Core: mGBA via EmulatorJS](https://img.shields.io/badge/core-mGBA%20(EmulatorJS)-ff5a3c)

## Why this design

Pokémon FireRed is a **Game Boy Advance** title (ARM7TDMI CPU) — a far more complex
machine than the original Game Boy. Rather than ship a fragile hand-rolled emulator,
EmberBoy runs the battle-tested **mGBA** core compiled to WebAssembly
([`@thenick775/mgba-wasm`](https://www.npmjs.com/package/@thenick775/mgba-wasm)),
**vendored locally** so the emulator runs fully offline with no CDN. Around it is a
completely custom, hand-designed frontend: the UI, the input driver, and the
control-remapping system are all built from scratch.

## Features

- 🎮 **Fully customizable controls** — click any button in the **Controls** panel and
  press a key to rebind it. Bindings persist in your browser and apply live.
- 🎯 **Gamepad support** — plug in a controller; sensible defaults are pre-mapped.
- 📱 **Touch controls** — an on-screen gamepad appears automatically on phones/tablets.
- 💾 **Quick save states** — save/restore anywhere with the toolbar.
- 🔋 **Battery saves** — in-game saves (Pokémon's own save) persist automatically.
- 🖥️ **Fullscreen**, reset, and drag-and-drop ROM loading.
- 🎨 Custom FireRed-inspired handheld UI (references: GBA hardware, Delta, mGBA, RetroArch).

## Running it

The mGBA WebAssembly core uses threads, so the page **must be served with
cross-origin isolation** (`COOP: same-origin` + `COEP: require-corp`). A ready-made
server is included:

```bash
cd pokeemulator
python3 serve.py           # defaults to port 8000
# then open http://localhost:8000
```

> A plain `python3 -m http.server` will **not** work — it doesn't send the COOP/COEP
> headers, and the core won't start. Use `serve.py` (or any server configured with
> those headers). No internet connection is required — the core is bundled.

**Pokémon FireRed is preloaded** — the site launches straight into the game, no file
picking required. Want to play something else? Click **Load ROM** in the toolbar to
drag-and-drop or choose any other `.gba` file.

## Deploying to Cloudflare Pages

Cloudflare Pages can send the required COOP/COEP headers via the included `_headers`
file, so the hosted site is cross-origin isolated and the core runs. Everything is
self-hosted (fonts, core, wasm) — no third-party CDN.

**Option A — Git integration (auto-deploys on push):**
1. Push this repo to GitHub (already done for this branch).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**,
   pick this repo/branch.
3. Build settings: **Framework preset = None**, **Build command = _(leave empty)_**,
   **Build output directory = `/`** (the repo root). `wrangler.toml` already declares this.
4. Deploy. Your site will be at `https://<project>.pages.dev`.

**Option B — Wrangler CLI (direct upload):**
```bash
npx wrangler pages deploy .
```

Verify isolation after deploy: open the site, open DevTools console, and run
`crossOriginIsolated` — it should print `true`. If it's `false`, the `_headers` file
isn't being applied and the core won't start.

> **Heads-up on the bundled ROM:** a public Pages site makes `roms/…​.gba` publicly
> downloadable. If you don't want to distribute the ROM, delete the `roms/` game before
> deploying (or point Pages at a branch without it) — the app still works via the
> **Load ROM** file-picker.

## Controls (defaults)

| GBA button | Key          |
|------------|--------------|
| D-Pad      | Arrow keys   |
| A          | `X`          |
| B          | `Z`          |
| L / R      | `A` / `S`    |
| Start      | `Enter`      |
| Select     | `Shift`      |

Press **`?`** anytime to open the control map. All keys are remappable.

## Legal note

Pokémon FireRed is copyrighted by Nintendo / Game Freak / The Pokémon Company. The
bundled ROM in `roms/` is the owner's own personal copy, included here so this private
project launches straight into the game. Any other ROM/save file types remain
git-ignored. Only use ROMs you legally own.

## Project structure

```
index.html            Custom UI shell
css/style.css          Theme + layout
js/controls.js         Physical-key bindings, defaults, remap persistence
js/app.js              ROM loading, mGBA core boot, input driver, toolbar + modal
js/vendor/mgba/        Vendored mGBA WebAssembly core (mgba.js + mgba.wasm)
assets/fonts.css       Self-hosted web fonts (no Google Fonts CDN)
assets/fonts/          Vendored .woff2 font files
assets/favicon.svg     Pokéball favicon
serve.py               Local static server with the required COOP/COEP headers
_headers               COOP/COEP headers for Cloudflare Pages
wrangler.toml          Cloudflare Pages project config (static, no build)
roms/                  The bundled game (other ROMs git-ignored)
```

## Credits

- Emulation core: [mGBA](https://mgba.io) via
  [`@thenick775/mgba-wasm`](https://www.npmjs.com/package/@thenick775/mgba-wasm)
  (part of the [gbajs2](https://github.com/thenick775/gbajs2) project), MPL-2.0.
- Frontend UI, input driver & control system: this project.
