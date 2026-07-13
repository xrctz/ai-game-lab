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
- **Accessibility assists**: persistent large/high-contrast crosshair and reduced-motion controls
- **Controls reference**: accessible from title/pause menus or with `H`

### ID Prefix Convention
All inject IDs use `cv-lab-` prefix to avoid collisions with the bundle's IDs:
- `#cv-lab-click-overlay`
- `#cv-lab-lock-msg`
- `#cv-lab-mobile-banner`
- `#cv-lab-brand`
- `#cv-lab-assist-dialog`

### Bundle DOM IDs (DO NOT duplicate)
`#app`, `#title-screen`, `#title-main`, `#title-worlds`, `#title-new-world`,
`#pause-screen`, `#settings-screen`, `#death-screen`, `#hud`, `#crosshair`,
`#overlay`, `#hotbar`, `#inventory`, `#crafting`, `#chat`, `#chat-input`,
`#health-bar`, `#hunger-bar`, `#xp-bar`, `#furnace-panel`, `#bow-charge`,
`#bow-charge-fill`, `#underwater-overlay`, `#air-bar`, `#damage-vignette`,
`#hit-marker`, `#toast-container`

## Hub Integration

Loaded via `/ai-game-lab/play/?game=voxel` → iframe → this `index.html`.
