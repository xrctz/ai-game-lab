# AI Game Lab

## Cursor Cloud specific instructions

This repository is a **pure static website** (HTML/CSS/JS) — the "AI Game Lab" hub — served by Python's `http.server`. There is **no root `package.json`, no bundler, and no build step for the hub itself**. The browser game bundles under `games/` are pre-built and committed to the repo. No dependency installation is required; `python3` and `node` are already available.

### Running the dev server

Use the provided script (see `serve.sh` and the README "Quick start" section):

```bash
SKIP_SYNC=1 NO_OPEN=1 ./serve.sh
```

- `SKIP_SYNC=1` is **important in this environment**: without it, `serve.sh` invokes `sync-games.sh`, which rebuilds the voxel/zombie games from **sibling repositories** (`../Cursor Minecraft Clone Game`, `../Zombie Open World Game`) that are **not present here**. The sync step then errors out (though `serve.sh` catches it and continues). Since `games/` is already built and committed, skip the sync.
- `NO_OPEN=1` disables the `xdg-open` auto-launch (no GUI auto-open needed for headless runs).
- The site is served under the GitHub Pages base path `/ai-game-lab/`; the root `/` issues a 302 redirect there. Open `http://127.0.0.1:8080/ai-game-lab/`.
- Env overrides: `PORT` (default `8080`), `HOST` (default `127.0.0.1`; use `HOST=0.0.0.0` to expose), plus the `SKIP_SYNC`/`NO_OPEN` flags above.
- The embedded game player lives at `/ai-game-lab/play/?game=<id>` (e.g. `zombie`, `deadzone`, `voxel`, `racing`, `fnaf`, `pokemon`). Game IDs and embed URLs are defined in `player-urls.js`.

### Tests / checks

There is no lint config and no formal test framework. The `scripts/verify-*.mjs` files are Node scripts (Node built-ins only, no deps) that gate specific past changes:

- `node scripts/verify-deploy-fix.mjs` — **currently passes**; runs static + runtime + local-HTTP/browser checks against the shipped code.
- `node scripts/verify-overhaul.mjs` — a **historical** gating script pinned to an old build id (`21-neat`). It fails against the current build (`config.js` `BUILD` is `25-motion`); this is expected and **not** a regression.

### Deploy

Pushes to `main` publish to GitHub Pages via `.github/workflows/deploy-pages.yml`, which assembles `_site/` from the hub shell and section folders. There is no separate build; the workflow just copies files.
