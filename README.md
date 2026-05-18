<p align="center">
  <img src="https://xrctz.github.io/ai-game-lab/showcase/previews/deadtakeover.png" alt="AI Game Lab — playable browser games" width="720" />
</p>

<h1 align="center">AI Game Lab</h1>

<p align="center">
  A polished public hub for browser-native games, prototypes, and launch workflows built with AI-assisted development.
</p>

<p align="center">
  <a href="https://xrctz.github.io/ai-game-lab/"><strong>Launch site</strong></a>
  &nbsp;·&nbsp;
  <a href="https://xrctz.github.io/ai-game-lab/play/">Play</a>
  &nbsp;·&nbsp;
  <a href="https://xrctz.github.io/ai-game-lab/showcase/">Showcase</a>
  &nbsp;·&nbsp;
  <a href="https://xrctz.github.io/ai-game-lab/showcase/updates/">Updates</a>
</p>

<p align="center">
  <a href="https://xrctz.github.io/ai-game-lab/"><img src="https://img.shields.io/badge/site-live-ff6eb4?style=for-the-badge&logo=githubpages&logoColor=white" alt="Live on GitHub Pages" /></a>
  <a href="https://github.com/xrctz/ai-game-lab/actions"><img src="https://img.shields.io/badge/deploy-GitHub%20Pages-2a1228?style=for-the-badge&logo=github" alt="GitHub Pages deploy" /></a>
  <img src="https://img.shields.io/badge/stack-HTML%20·%20CSS%20·%20JS-ffb7d5?style=for-the-badge" alt="HTML CSS JavaScript" />
</p>

---

## What this is

**AI Game Lab** is the hosted front door for multiple playable projects. Visitors can browse featured builds, read release notes, and launch games in an embedded player without installing anything.

| Project | Route | Description |
| --- | --- | --- |
| **DeadTakeover Protocol** | [`/play/?game=zombie`](https://xrctz.github.io/ai-game-lab/play/?game=zombie) | Open-world zombie survival FPS ([source repo](https://github.com/xrctz/DeadTakeover)) |
| **Dead Zone: Evacuation** | [`/play/?game=deadzone`](https://xrctz.github.io/ai-game-lab/play/?game=deadzone) | Squad tactical FPS with wave survival |
| **CraftVerse Engine** | [`/play/?game=voxel`](https://xrctz.github.io/ai-game-lab/play/?game=voxel) | Voxel sandbox playground |
| **Mindcraft Control Deck** | [Setup notes](https://xrctz.github.io/ai-game-lab/mindcraft-info.html) | Local AI agent launcher (runs on your machine) |

## Features

- **Unified hub** — Home, showcase, play, story, and updates share one design system
- **Embedded player** — Click-to-play overlays, pointer-lock handling, and per-game quality controls
- **Command launcher** — Press `Ctrl+K` to jump between pages and games
- **GitHub Pages ready** — Static deploy with automated workflow on `main`

## Quick start (local)

```bash
git clone https://github.com/xrctz/ai-game-lab.git
cd ai-game-lab
chmod +x serve.sh sync-games.sh   # macOS / Linux
./serve.sh
```

Open **http://127.0.0.1:8080/** (or the URL printed by `serve.sh`).

| Variable | Effect |
| --- | --- |
| `SKIP_SYNC=1 ./serve.sh` | Skip rebuilding sibling game folders |
| `NO_OPEN=1 ./serve.sh` | Do not auto-open the browser |

## Repository layout

```text
ai-game-lab/
├── index.html          # Landing page
├── 404.html            # Custom 404 (needs workflow copy to _site/ — see docs workflow)
├── manifest.json       # PWA manifest duplicate (hub uses showcase/manifest.json on Pages)
├── favicon.svg         # Root favicon (optional once workflow copies it)
├── play/               # Game player shell
├── showcase/           # Project catalog & previews
│   ├── manifest.json   # PWA manifest served on GitHub Pages (linked from all hub pages)
│   └── mascots/        # Anime mascot SVGs (Mimo, Nova, Pixel)
├── story/              # Project narrative
├── games/              # Built game bundles (zombie, voxel, deadzone, …)
├── styles.css          # Hub design system
├── script.js           # Theme, player, command palette
└── docs/               # Internal change logs & dev notes
```

> **Note:** All hub HTML points at **`/ai-game-lab/showcase/manifest.json`** so install prompts work on GitHub Pages without copying the root `manifest.json` into `_site/`. Root `manifest.json` stays in sync for local tooling. To publish root **`404.html`** / **`favicon.svg`** at the site root, update `.github/workflows/deploy-pages.yml` using [`docs/github-pages-deploy-workflow.yml`](docs/github-pages-deploy-workflow.yml) (web UI or a PAT with **`workflow`** scope). Cursor Simple Browser may not fully match Chrome for service worker behaviour and preview rendering.

Game source for **DeadTakeover** lives in a separate repository: [xrctz/DeadTakeover](https://github.com/xrctz/DeadTakeover). Use `sync-games.sh` to copy fresh builds into `games/zombie/` when developing locally.

## Deploy

Pushes to `main` deploy to GitHub Pages via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

**Live URL:** https://xrctz.github.io/ai-game-lab/

## Related repositories

| Repository | Role |
| --- | --- |
| [xrctz/DeadTakeover](https://github.com/xrctz/DeadTakeover) | Zombie FPS source (Three.js + Vite) |
| [xrctz/ai-game-lab](https://github.com/xrctz/ai-game-lab) | This hub — hosting, player, and branding |

## Documentation

- [Intended GitHub Pages deploy workflow](docs/github-pages-deploy-workflow.yml) (copy into `.github/workflows/deploy-pages.yml` when PAT cannot push workflows)
- [Website revamp notes](docs/WEBSITE_REVAMP_CHANGES.md)
- [Lab expansion v8](docs/WEBSITE_GAME_EXPANSION_V8.md)
- [Systems layer v9](docs/WEBSITE_GAME_EXPANSION_V9.md)
- [Zombie performance notes](docs/ZOMBIE_PERFORMANCE_CHANGES.md)

## License

MIT — see [LICENSE](LICENSE). Third-party game assets may have separate terms; check each game folder and [showcase/previews/README.md](showcase/previews/README.md) for attribution.
