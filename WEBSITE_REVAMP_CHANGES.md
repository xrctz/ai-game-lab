# AI Game Lab Website Revamp v7

This pass focuses on the public-facing website shell, not the internal game code.

## Website improvements

- Rebuilt the landing page into a unique launch-deck style layout.
- Added a stronger hero section, status console, featured cards, and build-flow sections.
- Reworked Showcase into a cleaner project catalog with filters and real launch links.
- Reworked Play into a proper game player with a side boot menu.
- Reworked Story into a branded project timeline instead of plain article text.
- Rebuilt the 404 page so broken paths still feel like part of the site.
- Replaced the Mindcraft redirect with an actual setup/info page.

## Game-loading safety fixes

- Preserved the existing zombie game path: `games/zombie/index.html`.
- Corrected CraftVerse loading to the actual included path: `games/voxel/index.html`.
- Stopped the hub from trying to iframe a missing `games/mindcraft/index.html` folder.
- Mindcraft now opens a hosted setup panel because it is a local Java/Node tool.
- The site pauses background particles while a game iframe is active.
- Iframe permissions now include fullscreen, gamepad, and pointer lock.

## Cache/deploy fixes

- Bumped website CSS/JS references to `?v=7`.
- Bumped the service worker cache names to `ai-game-lab-hub-v7-revamp` and `ai-game-lab-games-v7-revamp`.
- Updated the GitHub Pages workflow so root files like `sw.js`, `manifest.json`, `404.html`, and icons are copied into `_site`.
