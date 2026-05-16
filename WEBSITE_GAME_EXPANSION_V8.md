# AI Game Lab v8 Expansion

## Website additions

- Added a global command launcher with Ctrl+K.
- Added runtime capability checks for WebGL2, service worker support, motion preferences, and pointer lock.
- Added a floating launcher button for visitors who do not know the keyboard shortcut.
- Added a v8 expansion section to the homepage.
- Added DeadTakeover quality controls to the Play page before booting the iframe.
- Added a v8 update card to the Showcase page.
- Bumped CSS, JS, favicon, and service-worker cache versions to v8.

## Game additions

- Added `games/zombie/gameplus-mode.js` for the DeadTakeover Lab+ overlay.
- Added an in-game field guide toggled with `I`.
- Added an in-game performance snapshot button.
- Added Low/High quality buttons inside the zombie build.
- Added a new bundle `index-labplus-v8.js`.
- Unlocked bonus weapons in the starter weapon list.
- Added starter materials, traps, a turret, extra utility items, and two skill points for faster testing and more fun at the start of runs.

## Safety notes

- The existing `games/zombie/index.html` path is preserved.
- The existing `games/voxel/index.html` path is preserved.
- Mindcraft remains an info/setup page instead of a broken iframe.
- Original v6 zombie bundle remains in the folder as a fallback file, but the page loads the v8 Lab+ bundle.
