<p align="center">
  <img src="https://xrctz.github.io/ai-game-lab/showcase/previews/deadtakeover.png" alt="AI Game Lab — playable browser games" width="720" />
</p>

<h1 align="center">AI Game Lab</h1>

<p align="center">
  A unified, install-free hub for browser-native games and prototypes — built with AI-assisted development and deployed on GitHub Pages.
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
  <a href="https://xrctz.github.io/ai-game-lab/"><img src="https://img.shields.io/badge/site-live-c8f542?style=for-the-badge&logo=githubpages&logoColor=black" alt="Live on GitHub Pages" /></a>
  <a href="https://github.com/xrctz/ai-game-lab/actions"><img src="https://img.shields.io/badge/deploy-GitHub%20Pages-0a0a0b?style=for-the-badge&logo=github" alt="GitHub Pages deploy" /></a>
  <img src="https://img.shields.io/badge/stack-HTML%20·%20CSS%20·%20JS-a1a1aa?style=for-the-badge" alt="HTML CSS JavaScript" />
  <img src="https://img.shields.io/badge/license-MIT-a1a1aa?style=for-the-badge" alt="MIT license" />
</p>

---

## Overview

**AI Game Lab** is the hosted front door for a growing set of playable projects. Visitors browse featured builds, read release notes, and launch games in an embedded, click-to-play theater — no install required. The interface is the **Library OS** design system: a side-rail storefront with an acid-lime accent, a featured carousel, horizontal shelves, and an ambient backdrop.

## Games

| Game | Route | Genre | Engine |
| --- | --- | --- | --- |
| **DeadTakeover Protocol** | [`/play/?game=zombie`](https://xrctz.github.io/ai-game-lab/play/?game=zombie) | FPS | Three.js |
| **Dead Zone: Evacuation** | [`/play/?game=deadzone`](https://xrctz.github.io/ai-game-lab/play/?game=deadzone) | Squad FPS | Three.js |
| **CraftVerse Engine** | [`/play/?game=voxel`](https://xrctz.github.io/ai-game-lab/play/?game=voxel) | Sandbox | WebGL |
| **VEIL RUSH** | [`/play/?game=racing`](https://xrctz.github.io/ai-game-lab/play/?game=racing) | Racing | Three.js |
| **Midnight Watch** | [`/play/?game=fnaf`](https://xrctz.github.io/ai-game-lab/play/?game=fnaf) | Horror | Three.js |
| **Pokémon Adventure** | [`/play/?game=pokemon`](https://xrctz.github.io/ai-game-lab/play/?game=pokemon) | RPG | Canvas + Three.js |
| **Night of the Dead** | [Setup notes](https://xrctz.github.io/ai-game-lab/nightofthedead-info.html) | FPS (native) | Raylib + .NET + Rust |
| **Mindcraft Control Deck** | [Setup notes](https://xrctz.github.io/ai-game-lab/mindcraft-info.html) | Tool (local) | Java + Node |

> Browser games run embedded in the player. **Night of the Dead** and **Mindcraft** run natively on your machine, so the hub links to setup instructions instead of embedding them.

## Features

- **Library OS** — Side-rail game storefront with featured carousel, horizontal shelves, and ambient FX.
- **Cinematic motion** — Constellation particles, pointer spotlight, scroll progress, magnetic CTAs, and carousel crossfades (respects reduced motion).
- **Embedded player** — Click-to-play overlays, pointer-lock handling, quality modes, and isolated iframes.
- **Mobile ready** — On-screen touch controls for playable games, tuned for phone layouts.
- **Command launcher** — Press `Ctrl+K` to jump to any page or game.
- **Resilient caching** — Service worker keeps the hub fresh (network-first for game HTML) while caching heavy assets.
- **Automated deploy** — Every push to `main` publishes to GitHub Pages.

## Quick start (local)

```bash
git clone https://github.com/xrctz/ai-game-lab.git
cd ai-game-lab
chmod +x serve.sh sync-games.sh   # macOS / Linux
./serve.sh
```

Open **http://127.0.0.1:8080/ai-game-lab/** — the local server mirrors the GitHub Pages base path, and `/` redirects there.

| Variable | Effect |
| --- | --- |
| `SKIP_SYNC=1 ./serve.sh` | Skip rebuilding sibling game folders |
| `NO_OPEN=1 ./serve.sh` | Do not auto-open the browser |
| `PORT=9090 ./serve.sh` | Bind a different port (default `8080`) |

## Repository layout

```text
ai-game-lab/
├── index.html               # Landing page (Library OS)
├── play/                    # Embedded game player / theater
├── showcase/                # Catalog, previews, mascots, PWA manifest, service worker
├── story/                   # Project narrative
├── updates/                 # Release notes
├── games/                   # Built browser game bundles (zombie, deadzone, voxel, racing, fnaf, pokemon, shared)
├── native/                  # Native (non-web) game source — see native/nightofthedead
├── config.js                # Shared paths + build version consumed by every page
├── player-urls.js           # Game URL / metadata registry
├── script.js                # Theme, player, command palette, mobile controls
├── styles.css               # Library OS design system
├── sw.js                    # Service worker (showcase/sw.js is the registered copy)
├── 404.html · favicon.svg · manifest.json
├── docs/                    # Internal change logs & dev notes
└── scripts/                 # Local build / analysis helpers
```

## Native game: Night of the Dead

A native Linux FPS (C# / .NET + Raylib) with a Rust AI hot-loop over FFI. It cannot run in the browser, so its **source lives in [`native/nightofthedead/`](native/nightofthedead/)** and the hub links to [setup notes](https://xrctz.github.io/ai-game-lab/nightofthedead-info.html). Build artifacts are intentionally excluded from the repo — see that folder's README to build and run.

## Deploy

Pushes to `main` build and publish to GitHub Pages via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which assembles the hub shell, root assets, and site sections into the published site.

**Live URL:** https://xrctz.github.io/ai-game-lab/

## Related repositories

| Repository | Role |
| --- | --- |
| [xrctz/ai-game-lab](https://github.com/xrctz/ai-game-lab) | This hub — hosting, player, and branding |
| [xrctz/DeadTakeover](https://github.com/xrctz/DeadTakeover) | DeadTakeover Protocol source (Three.js + Vite) |

Use `sync-games.sh` to copy fresh DeadTakeover builds into `games/zombie/` when developing locally.

## License

MIT — see [LICENSE](LICENSE). Third-party game assets may carry separate terms; check each game folder and [showcase/previews/README.md](showcase/previews/README.md) for attribution.
