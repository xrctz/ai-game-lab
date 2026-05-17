# AI Game Lab

AI Game Lab is a polished browser hub that showcases multiple playable game projects in one place.  
It is designed as a public-facing launchpad for experiments, prototypes, and production-ready game systems created with AI-assisted workflows.

**Live site:** https://xrctz.github.io/ai-game-lab/

## What Viewers See

- A modern single-page game showcase experience
- Embedded play area for supported games
- Quick launch commands for local development
- Story/context section explaining the project vision

## Included Projects

- **CraftVerse Engine** (`voxel`) - Minecraft-style voxel sandbox systems
- **DeadTakeover** (`zombie`) - Open-world zombie survival FPS
- **Mindcraft Control Deck** (`mindcraft`) - Local launcher/orchestration tool (runs separately on localhost)

---

## DeadTakeover v10 — Visual Overhaul (2025-05-17)

The zombie FPS received a complete two-wave visual overhaul. All improvements work through the injectable JS layer — no changes to the minified Vite game bundle (`index-labplus-v9.js`) were required.

### Wave 1 — UI & HUD Redesign

- **Loading Screen** — Animated gradient backdrop with pulsing loader ring and version indicator
- **Main Menu** — Glassmorphism overlay with glow accents, Orbitron display font, gradient CTA button
- **In-Game HUD** — Complete restyle of health bar, ammo counter, kill stats, and wave indicator using the DeadTakeover design system (`--dt-cyan`, `--dt-violet`, `--dt-lime`, etc.)
- **Crosshair** — Redesigned with animated hit confirm flash (red on hit, gold on headshot)
- **Hit Marker** — Upgraded to a crisp animated X marker with CSS-only fade
- **Director Overlay** (`director-v9.js`) — Full rewrite with live canvas FPS graph (60-frame history), 4-stat readout grid (World / Combat / Resources / Streaming), 14 rotating gameplay tips, quality buttons (Low / Balanced / High), compact HUD toggle, photo mode, minimize with `O` key
- **Lab+ Field Guide** (`gameplus-mode.js`) — Complete 4-section field guide (Starter Kit, Survival Loop, Combat Tips, Performance), full 10-weapon arsenal grid with ammo/mag/damage stats, 5 enemy type cards with descriptions, kill feed integration
- **Streaming Diagnostics** (`streaming-mode.js`) — 120-frame timing tracker, hitch counter (>33ms frames), P95 frame time, colored console logging, reset on tab hide
- **Debug Overlay** (`stability-inject.js`) — Glassmorphism redesign with Orbitron headers, color-coded FPS, streaming stats, context loss indicator (toggle with backtick key)
- **Performance Mode** (`performance-mode.js`) — Enhanced console output with quality caps JSON

### Wave 2 — Combat Effects & Visual Juice

- **Floating Damage Numbers** (`visual-effects.js`) — 5 types: normal (white), crit (red), headshot (gold), heal (green), miss (gray). Spawns at crosshair position with CSS keyframe float-up animation. Hard-capped at 20 active numbers for performance
- **Wave Announcement** — Full-screen overlay with scale-in number animation and subtitle text
- **Kill Streak System** — 5 tiers: Killing Spree (3), Rampage (5), Unstoppable (8), Legendary (12), GODLIKE (20). Streak banner with color-coded glow
- **Low Health Vignette** — Two-stage overlay: amber warning at 35% HP, red critical pulse at 15% HP
- **Weapon HUD** — Ammo display parsed from game stats via MutationObserver on `#stats-meta`
- **Crosshair Feedback** — Red flash on hit, gold flash on headshot, integrated with damage number system
- **Screen Shake** — CSS-based: light (150ms) and heavy (300ms) intensity presets
- **Atmospheric Vignette** — Subtle edge darkening for cinematic immersion

### Architecture

All zombie game improvements follow the injectable layer pattern:

```
startup-optimize.js  →  stability-inject.js  →  performance-mode.js  →  streaming-mode.js
→  gameplus-mode.js  →  director-v9.js  →  visual-effects.js  →  index-labplus-v9.js (Vite bundle)
```

The Vite bundle is minified and treated as immutable. New features detect game events by observing HUD DOM elements (`#stats-meta`, `#world-stats`, `#health-fill`) via `MutationObserver` rather than hooking internal game APIs. Performance-sensitive systems use CSS animations over JS-driven loops, with hard caps on active elements (20 damage numbers, 4 kill feed items).

## Local Run

Serve the hub locally:

```bash
chmod +x serve.sh sync-games.sh
./serve.sh
```

Then open: `http://127.0.0.1:8080/`

### Useful Options

- Skip rebuild/sync before serving:
  ```bash
  SKIP_SYNC=1 ./serve.sh
  ```
- Do not auto-open browser:
  ```bash
  NO_OPEN=1 ./serve.sh
  ```

## How Build Sync Works

`sync-games.sh` rebuilds and embeds game outputs into:

- `games/voxel`
- `games/zombie`

This keeps the hub synchronized with your latest local builds from sibling project folders.

## Project Structure

```text
.
├── index.html                # Main landing/showcase page
├── script.js                 # Theme, player controls, session logic
├── styles.css                # Site styling and visual identity
├── serve.sh                  # Local server + optional auto-start/sync
├── sync-games.sh             # Rebuilds and copies game dist outputs
├── games/
│   ├── zombie/               # DeadTakeover — open-world zombie FPS
│   │   ├── index.html        # Game shell (loader, menu, HUD, CSS)
│   │   ├── index-labplus-v9.js   # Vite bundle (immutable, 220KB)
│   │   ├── startup-optimize.js   # Cold-start audio/fetch deferral
│   │   ├── stability-inject.js   # Listener tracking, context-loss, debug overlay
│   │   ├── performance-mode.js   # Adaptive render resolution scaler
│   │   ├── streaming-mode.js     # Frame timing diagnostics
│   │   ├── gameplus-mode.js      # Lab+ overlay, field guide, weapon data
│   │   ├── director-v9.js        # Director HUD, FPS graph, tips, controls
│   │   ├── visual-effects.js     # Combat VFX: damage numbers, streaks, vignette
│   │   └── assets/               # 3D models, textures, audio
│   ├── voxel/                # CraftVerse Engine — voxel sandbox
│   └── mindcraft/            # Mindcraft Control Deck assets
├── play/                     # Play route assets/content
├── showcase/                 # Showcase route assets/content
└── story/                    # Narrative/about route assets/content
```

## Publishing Notes

- This repository currently stores built/static assets directly for fast deploys.
- Mindcraft is a local app (`127.0.0.1:43110`) and cannot be universally embedded on hosted HTTPS pages.
- The zombie game uses 7 injectable JS files loaded before the Vite bundle — these are the only files that should be edited for game-level improvements.

## Roadmap Ideas

- Add screenshots/GIF previews in the README
- Add automated checks for broken local links and embed health
- Add audio feedback for kill streaks and damage numbers
- Extend visual effects to voxel game (CraftVerse)
- Add weapon inspection / ADS animation layer

## License

No open-source license file is currently defined.  
If you plan to open-source this repo, add a license (for example MIT) and clarify third-party asset usage.
