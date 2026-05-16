# AI Game Lab v9 Systems Expansion

This pass improves both the website shell and DeadTakeover without moving the existing game folders.

## Website

- Added `/updates/` release center.
- Added Updates links to top nav, footer, command launcher, service worker shell cache, and GitHub Pages workflow.
- Added v9 systems cards on the homepage.
- Added Play page route health checks for zombie and voxel builds.
- Added last-game memory and a cache refresh button for GitHub Pages testing.
- Bumped cache/query versions from v8 to v9.

## DeadTakeover

- Added `games/zombie/director-v9.js`.
- Added v9 in-game director overlay with live stats, tips, streaming readout, HUD compact/photo controls, and quick quality buttons.
- Created `games/zombie/assets/index-labplus-v9.js`.
- Further reduced distance streaming pressure by cutting active chunk radius and increasing streaming intervals.
- Lowered render caps a little more to protect frame pacing during movement.

## Preserved routes

- `/games/zombie/index.html`
- `/games/voxel/index.html`
- `/play/`
- `/showcase/`
- `/story/`
- `/updates/`
