# EmberBoy — Pokémon FireRed Web Emulator

A polished, web-based **Game Boy Advance** emulator built to play **Pokémon FireRed**
(and any other `.gba` game) right in your browser — with fully customizable controls
and a custom GBA/FireRed-themed UI.

![Core: mGBA via EmulatorJS](https://img.shields.io/badge/core-mGBA%20(EmulatorJS)-ff5a3c)

## Why this design

Pokémon FireRed is a **Game Boy Advance** title (ARM7TDMI CPU) — a far more complex
machine than the original Game Boy. Rather than ship a fragile hand-rolled emulator,
EmberBoy wraps the battle-tested **mGBA** core (via [EmulatorJS](https://emulatorjs.org))
in a completely custom, hand-designed frontend. You get reliable, accurate emulation
plus a UI and control system built from scratch.

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

Because the app fetches a ROM file, serve it over HTTP (opening `index.html` directly
via `file://` blocks `fetch`). Any static server works:

```bash
cd pokeemulator
python3 -m http.server 8000
# then open http://localhost:8000
```

**Pokémon FireRed is preloaded** — the site launches straight into the game, no file
picking required. Want to play something else? Click **Load ROM** in the toolbar to
drag-and-drop or choose any other `.gba` file.

> On first launch the mGBA core (~a few MB) is downloaded from the EmulatorJS CDN and
> cached by your browser. An internet connection is needed the first time.

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
index.html         Custom UI shell
css/style.css       Theme + layout
js/controls.js      Key-label mapping, defaults, remap persistence
js/app.js           ROM loading, EmulatorJS boot, toolbar + modal wiring
assets/favicon.svg  Pokéball favicon
roms/               Drop your ROM here (git-ignored)
```

## Credits

- Emulation: [EmulatorJS](https://emulatorjs.org) / [mGBA](https://mgba.io)
- Frontend UI & control system: this project.
