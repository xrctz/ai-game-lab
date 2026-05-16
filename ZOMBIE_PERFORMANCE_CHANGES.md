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
