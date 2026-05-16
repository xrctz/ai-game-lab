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

## Deep startup fix pass

This pass targets the short lag spike that still happened right after opening/starting the zombie game.

Changes made:

- Removed eager loading of the 9.9 MB AK47 GLB, 8.8 MB shotgun GLB, and pistol GLB during boot. The game now uses its existing lightweight procedural gun models for startup/teammates.
- Replaced the Outbreak City high-detail building bootstrap with lightweight procedural instanced building templates so selecting that map does not block on GLB decoding.
- Kept real-time shadows disabled instead of re-enabling them on Start. This removes a major first-gameplay GPU spike.
- Reduced the initial chunk-building burst from 20 chunks to 8 chunks on normal maps and from 10 chunks to 6 chunks in Outbreak City.
- Reduced active chunk radius from 4 to 3 on normal maps and from 3 to 2 in Outbreak City to reduce startup draw calls.
- Shortened shader prewarm timeout from 2500ms to 900ms so Start does not stall as long.
- Lowered weather particle count and texture anisotropy.
- Downscaled/recompressed zombie textures in `games/zombie/assets` to reduce browser image decode time and GPU upload memory.
- Bumped the service-worker cache names again so GitHub Pages fetches the new files.

Notes:

- This intentionally prioritizes smooth startup over maximum visual detail. The gameplay systems, controls, save data, UI, maps, and weapons are left intact.
- If a browser still feels choppy after uploading, hard-refresh once or unregister the old service worker because GitHub Pages may keep the older cached game bundle.
