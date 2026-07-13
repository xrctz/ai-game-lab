# CraftVerse / Cubeworld — Voxel Sandbox

Browser-based Minecraft-style voxel sandbox built with Three.js (Vite bundle).

## Architecture

| Path | Role | Editable? |
|------|------|-----------|
| `index.html` | Entry: title screen, HUD DOM, `#app` canvas mount | ✅ (add tags only) |
| `assets/index-BpRqJl-U.js` | Minified Vite bundle — game engine | ❌ immutable |
| `assets/index-dMGAU-yX.css` | Minified bundle CSS | ❌ immutable |
| `textures/` | Block atlas + effects | ✅ (keep ATTRIBUTION.txt) |
| `craftverse-lab.js` | Inject layer: embed, pointer-lock UX | ✅ |
| `craftverse-lab.css` | Inject layer: embed styles | ✅ |

## Inject Layer (craftverse-lab.*)

**Do NOT edit the bundle.** All enhancements go through the inject layer.

### Features
- **Embed detection**: `?embed=1` or `window !== window.top` → adds `body.cv-embedded`
- **Click-to-play overlay**: shown in embed until user clicks (triggers pointer lock)
- **Pointer-lock error handling**: friendly message + "open full screen" link
- **Mobile banner**: "desktop recommended" notice
- **Render distance hint**: lower default in embed (localStorage, non-destructive)
- **Session stats overlay** (v4): `F3` toggles time-played + FPS readout.
  FPS counts unique rAF timestamps via a `requestAnimationFrame` wrapper;
  play time accrues only while in-world and the tab is visible.
- **Screenshot** (v4): `F2` captures the game canvas via `toBlob` and
  downloads `craftverse-<timestamp>.png`. Capture runs inside the frame
  hook right after the bundle renders (the WebGL context has no
  `preserveDrawingBuffer`), with a direct-capture fallback if the render
  loop is idle. Feedback via toast.
- **Controls cheatsheet** (v4): `H` toggles a key-bindings panel.
  All lab hotkeys are ignored while chat/inputs are focused.

### ID Prefix Convention
All inject IDs use `cv-lab-` prefix to avoid collisions with the bundle's IDs:
- `#cv-lab-click-overlay`
- `#cv-lab-lock-msg`
- `#cv-lab-mobile-banner`
- `#cv-lab-brand`
- `#cv-lab-stats`
- `#cv-lab-cheatsheet`
- `#cv-lab-toast`

### Bundle DOM IDs (DO NOT duplicate)
`#app`, `#title-screen`, `#title-main`, `#title-worlds`, `#title-new-world`,
`#pause-screen`, `#settings-screen`, `#death-screen`, `#hud`, `#crosshair`,
`#overlay`, `#hotbar`, `#inventory`, `#crafting`, `#chat`, `#chat-input`,
`#health-bar`, `#hunger-bar`, `#xp-bar`, `#furnace-panel`, `#bow-charge`,
`#bow-charge-fill`, `#underwater-overlay`, `#air-bar`, `#damage-vignette`,
`#hit-marker`, `#toast-container`

## Hub Integration

Loaded via `/ai-game-lab/play/?game=voxel` → iframe → this `index.html`.
