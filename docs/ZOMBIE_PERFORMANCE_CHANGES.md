# Zombie Game Performance Fixes

This upload keeps the existing site structure, but improves the embedded zombie game performance.

## Changed

- Added `games/zombie/performance-mode.js` for automatic render-scale tuning.
- Patched `games/zombie/index.html` to load the performance mode before the game bundle.
- Patched the zombie game bundle to expose its renderer safely and start at a lower default render scale.
- Replaced the stability helper with a lighter version that keeps cleanup and the debug overlay without wrapping every animation frame.
- Optimized the largest zombie-game texture files in place while keeping the same filenames.
- Recompressed zombie-game music files in place to reduce download size.
- Bumped the service worker cache names so GitHub Pages users receive the new files instead of stale cached assets.

## Notes

- The `.git` folder and local server logs are intentionally not included in this archive. The folder is meant for clean GitHub upload.
- To force the lightest mode, open the game with `?quality=low`. Supported modes are `low`, `balanced`, and `high`.
- Press the backtick key while the game is open to show the lightweight performance overlay.

## Streaming stutter fix pass v6

This pass targets the remaining hitching while distant terrain/objects stream in during gameplay.

Main fixes:

- Changed terrain chunks from 24x24 subdivisions to 8x8 subdivisions, cutting CPU terrain deformation per chunk dramatically.
- Reduced active stream radius to 3 chunks on normal maps and 2 chunks in Outbreak City.
- Replaced burst chunk building with frame-aware chunk streaming: the game now builds at most one chunk at a time and skips chunk building after slow frames.
- Lowered initial chunk queue sizes so Start does not create a huge backlog.
- Reduced per-chunk tree and structure density.
- Disabled Outbreak City prop scatter during streaming; this avoids background GLB/model loads while moving.
- Kept lightweight procedural Outbreak City buildings instead of high-detail building GLBs.
- Kept cosmetic weapon GLB startup loading disabled; procedural weapon models are used instead.
- Kept real-time shadow maps disabled permanently to avoid periodic shadow refresh spikes.
- Reduced weather particles and texture anisotropy.
- Added `games/zombie/streaming-mode.js` for a small diagnostic hook: open the console and run `window.__zombieGetStreamingStats()` to see pending chunk work.
- Added a new cache-busting zombie bundle name: `assets/index-streamfix-v6.js`.
- Bumped service-worker cache names to `v6-streamfix`.

Why this was still stuttering on high-end hardware:

The browser was not simply running out of GPU power. The stutter came from synchronous JavaScript work on the main thread: terrain mesh generation, object/collider creation, and model/texture upload scheduling. A fast GPU cannot render frames while the main JS thread is blocked, so the fix is to reduce and throttle streaming work rather than only lowering graphics quality.
